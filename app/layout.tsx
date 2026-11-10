import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "हॉटेल QR ऑर्डरिंग",
  description: "स्मार्ट QR टेबल-ऑर्डरिंग व वेटर कॉलिंग वेब अॅप",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mr">
      <body className="antialiased bg-gray-50 text-gray-900 selection:bg-orange-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
