"use client";

import { usePathname } from "next/navigation";
import { Plus_Jakarta_Sans, Instrument_Serif, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { ToastProvider } from "@/components/ToastProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-plus-jakarta", display: "swap" });
const editorial = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument-serif", display: "swap", preload: false });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
const symbols = localFont({ src: "../public/fonts/material-symbols-outlined.woff2", variable: "--font-material-symbols", weight: "400", display: "block" });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPublicPage = pathname === "/" || pathname === "/landing-page" || pathname === "/login";

  return (
    <html lang="id" className={`${jakarta.variable} ${editorial.variable} ${mono.variable} ${symbols.variable} h-full antialiased`}>
      <head>
        <title>Mbokdhe Fashion // Sistem Manajemen Inventaris & Order</title>
        <meta name="description" content="Sistem Manajemen Katalog Tas, Inventaris, dan Rekap Pesanan Mbokdhe Fashion" />
        <link rel="icon" href="/icon/icon_mbokdhe.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icon/icon_mbokdhe.png" />
      </head>
      <body className="h-full font-ui text-[#111111] dark:text-[#f3f3f3] bg-[#fbfbfa] dark:bg-[#0c0d0f] flex flex-row overflow-hidden">
        <ThemeProvider>
          <ToastProvider>
            {isPublicPage ? (
              <div className="min-h-screen w-full bg-[#fbfbfa] dark:bg-[#0c0d0f] font-ui overflow-x-hidden">
                {children}
              </div>
            ) : (
              <div className="flex h-screen bg-[#fbfbfa] dark:bg-[#0c0d0f] text-[#111111] dark:text-[#f3f3f3] font-ui overflow-hidden w-full relative">
                <Sidebar key={pathname} />
                <main className="flex-1 flex flex-col h-screen ml-0 md:ml-[260px] relative w-full overflow-hidden transition-all duration-200">
                  {children}
                </main>
                {pathname !== "/orders/new" && (
                  <Link
                    href="/orders/new"
                    className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 active:scale-95 text-white dark:text-[#111111] rounded-[6px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex items-center justify-center transition-all duration-200 border border-[#eaeaea] dark:border-slate-700 group cursor-pointer"
                    title="Buat Pesanan"
                  >
                    <span className="material-symbols-outlined text-2xl font-bold transition-transform group-hover:scale-105">
                      add
                    </span>
                    <span className="absolute right-14 bg-white dark:bg-[#141517] text-[#111111] dark:text-[#f3f3f3] text-[9px] font-technical uppercase tracking-wider px-3 py-1.5 rounded-[4px] border border-[#eaeaea] dark:border-slate-800 shadow-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                      Buat Pesanan
                    </span>
                  </Link>
                )}
              </div>
            )}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
