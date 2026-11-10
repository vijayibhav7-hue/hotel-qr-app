'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';
import { supabaseClient } from '@/lib/supabase/client';

function ThermalBillPrintContent() {
  const params = useParams();
  const tableId = params?.tableId as string;

  const [table, setTable] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [upiQrUrl, setUpiQrUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBillData() {
      if (!tableId) return;

      const { data: tableData } = await supabaseClient
        .from('tables')
        .select('*, restaurants(*)')
        .eq('id', tableId)
        .single();

      if (tableData) {
        setTable(tableData);
        setRestaurant(tableData.restaurants);

        const { data: orderData } = await supabaseClient
          .from('orders')
          .select('*, order_items(*)')
          .eq('table_id', tableId)
          .neq('status', 'rejected');

        if (orderData) setOrders(orderData);
      }
      setLoading(false);
    }

    loadBillData();
  }, [tableId]);

  const consolidatedItems: Record<string, { name: string; qty: number; unitPrice: number; total: number }> = {};
  let subtotal = 0;

  orders.forEach(order => {
    order.order_items?.forEach((item: any) => {
      if (!consolidatedItems[item.menu_item_id]) {
        consolidatedItems[item.menu_item_id] = {
          name: item.item_name,
          qty: 0,
          unitPrice: Number(item.unit_price),
          total: 0
        };
      }
      consolidatedItems[item.menu_item_id].qty += item.quantity;
      consolidatedItems[item.menu_item_id].total += Number(item.total_price);
      subtotal += Number(item.total_price);
    });
  });

  const tax = Number((subtotal * 0.05).toFixed(2));
  const grandTotal = Number((subtotal + tax).toFixed(2));

  // Dynamic UPI QR कोड जनरेट करा
  useEffect(() => {
    if (restaurant && grandTotal > 0 && table) {
      const upiId = restaurant.upi_id || 'hotel@upi';
      const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(restaurant.name || 'Hotel')}&am=${grandTotal}&tn=Table_${table.table_number}_Bill&cu=INR`;
      QRCode.toDataURL(upiString, { width: 180, margin: 1 })
        .then(url => setUpiQrUrl(url))
        .catch(() => {});
    }
  }, [restaurant, grandTotal, table]);

  // WhatsApp द्वारे बिल पाठवणे
  const handleSendWhatsApp = () => {
    const phone = prompt('ग्राहकाचा १० अंकी WhatsApp नंबर टाका: (उदा. 9876543210)');
    if (!phone) return;

    let itemsText = Object.values(consolidatedItems)
      .map(it => `• ${it.name} x ${it.qty} = ₹${it.total}`)
      .join('%0A');

    const msg = `*${restaurant?.name || 'हॉटेल'}*%0A` +
      `टेबल क्र.: ${table.table_number}%0A` +
      `तारीख: ${new Date().toLocaleDateString('mr-IN')}%0A` +
      `------------------------%0A` +
      `${itemsText}%0A` +
      `------------------------%0A` +
      `उप-एकूण: ₹${subtotal.toFixed(2)}%0A` +
      `GST (5%): ₹${tax.toFixed(2)}%0A` +
      `*एकूण देय रक्कम: ₹${grandTotal.toFixed(2)}*%0A` +
      `------------------------%0A` +
      `भेट दिल्याबद्दल धन्यवाद! 🙏`;

    window.open(`https://wa.me/91${phone.replace(/[^0-9]/g, '')}?text=${msg}`, '_blank');
  };

  if (loading || !table) return <div className="p-4">बिल डेटा लोड होत आहे...</div>;

  return (
    <div className="bg-gray-100 min-h-screen py-6 flex flex-col items-center">
      <div className="mb-4 print:hidden flex flex-wrap gap-3">
        <button
          onClick={() => window.print()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl shadow cursor-pointer text-sm"
        >
          🖨️ 80mm बिल प्रिंट करा
        </button>

        <button
          onClick={handleSendWhatsApp}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-xl shadow cursor-pointer text-sm flex items-center gap-1.5"
        >
          📲 WhatsApp वर पाठवा
        </button>
      </div>

      <div className="w-[80mm] bg-white p-4 shadow-lg text-black font-mono text-[12px] leading-tight print:shadow-none print:w-[80mm] print:p-0">
        <div className="text-center mb-3">
          <h1 className="font-extrabold text-base tracking-wider uppercase">{restaurant?.name || 'हॉटेल'}</h1>
          <p className="text-[10px] text-gray-600">{restaurant?.address || 'पत्ता'}</p>
          <p className="text-[10px] text-gray-600">फोन: {restaurant?.phone || '-'}</p>
          <div className="border-b border-dashed border-black my-2"></div>
          <div className="flex justify-between text-[11px] font-bold">
            <span>टेबल: {table.table_number}</span>
            <span>तारीख: {new Date().toLocaleDateString('mr-IN')}</span>
          </div>
          <div className="border-b border-dashed border-black my-2"></div>
        </div>

        <table className="w-full text-left mb-3">
          <thead>
            <tr className="border-b border-black text-[11px]">
              <th className="py-1">पदार्थ</th>
              <th className="text-center">संख्या</th>
              <th className="text-right">रक्कम</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(consolidatedItems).map((it, idx) => (
              <tr key={idx} className="border-b border-gray-200">
                <td className="py-1">{it.name}</td>
                <td className="text-center">{it.qty}</td>
                <td className="text-right">₹{it.total}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-dashed border-black pt-2 space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span>उप-एकूण (Subtotal):</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>GST (5%):</span>
            <span>₹{tax.toFixed(2)}</span>
          </div>
          <div className="border-b border-black my-1"></div>
          <div className="flex justify-between font-black text-sm">
            <span>एकूण बिल:</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* UPI QR कोड (GPay, PhonePe, Paytm ने थेट स्कॅन करून पैसे देण्यासाठी) */}
        {upiQrUrl && (
          <div className="my-3 text-center border-t border-dashed border-black pt-2">
            <p className="text-[10px] font-bold">📲 GPay / PhonePe / Paytm ने स्कॅन करा</p>
            <img src={upiQrUrl} alt="UPI QR Code" className="w-32 h-32 mx-auto my-1 border border-gray-300 rounded" />
            <p className="text-[9px] text-gray-500">UPI ID: {restaurant?.upi_id || 'hotel@upi'}</p>
          </div>
        )}

        <div className="text-center mt-3 pt-2 border-t border-dashed border-black text-[10px]">
          <p>भेट दिल्याबद्दल धन्यवाद!</p>
          <p>पुन्हा या!</p>
        </div>
      </div>
    </div>
  );
}

export default function ThermalBillPrintPage() {
  return (
    <Suspense fallback={<div className="p-4">बिल लोड होत आहे...</div>}>
      <ThermalBillPrintContent />
    </Suspense>
  );
}
