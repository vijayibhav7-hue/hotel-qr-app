'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const DEFAULT_ADMIN_PIN = '8888';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('hotel_admin_auth');
    if (saved === 'true') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const storedPin = localStorage.getItem('hotel_admin_custom_pin') || DEFAULT_ADMIN_PIN;
    if (pinInput === storedPin) {
      setIsAuthenticated(true);
      localStorage.setItem('hotel_admin_auth', 'true');
      setPinError('');
    } else {
      setPinError('❌ चुकीचा पिन! (डिफॉल्ट पिन 8888 आहे)');
      setPinInput('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hotel_admin_auth');
    setIsAuthenticated(false);
  };

  if (loading) return null;

  // जर मालक लॉगिन नसेल, तर लॉक स्क्रीन दाखवा
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-orange-600 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-4 shadow-lg">
            👑
          </div>
          <h1 className="text-xl font-black text-white">मालक पॅनेल लॉक आहे</h1>
          <p className="text-xs text-gray-400 mt-1 mb-6">पुढे जाण्यासाठी तुमचा ४-अंकी सुरक्षा पिन टाका</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              maxLength={6}
              autoFocus
              placeholder="पिन टाका (उदा. 8888)"
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              className="w-full text-center tracking-widest text-2xl font-black bg-gray-800 border border-gray-700 rounded-2xl py-3 text-white outline-none focus:border-orange-500"
            />

            {pinError && <p className="text-xs text-red-400 font-semibold">{pinError}</p>}

            <button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-extrabold py-3.5 rounded-2xl transition active:scale-95 shadow cursor-pointer text-sm"
            >
              लॉगिन करा 🔓
            </button>
          </form>

          <p className="text-[11px] text-gray-500 mt-6">
            डिफॉल्ट ॲडमिन पिन: <span className="text-orange-400 font-bold">8888</span>
          </p>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: '📊 आजची विक्री व डॅशबोर्ड', href: '/admin' },
    { label: '🍲 मेनू व्यवस्थापन (CRUD)', href: '/admin/menu' },
    { label: '🪑 टेबल्स व QR PDF', href: '/admin/tables' },
    { label: '⚙️ हॉटेल प्रोफाईल व सेटिंग्ज', href: '/admin/settings' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row text-gray-800">
      <aside className="w-full md:w-64 bg-gray-900 text-white p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <span className="text-3xl">👑</span>
              <div>
                <h1 className="font-black text-lg">मालक पॅनेल</h1>
                <p className="text-[11px] text-gray-400">हॉटेल ॲडमिन कंट्रोल</p>
              </div>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map(item => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-4 py-3 rounded-xl font-bold text-xs transition ${
                    active ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-8 pt-4 border-t border-gray-800 space-y-2">
          <Link
            href="/staff"
            className="block text-center bg-gray-800 hover:bg-gray-700 py-2.5 rounded-xl text-xs font-bold text-gray-300"
          >
            ← स्टाफ स्क्रीनवर जा
          </Link>
          <button
            onClick={handleLogout}
            className="w-full text-center bg-red-950/60 hover:bg-red-900 text-red-300 py-2 rounded-xl text-xs font-bold cursor-pointer"
          >
            🔒 लॉक करा (Logout)
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-6xl">{children}</main>
    </div>
  );
}
