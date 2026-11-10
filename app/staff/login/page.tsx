'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setErrorMsg('ईमेल किंवा पासवर्ड चुकीचा आहे.');
        return;
      }

      const { data: staffData, error: staffErr } = await supabaseClient
        .from('staff')
        .select('role, restaurant_id')
        .eq('auth_user_id', data.user.id)
        .single();

      if (staffErr || !staffData) {
        await supabaseClient.auth.signOut();
        setErrorMsg('तुमचे खाते स्टाफ म्हणून नोंदणीकृत नाही.');
        return;
      }

      router.push('/staff');
    } catch {
      setErrorMsg('काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 text-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-700">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-600 rounded-2xl mx-auto flex items-center justify-center text-2xl font-black mb-3 shadow-lg">
            🍽️
          </div>
          <h1 className="text-2xl font-black">हॉटेल स्टाफ पोर्टल</h1>
          <p className="text-xs text-gray-400 mt-1">ऑर्डर्स, किचन आणि बिलिंग व्यवस्थापन</p>
        </div>

        {errorMsg && (
          <div className="mb-4 bg-red-900/50 border border-red-500 text-red-200 text-xs py-2 px-3 rounded-xl text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">ईमेल</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="staff@hotel.com"
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">पासवर्ड</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-extrabold py-3.5 rounded-xl transition active:scale-98 shadow-lg disabled:opacity-50 mt-2"
          >
            {loading ? 'लॉगिन होत आहे...' : 'लॉगिन करा'}
          </button>
        </form>
      </div>
    </div>
  );
}
