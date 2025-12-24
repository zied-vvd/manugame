import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import Snowfall from "@/components/Snowfall";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MBTI Party Game",
  description: "Devinez les personnalités de vos amis !",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>❄️</text></svg>",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a1525",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${plusJakarta.variable} ${playfair.variable} antialiased min-h-screen`}
        style={{ fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif" }}
      >
        {/* Winter Forest Background (blurred) */}
        <div className="winter-bg" aria-hidden="true" />
        
        {/* Dark overlay */}
        <div className="winter-bg-overlay" aria-hidden="true" />
        
        {/* Falling Snow - Lots of it! */}
        <Snowfall count={150} />
        
        {/* Main Content */}
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
