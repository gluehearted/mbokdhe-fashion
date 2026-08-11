"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Overview", path: "/dashboard", icon: "📊" },
    { label: "Katalog Produk", path: "/dashboard/products", icon: "👜" },
    { label: "CRM Pelanggan", path: "/dashboard/customers", icon: "👥" },
    { label: "Kanban Pesanan", path: "/dashboard/orders", icon: "📦" },
    { label: "DP Monitor", path: "/dashboard/keep-monitor", icon: "🔒" },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-md group-hover:scale-105 transition-transform">
            M
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base tracking-tight leading-tight">Mbokdhe Fashion</h1>
            <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Admin Dashboard</span>
          </div>
        </Link>

        {/* Main Navbar Links */}
        <nav className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  isActive
                    ? "bg-amber-500 text-slate-950 shadow font-extrabold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/80"
                }`}
              >
                <span>{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/orders/new"
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <span>➕</span>
            <span className="hidden sm:inline">Buat Order</span>
          </Link>
        </div>

      </div>
    </header>
  );
}
