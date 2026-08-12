"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface UserProfile {
  email: string;
  name: string;
  role: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (pathname === "/login") return;
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
        }
      } catch {
        // Ignore
      }
    }
    loadUser();
  }, [pathname]);

  // Do not render Sidebar on Login Page
  if (pathname === "/login") return null;

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: "dashboard" },
    { label: "Products", path: "/products", icon: "inventory_2" },
    { label: "Kelola Toko", path: "/shops", icon: "store" },
    { label: "Customers", path: "/customers", icon: "group" },
    { label: "Orders", path: "/orders", icon: "shopping_cart" },
    { label: "Perlu Dikirim", path: "/ready-to-ship", icon: "local_shipping" },
    { label: "Laporan Keuntungan", path: "/pembekuan", icon: "payments" },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <>
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
              pathname === item.path || (item.path !== "/dashboard" && pathname.startsWith(item.path));
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

        {/* Admin User Footer & Logout Button */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-extrabold text-xs shadow-sm shrink-0">
                {user?.name ? user.name.slice(0, 1).toUpperCase() : <span className="material-symbols-outlined text-base">person</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-slate-800 truncate">
                  {user?.name}
                </p>
                <p className="text-[10px] text-blue-700 font-bold truncate">
                  {user?.role}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowLogoutModal(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Keluar Sesi Admin"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Confirmation Modal Logout */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-2xl">logout</span>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Keluar dari Admin?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Anda harus memasukkan email dan kata sandi kembali untuk masuk.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="w-1/2 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-xs"
              >
                Batal
              </button>
              <button
                onClick={handleLogout}
                className="w-1/2 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-sm text-xs"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
