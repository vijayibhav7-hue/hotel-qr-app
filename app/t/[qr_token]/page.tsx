'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';
import { Language, translations } from '@/lib/translations';
import ServiceCallBar from '@/components/customer/ServiceCallBar';

interface MenuItem {
  id: string;
  name_mr: string;
  name_hi: string;
  name_en: string;
  description_mr: string;
  description_hi: string;
  description_en: string;
  price: number;
  is_veg: boolean;
  image_url?: string;
  category_id: string;
}

interface Category {
  id: string;
  name_mr: string;
  name_hi: string;
  name_en: string;
}

function CustomerOrderContent() {
  const params = useParams();
  const qrToken = params?.qr_token as string;

  const [lang, setLang] = useState<Language>('mr');
  const t = translations[lang];

  const [table, setTable] = useState<{ id: string; table_number: string; restaurant_id: string; restaurants?: any } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // फिल्टर्स
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dietFilter, setDietFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // कार्ट स्टेट { menuItemId: qty }
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // कूपन / डिस्काउंट
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percent?: number; flat?: number } | null>(null);
  const [couponMessage, setCouponMessage] = useState('');

  // लाइव्ह ऑर्डर ट्रॅकिंग
  const [latestOrderId, setLatestOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [orderTotalAmount, setOrderTotalAmount] = useState<number>(0);

  // टेबल व मेनू डेटा लोड करणे
  useEffect(() => {
    async function loadInitialData() {
      if (!qrToken) return;

      const { data: tableData } = await supabaseClient
        .from('tables')
        .select('id, table_number, restaurant_id, restaurants(name, upi_id)')
        .eq('qr_token', qrToken)
        .eq('is_active', true)
        .maybeSingle();

      if (!tableData) {
        setLoading(false);
        return;
      }
      setTable(tableData);

      const [catRes, menuRes] = await Promise.all([
        supabaseClient
          .from('categories')
          .select('id, name_mr, name_hi, name_en')
          .eq('restaurant_id', tableData.restaurant_id)
          .order('sort_order', { ascending: true }),
        supabaseClient
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', tableData.restaurant_id)
          .eq('is_available', true)
      ]);

      if (catRes.data) setCategories(catRes.data);
      if (menuRes.data) setMenuItems(menuRes.data);
      setLoading(false);
    }

    loadInitialData();
  }, [qrToken]);

  // रियल-टाइम ऑर्डर स्टेटस लिसनर
  useEffect(() => {
    if (!latestOrderId) return;

    const channel = supabaseClient
      .channel(`order-track-${latestOrderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${latestOrderId}` },
        payload => {
          const updated = payload.new as any;
          setOrderStatus(updated.status);
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [latestOrderId]);

  // मेनू फिल्टरिंग
  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      if (selectedCategory !== 'all' && item.category_id !== selectedCategory) return false;
      if (dietFilter === 'veg' && !item.is_veg) return false;
      if (dietFilter === 'non-veg' && item.is_veg) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName =
          (item.name_mr || '').toLowerCase().includes(query) ||
          (item.name_hi || '').toLowerCase().includes(query) ||
          (item.name_en || '').toLowerCase().includes(query);
        return matchName;
      }
      return true;
    });
  }, [menuItems, selectedCategory, dietFilter, searchQuery]);

  // कार्ट व्यवस्थापन
  const updateQty = (id: string, delta: number) => {
    setCart(prev => {
      const current = prev[id] || 0;
      const updated = current + delta;
      if (updated <= 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: updated };
    });
  };

  const rawSubtotal = useMemo(() => {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const item = menuItems.find(m => m.id === id);
      return sum + (item ? Number(item.price) * qty : 0);
    }, 0);
  }, [cart, menuItems]);

  const discountAmount = useMemo(() => {
    if (!appliedDiscount || rawSubtotal === 0) return 0;
    if (appliedDiscount.percent) {
      return Number(((rawSubtotal * appliedDiscount.percent) / 100).toFixed(2));
    }
    if (appliedDiscount.flat) {
      return Math.min(rawSubtotal, appliedDiscount.flat);
    }
    return 0;
  }, [appliedDiscount, rawSubtotal]);

  const finalTotal = Math.max(0, rawSubtotal - discountAmount);

  const totalCartCount = useMemo(() => {
    return Object.values(cart).reduce((a, b) => a + b, 0);
  }, [cart]);

  // कूपन कोड लागू करणे
  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (code === 'WELCOME10') {
      setAppliedDiscount({ code: 'WELCOME10', percent: 10 });
      setCouponMessage('✅ १०% सूट लागू झाली!');
    } else if (code === 'FLAT50') {
      if (rawSubtotal >= 200) {
        setAppliedDiscount({ code: 'FLAT50', flat: 50 });
        setCouponMessage('✅ ₹५० ची विशेष सूट लागू झाली!');
      } else {
        setCouponMessage('❌ FLAT50 साठी किमान ₹२०० ची ऑर्डर हवी.');
      }
    } else {
      setCouponMessage('❌ अमान्य कूपन कोड (WELCOME10 किंवा FLAT50 वापरा)');
    }
  };

  // ऑर्डर पाठवणे
  const handlePlaceOrder = async () => {
    if (totalCartCount === 0 || submittingOrder) return;
    setSubmittingOrder(true);

    try {
      const payloadItems = Object.entries(cart).map(([menuItemId, quantity]) => ({
        menuItemId,
        quantity
      }));

      const res = await fetch('/api/order/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrToken,
          items: payloadItems,
          notes: orderNotes
        })
      });

      const data = await res.json();
      if (res.ok) {
        setLatestOrderId(data.orderId);
        setOrderTotalAmount(data.totalAmount);
        setOrderStatus('new');
        setCart({});
        setIsCartOpen(false);
        setOrderNotes('');
        setAppliedDiscount(null);
      } else {
        alert(data.error || 'ऑर्डर पाठवण्यात अडचण आली.');
      }
    } catch {
      alert('नेटवर्क त्रुटी! कृपया पुन्हा प्रयत्न करा.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-orange-50/50">
        <div className="text-center font-bold text-orange-600 animate-pulse text-lg">
          हॉटेल मेनू लोड होत आहे...
        </div>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-6 rounded-3xl shadow-xl max-w-sm border border-red-200">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-lg font-black text-red-600 mb-2">टेबल डेटा सापडला नाही</h2>
          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
            जर तुम्ही Supabase मध्ये <strong>`01_initial_schema.sql`</strong> ही स्क्रिप्ट अजून चालवली नसेल, तर कृपया Supabase SQL Editor मध्ये जाऊन ती स्क्रिप्ट Run करा.
          </p>
          <a
            href="/"
            className="inline-block bg-orange-600 text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow"
          >
            ← मुख्य पानावर जा
          </a>
        </div>
      </div>
    );
  }

  // थेट UPI Pay Link (GPay, PhonePe, Paytm)
  const upiId = table.restaurants?.upi_id || 'hotel@upi';
  const upiPayUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(table.restaurants?.name || 'Hotel')}&am=${orderTotalAmount}&tn=Table_${table.table_number}&cu=INR`;

  return (
    <div className="min-h-screen bg-gray-50 pb-28 text-gray-800">
      {/* हेडर */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-bold">
              {t.table} {table.table_number}
            </span>
          </div>

          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg text-xs font-semibold">
            {(['mr', 'hi', 'en'] as Language[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2.5 py-1 rounded-md transition ${
                  lang === l ? 'bg-orange-600 text-white shadow-sm' : 'text-gray-600'
                }`}
              >
                {l === 'mr' ? 'मराठी' : l === 'hi' ? 'हिंदी' : 'EN'}
              </button>
            ))}
          </div>
        </div>

        {/* शोध बार */}
        <div className="mt-3 max-w-lg mx-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full bg-gray-100 border-none rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
          />
        </div>

        {/* व्हेज / नॉन-व्हेज टॉगल */}
        <div className="flex gap-2 mt-2.5 max-w-lg mx-auto overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setDietFilter('all')}
            className={`px-3 py-1.5 rounded-full border ${
              dietFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-white border-gray-200'
            }`}
          >
            {t.allCategories}
          </button>
          <button
            onClick={() => setDietFilter('veg')}
            className={`px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${
              dietFilter === 'veg' ? 'bg-emerald-600 text-white' : 'bg-white border-gray-200 text-emerald-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {t.vegOnly}
          </button>
          <button
            onClick={() => setDietFilter('non-veg')}
            className={`px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${
              dietFilter === 'non-veg' ? 'bg-red-600 text-white' : 'bg-white border-gray-200 text-red-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            {t.nonVegOnly}
          </button>
        </div>
      </header>

      {/* लाइव्ह ऑर्डर बॅनर + थेट UPI पे बटण */}
      {orderStatus && (
        <div className="bg-amber-500 text-white px-4 py-3 text-center text-sm font-semibold shadow-inner">
          <p>
            {t.orderStatus}:{' '}
            {orderStatus === 'new' && t.statusNew}
            {orderStatus === 'accepted' && t.statusAccepted}
            {orderStatus === 'preparing' && t.statusPreparing}
            {orderStatus === 'ready' && t.statusReady}
            {orderStatus === 'served' && t.statusServed}
          </p>

          {orderTotalAmount > 0 && (
            <a
              href={upiPayUrl}
              className="mt-2 inline-flex items-center gap-2 bg-white text-gray-900 font-extrabold text-xs px-4 py-1.5 rounded-xl shadow-md hover:bg-gray-100 transition active:scale-95"
            >
              <span>💳 GPay / PhonePe द्वारे ₹{orderTotalAmount} भरा</span>
            </a>
          )}
        </div>
      )}

      {/* श्रेणी स्क्रोल बार */}
      <div className="flex gap-2 px-4 py-2.5 overflow-x-auto bg-white border-b border-gray-100 max-w-lg mx-auto no-scrollbar">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`whitespace-nowrap px-3.5 py-1.5 text-xs font-bold rounded-lg ${
            selectedCategory === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {t.allCategories}
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`whitespace-nowrap px-3.5 py-1.5 text-xs font-bold rounded-lg ${
              selectedCategory === cat.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {lang === 'mr' ? cat.name_mr : lang === 'hi' ? cat.name_hi : cat.name_en}
          </button>
        ))}
      </div>

      {/* मेनू लिस्ट */}
      <main className="px-4 py-4 max-w-lg mx-auto space-y-3">
        {filteredItems.map(item => {
          const qty = cart[item.id] || 0;
          const itemName = lang === 'mr' ? item.name_mr : lang === 'hi' ? item.name_hi : item.name_en;
          const itemDesc =
            lang === 'mr' ? item.description_mr : lang === 'hi' ? item.description_hi : item.description_en;

          return (
            <div
              key={item.id}
              className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm"
            >
              <div className="flex-1 pr-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${
                      item.is_veg ? 'bg-emerald-600' : 'bg-red-600'
                    }`}
                  />
                  <h3 className="font-bold text-gray-900 text-sm leading-tight">{itemName}</h3>
                </div>
                {itemDesc && <p className="text-xs text-gray-400 line-clamp-1 mb-1">{itemDesc}</p>}
                <span className="font-extrabold text-gray-900 text-sm">
                  {t.currency}
                  {item.price}
                </span>
              </div>

              <div className="flex flex-col items-center gap-2">
                {item.image_url && (
                  <img src={item.image_url} alt={itemName} className="w-16 h-16 rounded-xl object-cover" />
                )}
                {qty === 0 ? (
                  <button
                    onClick={() => updateQty(item.id, 1)}
                    className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-1.5 rounded-xl active:scale-95 shadow-sm cursor-pointer"
                  >
                    + {t.addToCart}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-orange-100 px-2 py-1 rounded-xl">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="text-orange-700 font-bold px-1.5 text-sm cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-xs font-extrabold text-orange-900">{qty}</span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="text-orange-700 font-bold px-1.5 text-sm cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </main>

      {/* फ्लोटिंग कार्ट बटण */}
      {totalCartCount > 0 && !isCartOpen && (
        <div className="fixed bottom-16 left-4 right-4 z-40 max-w-lg mx-auto">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-5 rounded-2xl flex items-center justify-between shadow-xl active:scale-98 transition cursor-pointer"
          >
            <div className="flex items-center gap-2 text-sm">
              <span className="bg-emerald-800 px-2 py-0.5 rounded-lg text-xs">{totalCartCount}</span>
              <span>{t.cartTitle}</span>
            </div>
            <span className="text-base font-extrabold">
              {t.currency}
              {finalTotal} →
            </span>
          </button>
        </div>
      )}

      {/* कार्ट मोडल */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end flex-col">
          <div className="bg-white rounded-t-3xl p-5 max-w-lg w-full mx-auto max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b">
              <h2 className="font-extrabold text-base text-gray-900">
                {t.cartTitle} ({totalCartCount})
              </h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-gray-400 font-bold text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto py-3 space-y-3 flex-1">
              {Object.entries(cart).map(([id, qty]) => {
                const item = menuItems.find(m => m.id === id);
                if (!item) return null;
                const name = lang === 'mr' ? item.name_mr : lang === 'hi' ? item.name_hi : item.name_en;

                return (
                  <div key={id} className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-gray-800">{name}</p>
                      <p className="text-xs text-gray-400">
                        {t.currency}
                        {item.price} × {qty} = {t.currency}
                        {Number(item.price) * qty}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-100 px-2.5 py-1 rounded-xl">
                      <button onClick={() => updateQty(id, -1)} className="font-bold text-gray-600 px-1 cursor-pointer">
                        -
                      </button>
                      <span className="text-xs font-bold">{qty}</span>
                      <button onClick={() => updateQty(id, 1)} className="font-bold text-gray-600 px-1 cursor-pointer">
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* कूपन कोड विभाग */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="कूपन कोड (उदा. WELCOME10, FLAT50)"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value)}
                  className="bg-gray-100 border-none rounded-xl px-3 py-2 text-xs flex-1 uppercase font-bold outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="bg-gray-800 hover:bg-black text-white text-xs font-bold px-3 py-2 rounded-xl cursor-pointer"
                >
                  Apply
                </button>
              </div>
              {couponMessage && (
                <p className="text-[11px] font-semibold mt-1 text-orange-600">{couponMessage}</p>
              )}
            </div>

            {/* विशेष सूचना नोट */}
            <div className="py-2">
              <input
                type="text"
                value={orderNotes}
                onChange={e => setOrderNotes(e.target.value)}
                placeholder={t.notesPlaceholder}
                className="w-full bg-gray-100 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
              />
            </div>

            {/* एकूण व हिशोब */}
            <div className="pt-3 border-t">
              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-xs text-emerald-600 font-bold mb-1">
                  <span>सूट ({appliedDiscount?.code}):</span>
                  <span>- ₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-500 text-sm font-semibold">{t.total}</span>
                <span className="text-lg font-black text-gray-900">
                  {t.currency}
                  {finalTotal.toFixed(2)}
                </span>
              </div>
              <button
                onClick={handlePlaceOrder}
                disabled={submittingOrder}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold py-3.5 rounded-2xl shadow-lg active:scale-98 transition disabled:opacity-50 cursor-pointer"
              >
                {submittingOrder ? 'ऑर्डर पाठवत आहे...' : t.placeOrder}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* कायम दिसणारी सेवा बटणे */}
      <ServiceCallBar qrToken={qrToken} tableId={table.id} lang={lang} />
    </div>
  );
}

export default function CustomerOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-orange-50/50">
          <div className="text-center font-bold text-orange-600 animate-pulse text-lg">
            हॉटेल मेनू लोड होत आहे...
          </div>
        </div>
      }
    >
      <CustomerOrderContent />
    </Suspense>
  );
}
