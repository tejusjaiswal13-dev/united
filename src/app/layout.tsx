import type { Metadata } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ThemeProvider } from "@/components/theme-provider";



const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari", "latin"],
  variable: "--font-noto-devanagari",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "JanVichar - Collaborative PIL Filing Portal for Indian Citizens",
  description: "Empowering 1.4 billion voices through collaborative legal action. Draft, discuss, and file Public Interest Litigations (PILs) with AI-powered assistance.",
  keywords: ["PIL", "JanVichar", "Indian Law", "Civic Action", "Legal Tech", "Public Interest Litigation", "Gemini AI"],
  authors: [{ name: "JanVichar Team" }],
  openGraph: {
    title: "JanVichar - Indian PIL Filing Portal",
    description: "Civic Action, Simplified. Join the movement for professional legal empowerment.",
    url: "https://janvichar.in",
    siteName: "JanVichar",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "JanVichar - Civic Action, Simplified",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JanVichar - Indian PIL Filing Portal",
    description: "Empowering Citizens, Strengthening Democracy.",
    images: ["/og-image.png"],
  },
  metadataBase: new URL("https://janvichar.in"),
};

import TrackingWrapper from "@/components/TrackingWrapper";

if (typeof window !== "undefined") {
  const originalError = console.error;
  console.error = (...args) => {
    const msg = args.map(a => (typeof a === 'string' ? a : a?.message || '')).join(' ');
    if (msg.includes('Missing or insufficient permissions')) return;
    originalError.apply(console, args);
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${notoDevanagari.variable} font-sans min-h-screen flex flex-col`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <TrackingWrapper />
            <LanguageProvider>
              <Navbar />
              <main className="flex-grow">{children}</main>
              <Footer />
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
