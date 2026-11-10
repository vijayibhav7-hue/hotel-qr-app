import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-6 text-gray-900">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-orange-100 p-8 text-center relative overflow-hidden">
        {/* वरचा बॅज */}
        <div className="w-20 h-20 bg-orange-600 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-lg mb-4 text-white">
          🍽️
        </div>
        <h1 className="text-2xl font-black tracking-tight text-gray-900">हॉटेल स्वाद</h1>
        <p className="text-xs text-gray-500 mt-2 mb-6">
          स्मार्ट डिजिटल मेनू व कॉन्टॅक्टलेस ऑर्डरिंग
        </p>

        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6 text-left">
          <h2 className="text-xs font-black text-orange-900 mb-1 flex items-center gap-1.5">
            <span>📷</span> ऑर्डर कशी करायची?
          </h2>
          <p className="text-[12px] text-orange-800 leading-relaxed">
            कृपया तुमच्या टेबलवर लावलेला <strong>QR कोड</strong> मोबाईलच्या कॅमेराने स्कॅन करा. मेनू थेट तुमच्या मोबाईलवर उघडेल!
          </p>
        </div>

        {/* डेमो टेबल १ बटण */}
        <Link
          href="/t/11111111-1111-1111-1111-111111111111"
          className="block w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-md transition active:scale-98 text-sm cursor-pointer"
        >
          📱 टेबल क्र. १ मेनू पहा (डेमो)
        </Link>

        {/* हॉटेल कर्मचाऱ्यांसाठी सुरक्षित लॉगिन */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between text-xs">
          <Link
            href="/staff"
            className="text-gray-500 hover:text-gray-900 font-bold flex items-center gap-1"
          >
            ⚡ स्टाफ लॉगिन
          </Link>

          <Link
            href="/admin"
            className="text-gray-500 hover:text-gray-900 font-bold flex items-center gap-1"
          >
            👑 मालक ॲडमिन
          </Link>
        </div>
      </div>
    </div>
  );
}
