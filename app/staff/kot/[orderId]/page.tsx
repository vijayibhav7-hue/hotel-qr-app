'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';

function KOTPrintContent() {
  const params = useParams();
  const orderId = params?.orderId as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadKOT() {
      if (!orderId) return;

      const { data } = await supabaseClient
        .from('orders')
        .select('*, tables(table_number), order_items(*)')
        .eq('id', orderId)
        .single();

      if (data) setOrder(data);
      setLoading(false);
    }

    loadKOT();
  }, [orderId]);

  if (loading || !order) return <div className="p-4">KOT लोड होत आहे...</div>;

  return (
    <div className="bg-gray-100 min-h-screen py-6 flex flex-col items-center">
      <div className="mb-4 print:hidden flex gap-3">
        <button
          onClick={() => window.print()}
          className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 px-6 rounded-xl shadow cursor-pointer text-sm"
        >
          🖨️ KOT प्रिंट करा (Kitchen Order Ticket)
        </button>
      </div>

      <div className="w-[80mm] bg-white p-4 shadow-lg text-black font-mono text-[13px] leading-tight print:shadow-none print:w-[80mm] print:p-0">
        <div className="text-center mb-2">
          <h1 className="font-black text-lg tracking-wider border-b-2 border-black pb-1 uppercase">
            *** KITCHEN ORDER TICKET (KOT) ***
          </h1>
          <div className="flex justify-between text-base font-black my-2">
            <span>टेबल: {order.tables?.table_number || 'N/A'}</span>
            <span>KOT #{order.order_number}</span>
          </div>
          <div className="flex justify-between text-[11px] text-gray-700">
            <span>वेळ: {new Date(order.created_at).toLocaleTimeString('mr-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            <span>तारीख: {new Date(order.created_at).toLocaleDateString('mr-IN')}</span>
          </div>
          <div className="border-b-2 border-black my-2"></div>
        </div>

        <table className="w-full text-left my-2 text-sm">
          <thead>
            <tr className="border-b border-black text-xs font-bold">
              <th className="py-1">पदार्थ</th>
              <th className="text-right py-1">संख्या (Qty)</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items?.map((item: any) => (
              <tr key={item.id} className="border-b border-dashed border-gray-300">
                <td className="py-1.5 font-bold">{item.item_name}</td>
                <td className="text-right font-black text-base py-1.5">{item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {order.customer_notes && (
          <div className="my-3 p-2 border-2 border-black rounded text-xs font-bold bg-gray-50">
            ⚠️ शेफसाठी विशेष सूचना: {order.customer_notes}
          </div>
        )}

        <div className="text-center mt-3 pt-2 border-t-2 border-black text-xs font-bold">
          [ किचन प्रत / Kitchen Copy ]
        </div>
      </div>
    </div>
  );
}

export default function KOTPrintPage() {
  return (
    <Suspense fallback={<div className="p-4">KOT लोड होत आहे...</div>}>
      <KOTPrintContent />
    </Suspense>
  );
}
