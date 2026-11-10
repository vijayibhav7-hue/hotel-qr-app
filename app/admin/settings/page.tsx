'use client';

import React, { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabase/client';

export default function HotelSettingsPage() {
  const [restaurantId, setRestaurantId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [upiId, setUpiId] = useState('');

  // PIN व्यवस्थापन
  const [adminPin, setAdminPin] = useState('8888');
  const [staffPin, setStaffPin] = useState('1234');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabaseClient.from('restaurants').select('*').limit(1).single();
      if (data) {
        setRestaurantId(data.id);
        setName(data.name || '');
        setPhone(data.phone || '');
        setAddress(data.address || '');
        setUpiId(data.upi_id || '');
      }

      // सेव्ह केलेले PIN मिळवा
      const savedAdminPin = localStorage.getItem('hotel_admin_custom_pin') || '8888';
      const savedStaffPin = localStorage.getItem('hotel_staff_custom_pin') || '1234';
      setAdminPin(savedAdminPin);
      setStaffPin(savedStaffPin);

      setLoading(false);
    }

    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/hotel/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: restaurantId,
          name,
          phone,
          address,
          upi_id: upiId
        })
      });

      // नवीन PIN सेव्ह करा
      localStorage.setItem('hotel_admin_custom_pin', adminPin);
      localStorage.setItem('hotel_staff_custom_pin', staffPin);

      if (res.ok) {
        setMessage('✅ हॉटेल प्रोफाईल आणि सर्व सुरक्षा सेटिंग्ज सेव्ह झाल्या!');
      } else {
        setMessage('❌ सेव्ह करताना त्रुटी आली.');
      }
    } catch {
      setMessage('❌ नेटवर्क त्रुटी');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 font-bold text-gray-500">माहिती लोड होत आहे...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black mb-1">⚙️ हॉटेल प्रोफाईल व सुरक्षा सेटिंग्ज</h1>
      <p className="text-xs text-gray-500 mb-6">हॉटेलचे नाव, संपर्क, UPI आणि सुरक्षा पिन बदला</p>

      {message && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold">
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        {/* हॉटेल बेसिक माहिती */}
        <div>
          <h2 className="text-sm font-extrabold text-gray-900 border-b pb-2 mb-4">१. हॉटेल तपशील</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">हॉटेलचे नाव *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="उदा. हॉटेल स्वाद"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">फोन / WhatsApp नंबर</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="उदा. 9876543210"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">हॉटेलचा पत्ता</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="उदा. मेन रोड, पुणे"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">UPI ID (पेमेंट QR कोडसाठी) *</label>
              <input
                type="text"
                required
                value={upiId}
                onChange={e => setUpiId(e.target.value)}
                placeholder="उदा. hotel@okaxis किंवा 9876543210@upi"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 font-mono"
              />
              <p className="text-[10px] text-gray-400 mt-1">या UPI ID वर ग्राहकांचे थेट GPay, PhonePe, Paytm पेमेंट जमा होईल.</p>
            </div>
          </div>
        </div>

        {/* सुरक्षा पिन व्यवस्थापन */}
        <div>
          <h2 className="text-sm font-extrabold text-gray-900 border-b pb-2 mb-4">२. सुरक्षा पिन कोड (PINs)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">👑 मालक / ॲडमिन पिन</label>
              <input
                type="password"
                maxLength={6}
                required
                value={adminPin}
                onChange={e => setAdminPin(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-500 font-black tracking-widest text-center"
              />
              <p className="text-[10px] text-gray-400 mt-1">सध्याचा: {adminPin}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">⚡ कर्मचारी / स्टाफ पिन</label>
              <input
                type="password"
                maxLength={4}
                required
                value={staffPin}
                onChange={e => setStaffPin(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 font-black tracking-widest text-center"
              />
              <p className="text-[10px] text-gray-400 mt-1">सध्याचा: {staffPin}</p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold py-3 rounded-2xl shadow transition active:scale-98 text-xs cursor-pointer disabled:opacity-50"
        >
          {saving ? 'सेव्ह होत आहे...' : '💾 माहिती व पिन सेव्ह करा'}
        </button>
      </form>
    </div>
  );
}
