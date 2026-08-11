"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", path: "/", icon: "dashboard" },
    { label: "Products", path: "/products", icon: "inventory_2" },
    { label: "Kelola Toko", path: "/shops", icon: "store" },
    { label: "Customers", path: "/customers", icon: "group" },
    { label: "Orders", path: "/orders", icon: "shopping_cart" },
    { label: "Laporan Keuntungan", path: "/pembekuan", icon: "payments" },
  ];

  return (
    <aside className="flex flex-col h-full w-[260px] h-screen fixed left-0 top-0 bg-white border-r border-slate-200 z-40">
      {/* Brand Header */}
      <div className="px-6 py-6 border-b border-slate-100 flex items-center gap-2.5">
        <span className="material-symbols-outlined text-blue-600 font-bold text-2xl">
          local_mall
        </span>
        <span className="text-xl font-extrabold text-blue-700 tracking-tight">
          Mbokdhe Fashion
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.path === "/" ? pathname === "/" : pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-6 py-3 text-sm font-semibold transition-all duration-150 ${
                isActive
                  ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className={`material-symbols-outlined text-xl ${isActive ? "text-blue-600" : "text-slate-500"}`}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Admin User Footer */}
      <div className="p-6 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            MF
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-800 truncate">Admin Mbokdhe</p>
            <p className="text-[11px] text-slate-500 truncate">admin@mbokdhe.id</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
