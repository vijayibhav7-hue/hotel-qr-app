'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseClient } from '@/lib/supabase/client';
import { playBellSound, playUrgentAlertSound } from '@/lib/utils/audio';

interface OrderItem {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  notes?: string;
}

interface Order {
  id: string;
  order_number: number;
  table_id: string;
  status: 'new' | 'accepted' | 'preparing' | 'ready' | 'served' | 'rejected';
  total_amount: number;
  customer_notes?: string;
  created_at: string;
  tables?: { table_number: string };
  order_items: OrderItem[];
}

interface ServiceCall {
  id: string;
  table_id: string;
  type: 'waiter' | 'water' | 'bill';
  status: 'pending' | 'acknowledged' | 'completed';
  requested_at: string;
  tables?: { table_number: string };
}

const DEFAULT_STAFF_PIN = '1234';

export default function StaffDashboardPage() {
  const router = useRouter();
  const [isStaffAuth, setIsStaffAuth] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // कर्मचाऱ्याचे नाव (ऑर्डर स्वीकारताना नोंदवण्यासाठी)
  const [staffName, setStaffName] = useState('कॅशियर');

  const [activeTab, setActiveTab] = useState<'orders' | 'kitchen'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [serviceCalls, setServiceCalls] = useState<ServiceCall[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('hotel_staff_auth');
    if (saved === 'true') {
      setIsStaffAuth(true);
    }
    const savedStaffName = localStorage.getItem('hotel_staff_current_name');
    if (savedStaffName) setStaffName(savedStaffName);
  }, []);

  useEffect(() => {
    async function initStaff() {
      const { data: res } = await supabaseClient.from('restaurants').select('id').limit(1).single();
      if (res) {
        setRestaurantId(res.id);
        await Promise.all([
          loadOrders(res.id),
          loadServiceCalls(res.id)
        ]);
      }
      setLoading(false);
    }

    if (isStaffAuth) {
      initStaff();
    } else {
      setLoading(false);
    }
  }, [isStaffAuth]);

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const storedPin = localStorage.getItem('hotel_staff_custom_pin') || DEFAULT_STAFF_PIN;
    if (pinInput === storedPin) {
      setIsStaffAuth(true);
      localStorage.setItem('hotel_staff_auth', 'true');
      setPinError('');
    } else {
      setPinError('❌ चुकीचा स्टाफ पिन! (डिफॉल्ट पिन 1234 आहे)');
      setPinInput('');
    }
  };

  const handleStaffLogout = () => {
    localStorage.removeItem('hotel_staff_auth');
    setIsStaffAuth(false);
  };

  const loadOrders = async (rId: string) => {
    const { data } = await supabaseClient
      .from('orders')
      .select('*, tables(table_number), order_items(*)')
      .eq('restaurant_id', rId)
      .neq('status', 'served')
      .neq('status', 'rejected')
      .order('created_at', { ascending: false });

    if (data) setOrders(data as any);
  };

  const loadServiceCalls = async (rId: string) => {
    const { data } = await supabaseClient
      .from('service_calls')
      .select('*, tables(table_number)')
      .eq('restaurant_id', rId)
      .neq('status', 'completed')
      .order('requested_at', { ascending: true });

    if (data) setServiceCalls(data as any);
  };

  useEffect(() => {
    if (!restaurantId || !isStaffAuth) return;

    const orderChannel = supabaseClient
      .channel('staff-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        payload => {
          if (payload.eventType === 'INSERT') {
            playBellSound();
          }
          loadOrders(restaurantId);
        }
      )
      .subscribe();

    const callChannel = supabaseClient
      .channel('staff-calls')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_calls', filter: `restaurant_id=eq.${restaurantId}` },
        payload => {
          if (payload.eventType === 'INSERT') {
            playUrgentAlertSound();
          }
          loadServiceCalls(restaurantId);
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(orderChannel);
      supabaseClient.removeChannel(callChannel);
    };
  }, [restaurantId, isStaffAuth]);

  // स्टेटस अपडेट (कर्मचाऱ्याच्या नावासह)
  const updateStatus = async (orderId: string, newStatus: string) => {
    await fetch('/api/staff/orders/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        newStatus,
        staffName: `${staffName} (${new Date().toLocaleTimeString('mr-IN', { hour: '2-digit', minute: '2-digit' })})`
      })
    });
    if (restaurantId) loadOrders(restaurantId);
  };

  const resolveCall = async (callId: string) => {
    await fetch('/api/service-call/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId })
    });
    if (restaurantId) loadServiceCalls(restaurantId);
  };

  const formatTimeAgo = (isoString: string) => {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return `${diff}s आधी`;
    const mins = Math.floor(diff / 60);
    return `${mins} मि. आधी`;
  };

  // स्टाफ लॉक स्क्रीन
  if (!isStaffAuth) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-4 shadow-lg text-white">
            ⚡
          </div>
          <h1 className="text-xl font-black text-white">स्टाफ पोर्टल लॉक आहे</h1>
          <p className="text-xs text-gray-400 mt-1 mb-6">ऑर्डर्स व किचन पाहण्यासाठी स्टाफ पिन टाका</p>

          <form onSubmit={handleStaffLogin} className="space-y-4">
            <input
              type="password"
              maxLength={4}
              autoFocus
              placeholder="पिन टाका (उदा. 1234)"
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              className="w-full text-center tracking-widest text-2xl font-black bg-gray-800 border border-gray-700 rounded-2xl py-3 text-white outline-none focus:border-blue-500"
            />

            {pinError && <p className="text-xs text-red-400 font-semibold">{pinError}</p>}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3.5 rounded-2xl transition active:scale-95 shadow cursor-pointer text-sm"
            >
              लॉगिन करा 🔓
            </button>
          </form>

          <p className="text-[11px] text-gray-500 mt-6">
            डिफॉल्ट स्टाफ पिन: <span className="text-blue-400 font-bold">1234</span>
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen bg-gray-950 text-white flex items-center justify-center font-bold">
        स्टाफ डॅशबोर्ड लोड होत आहे...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* हेडर */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <div>
            <h1 className="font-black text-lg">स्टाफ लाइव्ह स्क्रीन</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-gray-400">लॉगिन कर्मचारी:</span>
              <select
                value={staffName}
                onChange={e => {
                  setStaffName(e.target.value);
                  localStorage.setItem('hotel_staff_current_name', e.target.value);
                }}
                className="bg-gray-800 text-orange-400 text-xs font-bold px-2 py-0.5 rounded border border-gray-700 outline-none"
              >
                <option value="कॅशियर">कॅशियर</option>
                <option value="वेटर १">वेटर १</option>
                <option value="वेटर २">वेटर २</option>
                <option value="शेफ/किचन">शेफ/किचन</option>
                <option value="मॅनेजर">मॅनेजर</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-2 bg-gray-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-lg transition cursor-pointer ${
                activeTab === 'orders' ? 'bg-orange-600 text-white' : 'text-gray-400'
              }`}
            >
              ऑर्डर्स ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('kitchen')}
              className={`px-4 py-2 rounded-lg transition cursor-pointer ${
                activeTab === 'kitchen' ? 'bg-orange-600 text-white' : 'text-gray-400'
              }`}
            >
              किचन व्ह्यू (KDS)
            </button>
          </div>

          <Link
            href="/admin"
            className="text-xs bg-gray-800 hover:bg-gray-700 px-3.5 py-2 rounded-xl text-gray-300 font-semibold"
          >
            👑 ॲडमिन
          </Link>

          <button
            onClick={handleStaffLogout}
            className="text-xs bg-red-950/60 hover:bg-red-900 text-red-300 px-3 py-2 rounded-xl font-bold cursor-pointer"
          >
            🔒 लॉक
          </button>
        </div>
      </header>

      {/* वेटर कॉल्स पॅनेल */}
      {serviceCalls.length > 0 && (
        <section className="bg-red-950/40 border-b border-red-800/60 p-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-xs font-bold text-red-400 tracking-wider uppercase mb-2 flex items-center gap-2">
              <span className="animate-ping w-2 h-2 rounded-full bg-red-500"></span>
              तत्काळ सेवा विनंत्या ({serviceCalls.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {serviceCalls.map(call => (
                <div
                  key={call.id}
                  className="bg-red-900/80 border-2 border-red-500 rounded-2xl p-3.5 shadow-lg flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs bg-red-950 text-red-200 px-2 py-0.5 rounded-md font-black">
                      टेबल {call.tables?.table_number || 'N/A'}
                    </span>
                    <h3 className="text-sm font-extrabold mt-1 text-white">
                      {call.type === 'waiter' && '🙋 वेटरला बोलावले'}
                      {call.type === 'water' && '💧 पाणी हवे'}
                      {call.type === 'bill' && '🧾 बिल हवे'}
                    </h3>
                    <p className="text-[11px] text-red-300 mt-0.5">{formatTimeAgo(call.requested_at)}</p>
                  </div>
                  <button
                    onClick={() => resolveCall(call.id)}
                    className="bg-white hover:bg-gray-100 text-red-900 font-black text-xs px-3.5 py-2 rounded-xl active:scale-95 transition shadow cursor-pointer"
                  >
                    झाले ✓
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* मुख्य ऑर्डर्स */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'orders' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map(order => (
              <div
                key={order.id}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col justify-between shadow-lg"
              >
                <div>
                  <div className="flex justify-between items-start border-b border-gray-800 pb-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-orange-950 text-orange-400 text-xs font-black px-2.5 py-1 rounded-lg">
                          टेबल {order.tables?.table_number}
                        </span>
                        <Link
                          href={`/staff/kot/${order.id}`}
                          target="_blank"
                          className="text-[11px] bg-orange-600/30 text-orange-300 px-2 py-0.5 rounded-md hover:bg-orange-600/50"
                        >
                          🍳 KOT
                        </Link>
                        <Link
                          href={`/staff/print/${order.table_id}`}
                          target="_blank"
                          className="text-[11px] bg-emerald-600/30 text-emerald-300 px-2 py-0.5 rounded-md hover:bg-emerald-600/50"
                        >
                          🖨️ बिल
                        </Link>
                      </div>
                      <h3 className="font-extrabold text-base mt-1.5">ऑर्डर #{order.order_number}</h3>
                    </div>

                    {/* स्टेटस बॅज */}
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        order.status === 'new'
                          ? 'bg-amber-900/80 text-amber-300 border border-amber-600 animate-pulse'
                          : order.status === 'accepted'
                          ? 'bg-emerald-900 text-emerald-300 border border-emerald-500'
                          : order.status === 'preparing'
                          ? 'bg-purple-900 text-purple-300'
                          : 'bg-blue-900 text-blue-300'
                      }`}
                    >
                      {order.status === 'new' && '⏳ PENDING (पडताळणी)'}
                      {order.status === 'accepted' && '🟢 CONFIRMED ✓'}
                      {order.status === 'preparing' && '🍳 PREPARING'}
                      {order.status === 'ready' && '🍽️ READY'}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {order.order_items?.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="font-medium text-gray-200">
                          {item.quantity} × {item.item_name}
                        </span>
                        <span className="text-gray-400">₹{item.unit_price * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {order.customer_notes && (
                    <div className="bg-gray-800/80 p-2.5 rounded-xl text-xs text-amber-300 mb-4">
                      <strong>नोंद / स्वीकारकर्ता:</strong> {order.customer_notes}
                    </div>
                  )}
                </div>

                {/* डबल कन्फर्मेशन बटणे */}
                <div className="pt-3 border-t border-gray-800">
                  <div className="flex justify-between text-xs text-gray-400 mb-3">
                    <span>एकूण: ₹{order.total_amount}</span>
                    <span>{formatTimeAgo(order.created_at)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* १. काउंटर कन्फर्मेशन बटण */}
                    {order.status === 'new' && (
                      <>
                        <button
                          onClick={() => updateStatus(order.id, 'accepted')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 rounded-xl text-xs cursor-pointer shadow flex items-center justify-center gap-1"
                        >
                          <span>✓ काउंटर कन्फर्म</span>
                        </button>
                        <button
                          onClick={() => updateStatus(order.id, 'rejected')}
                          className="bg-gray-800 hover:bg-red-900 text-red-400 font-bold py-2.5 rounded-xl text-xs cursor-pointer"
                        >
                          ✕ Reject
                        </button>
                      </>
                    )}

                    {/* २. शेफ / किचन कन्फर्मेशन बटण */}
                    {order.status === 'accepted' && (
                      <button
                        onClick={() => updateStatus(order.id, 'preparing')}
                        className="col-span-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>🍳 शेफने सुरुवात केली (Start Preparing)</span>
                      </button>
                    )}

                    {/* ३. ऑर्डर तयार झाली */}
                    {order.status === 'preparing' && (
                      <button
                        onClick={() => updateStatus(order.id, 'ready')}
                        className="col-span-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer"
                      >
                        🍽️ Mark Ready (तयार झाली)
                      </button>
                    )}

                    {/* ४. टेबलवर दिली */}
                    {order.status === 'ready' && (
                      <button
                        onClick={() => updateStatus(order.id, 'served')}
                        className="col-span-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer"
                      >
                        ✅ Mark Served (टेबलवर दिली)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {orders.length === 0 && (
              <div className="col-span-full py-16 text-center text-gray-500">
                कोणतीही चालू ऑर्डर नाही. नवीन ऑर्डर येताच येथे दिसेल.
              </div>
            )}
          </div>
        )}

        {/* किचन व्ह्यू */}
        {activeTab === 'kitchen' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {orders.map(order => (
              <div key={order.id} className="bg-gray-900 border-2 border-orange-500/50 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-800">
                  <span className="text-base font-black text-orange-400">
                    टेबल {order.tables?.table_number}
                  </span>
                  <Link
                    href={`/staff/kot/${order.id}`}
                    target="_blank"
                    className="text-xs bg-orange-600 text-white px-2 py-0.5 rounded"
                  >
                    KOT 🖨️
                  </Link>
                </div>

                {/* काउंटरने कन्फर्म केले आहे का? */}
                <div className="mb-3">
                  {order.status === 'new' ? (
                    <span className="text-[11px] bg-amber-950 text-amber-400 border border-amber-600 px-2 py-0.5 rounded block text-center font-bold">
                      ⏳ काउंटरची मान्यता बाकी (Pending)
                    </span>
                  ) : (
                    <span className="text-[11px] bg-emerald-950 text-emerald-400 border border-emerald-600 px-2 py-0.5 rounded block text-center font-bold">
                      🟢 काउंटरने कन्फर्म केले! तयार करा 🍳
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {order.order_items?.map(item => (
                    <div key={item.id} className="flex items-center justify-between">
                      <span className="text-base font-bold text-white">{item.item_name}</span>
                      <span className="text-lg font-black bg-orange-600 text-white px-3 py-0.5 rounded-lg">
                        {item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                {order.customer_notes && (
                  <p className="mt-3 text-xs text-amber-300 bg-gray-800 p-2 rounded-lg">
                    {order.customer_notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
