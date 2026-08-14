"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function FloatingNewOrderButton() {
  const pathname = usePathname();

  // Hide button if on create order page or login page
  if (pathname === "/orders/new" || pathname === "/login") {
    return null;
  }

  return (
    <Link
      href="/orders/new"
      className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 active:scale-95 text-white dark:text-[#111111] rounded-[6px] shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex items-center justify-center transition-all duration-200 border border-[#eaeaea] dark:border-slate-700 group cursor-pointer"
      title="Buat Pesanan"
    >
      <span className="material-symbols-outlined text-2xl font-bold transition-transform group-hover:scale-105">
        add
      </span>
      {/* Tooltip Label on Hover */}
      <span className="absolute right-14 bg-white dark:bg-[#141517] text-[#111111] dark:text-[#f3f3f3] text-[9px] font-technical uppercase tracking-wider px-3 py-1.5 rounded-[4px] border border-[#eaeaea] dark:border-slate-800 shadow-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
        Buat Pesanan
      </span>
    </Link>
  );
}
