'use client';

import React, { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase/client';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayOrdersCount: 0,
    activeTables: 0
  });
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<{ name: string; count: number; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: orders } = await supabaseClient
        .from('orders')
        .select('*, tables(table_number), order_items(*)')
        .gte('created_at', todayStart.toISOString())
        .neq('status', 'rejected')
        .order('created_at', { ascending: false });

      if (orders) {
        setOrdersList(orders);
        const revenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
        const uniqueTables = new Set(orders.map(o => o.table_id)).size;
        setStats({
          todayRevenue: revenue,
          todayOrdersCount: orders.length,
          activeTables: uniqueTables
        });

        const map: Record<string, { count: number; revenue: number }> = {};
        orders.forEach(o => {
          o.order_items?.forEach((it: any) => {
            if (!map[it.item_name]) map[it.item_name] = { count: 0, revenue: 0 };
            map[it.item_name].count += it.quantity;
            map[it.item_name].revenue += Number(it.total_price);
          });
        });

        const sorted = Object.entries(map)
          .map(([name, val]) => ({ name, ...val }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setTopItems(sorted);
      }
      setLoading(false);
    }

    fetchAnalytics();
  }, []);

  // दैनिक एक्सेल / CSV रिपोर्ट डाउनलोड
  const handleExportCSV = () => {
    if (ordersList.length === 0) {
      alert('आज कोणतीही ऑर्डर उपलब्ध नाही.');
      return;
    }

    const headers = ['Order Number', 'Table', 'Time', 'Total Amount', 'Status', 'Items'];
    const rows = ordersList.map(o => {
      const time = new Date(o.created_at).toLocaleTimeString('en-IN');
      const itemsStr = o.order_items?.map((it: any) => `${it.quantity}x ${it.item_name}`).join(' | ');
      return [
        o.order_number,
        `Table ${o.tables?.table_number || ''}`,
        `"${time}"`,
        o.total_amount,
        o.status,
        `"${itemsStr}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daily_Sales_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="font-bold text-gray-500 p-4">डेटा लोड होत आहे...</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black mb-1">📊 आजची विक्री व डॅशबोर्ड</h1>
          <p className="text-xs text-gray-500">दैनंदिन व्यवसाय विश्‍लेषण आणि हिशोब</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow cursor-pointer flex items-center gap-2"
        >
          📥 आजचा एक्सेल (Excel / CSV) रिपोर्ट
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-xs font-bold text-gray-400">आजची एकूण विक्री</span>
          <h2 className="text-2xl font-black text-emerald-600 mt-1">₹{stats.todayRevenue.toFixed(2)}</h2>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-xs font-bold text-gray-400">आजच्या एकूण ऑर्डर्स</span>
          <h2 className="text-2xl font-black text-orange-600 mt-1">{stats.todayOrdersCount}</h2>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-xs font-bold text-gray-400">सक्रिय टेबल्स</span>
          <h2 className="text-2xl font-black text-blue-600 mt-1">{stats.activeTables}</h2>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="font-extrabold text-base mb-4">🔥 सर्वाधिक खपणारे पदार्थ (Top 5)</h2>
        <div className="space-y-3">
          {topItems.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                  {idx + 1}
                </span>
                <span className="font-bold text-sm text-gray-900">{item.name}</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-gray-900">{item.count} प्लेट्स विकल्या</p>
                <p className="text-[11px] text-gray-400">एकूण: ₹{item.revenue}</p>
              </div>
            </div>
          ))}
          {topItems.length === 0 && (
            <p className="text-xs text-gray-400">आज अद्याप कोणतीही विक्री झालेली नाही.</p>
          )}
        </div>
      </div>
    </div>
  );
}
