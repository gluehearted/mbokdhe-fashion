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
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 border-2 border-white group"
      title="Buat Pesanan Baru (+)"
    >
      <span className="material-symbols-outlined text-3xl font-bold transition-transform group-hover:scale-110">
        add
      </span>
      {/* Tooltip Label on Hover */}
      <span className="absolute right-16 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
        Buat Pesanan Baru (+)
      </span>
    </Link>
  );
}
