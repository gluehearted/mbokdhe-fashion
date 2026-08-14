"use client";

import { usePathname } from "next/navigation";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { ToastProvider } from "@/components/ToastProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { FloatingNewOrderButton } from "@/components/FloatingNewOrderButton";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPublicPage = pathname === "/" || pathname === "/landing-page" || pathname === "/login";

  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
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
                <Sidebar />
                <main className="flex-1 flex flex-col h-screen ml-0 md:ml-[260px] relative w-full overflow-hidden transition-all duration-200">
                  {children}
                </main>
                <FloatingNewOrderButton />
              </div>
            )}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
