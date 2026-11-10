'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: '📊 आजची विक्री व डॅशबोर्ड', href: '/admin' },
    { label: '🍲 मेनू व्यवस्थापन (CRUD)', href: '/admin/menu' },
    { label: '🪑 टेबल्स व QR PDF', href: '/admin/tables' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row text-gray-800">
      <aside className="w-full md:w-64 bg-gray-900 text-white p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <span className="text-3xl">👑</span>
            <div>
              <h1 className="font-black text-lg">मालक पॅनेल</h1>
              <p className="text-[11px] text-gray-400">हॉटेल ॲडमिन कंट्रोल</p>
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

        <div className="mt-8 pt-4 border-t border-gray-800">
          <Link
            href="/staff"
            className="block text-center bg-gray-800 hover:bg-gray-700 py-2.5 rounded-xl text-xs font-bold text-gray-300"
          >
            ← स्टाफ स्क्रीनवर जा
          </Link>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-6xl">{children}</main>
    </div>
  );
}
