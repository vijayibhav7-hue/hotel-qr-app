import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-6 text-gray-900">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-orange-100 p-8 text-center">
        <div className="w-20 h-20 bg-orange-600 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-lg mb-4">
          🍽️
        </div>
        <h1 className="text-2xl font-black tracking-tight text-gray-900">हॉटेल QR ऑर्डरिंग प्रणाली</h1>
        <p className="text-xs text-gray-500 mt-2 mb-8">
          Next.js, Tailwind CSS आणि Supabase द्वारे संचालित हाय-स्पीड PWA
        </p>

        <div className="space-y-3">
          <Link
            href="/t/11111111-1111-1111-1111-111111111111"
            className="block w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-md transition active:scale-98 text-sm"
          >
            📱 ग्राहक डेमो (टेबल क्र. १)
          </Link>

          <Link
            href="/staff"
            className="block w-full bg-gray-900 hover:bg-black text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-md transition active:scale-98 text-sm"
          >
            ⚡ स्टाफ लाइव्ह स्क्रीन
          </Link>

          <Link
            href="/admin"
            className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold py-3.5 px-4 rounded-2xl transition active:scale-98 text-sm border border-gray-200"
          >
            👑 मालक पॅनेल (Admin)
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 text-[11px] text-gray-400">
          मराठी (डीफॉल्ट) • हिंदी • English
        </div>
      </div>
    </div>
  );
}
