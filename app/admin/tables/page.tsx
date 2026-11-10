'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { supabaseClient } from '@/lib/supabase/client';

export default function AdminTablesPage() {
  const [tables, setTables] = useState<any[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadTables() {
      const { data: res } = await supabaseClient.from('restaurants').select('id').limit(1).single();
      if (!res) return;
      setRestaurantId(res.id);

      const { data } = await supabaseClient
        .from('tables')
        .select('*')
        .eq('restaurant_id', res.id)
        .order('table_number', { ascending: true });

      if (data) {
        setTables(data);
        generateAllQRs(data);
      }
    }
    loadTables();
  }, []);

  const generateAllQRs = async (tableList: any[]) => {
    const urls: Record<string, string> = {};
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');

    for (const t of tableList) {
      const orderUrl = `${appUrl}/t/${t.qr_token}`;
      try {
        const dataUrl = await QRCode.toDataURL(orderUrl, { width: 300, margin: 2 });
        urls[t.id] = dataUrl;
      } catch {
        // error
      }
    }
    setQrImages(urls);
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId || !tableNumber) return;

    const { data: newTable } = await supabaseClient
      .from('tables')
      .insert({ restaurant_id: restaurantId, table_number: tableNumber })
      .select()
      .single();

    if (newTable) {
      const updated = [...tables, newTable];
      setTables(updated);
      setTableNumber('');
      generateAllQRs(updated);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-black">🪑 टेबल्स आणि QR कोड स्टँडी</h1>
          <p className="text-xs text-gray-500">टेबल जोडा आणि सर्व QR कोड PDF प्रिंट करा</p>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs shadow cursor-pointer"
        >
          🖨️ सर्व QR PDF प्रिंट करा
        </button>
      </div>

      <form onSubmit={handleAddTable} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-6 flex gap-3 print:hidden">
        <input
          type="text"
          required
          placeholder="नवीन टेबल क्र. (उदा. 1, 2, A3)"
          value={tableNumber}
          onChange={e => setTableNumber(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-orange-500 w-64"
        />
        <button
          type="submit"
          className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow cursor-pointer"
        >
          + टेबल तयार करा
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 print:block">
        {tables.map(table => (
          <div
            key={table.id}
            className="bg-white p-6 rounded-3xl border-2 border-orange-500 text-center shadow-md print:break-after-page print:w-[140mm] print:mx-auto print:my-10 print:border-4"
          >
            <span className="text-xs font-black tracking-widest text-orange-600 uppercase">स्कॅन करा आणि ऑर्डर करा</span>
            <h2 className="text-3xl font-black text-gray-900 my-2">टेबल #{table.table_number}</h2>
            {qrImages[table.id] && (
              <img
                src={qrImages[table.id]}
                alt={`Table ${table.table_number} QR`}
                className="w-52 h-52 mx-auto my-3 rounded-xl border border-gray-100"
              />
            )}
            <p className="text-xs text-gray-500 font-semibold mt-2">कॅमेराने QR स्कॅन करून थेट मेनू पहा</p>
          </div>
        ))}
      </div>
    </div>
  );
}
