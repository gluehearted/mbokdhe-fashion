"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Topbar() {
  const pathname = usePathname();

  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Overview Dashboard";
    if (pathname.startsWith("/dashboard/products")) return "Manajemen Produk & Etalase";
    if (pathname.startsWith("/dashboard/customers")) return "Manajemen Pelanggan (CRM)";
    if (pathname.startsWith("/dashboard/orders")) return "Kanban & Pipeline Pesanan";
    if (pathname.startsWith("/dashboard/keep-monitor")) return "Pembekuan Dana (DP / Keep Monitor)";
    return "Admin Dashboard";
  };

  return (
    <header className="h-16 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h1 className="text-lg font-extrabold text-white">{getPageTitle()}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Quick Checkout Shortcut */}
        <Link
          href="/"
          className="px-3.5 py-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500 hover:text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
        >
          <span>🛍️</span>
          <span>Open Checkout UI</span>
        </Link>

        {/* User Badge */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="font-semibold text-slate-300">Admin Mbokdhe</span>
        </div>
      </div>
    </header>
  );
}
