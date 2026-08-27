"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "./ThemeProvider";

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
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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

  // Otomatis tutup sidebar mobile saat rute halaman berpindah
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

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
      {/* Mobile Hamburger Toggle Button (Hanya tampil di layar HP/Tablet < md) */}
      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-3.5 left-3.5 z-40 md:hidden p-2 rounded-[6px] bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-sm flex items-center justify-center cursor-pointer active:scale-95 transition-all"
        title="Buka Menu Navigasi"
        aria-label="Buka Menu"
      >
        <span className="material-symbols-outlined text-lg">menu</span>
      </button>

      {/* Backdrop Overlay Gelap di Layar Mobile saat Sidebar Terbuka */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] md:hidden transition-opacity duration-200"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Aside Sidebar Drawer */}
      <aside
        className={`flex flex-col h-screen w-[260px] fixed left-0 top-0 bg-white dark:bg-[#141517] border-r border-[#eaeaea] dark:border-slate-800/80 z-50 transition-transform duration-200 ease-in-out ${
          isMobileOpen ? "translate-x-0 shadow-[0_0_40px_rgba(0,0,0,0.3)]" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Brand Header with ThemeToggle & Close Button on Mobile */}
        <div className="px-5 py-5 border-b border-[#eaeaea] dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-[#111111] dark:text-white tracking-tighter uppercase font-technical">
              MBOKDHE / FASHION
            </span>
            <span className="text-[9px] text-[#787774] dark:text-slate-400 font-technical tracking-wider uppercase mt-0.5">
              SYS_VER: 2026.8 // ADMIN
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle />
            {/* Tombol Tutup Khusus Mobile */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer ml-1"
              title="Tutup Menu"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto font-technical">
          {navItems.map((item) => {
            const isActive =
              pathname === item.path || (item.path !== "/dashboard" && pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-6 py-3 text-xs tracking-tight transition-all duration-150 rounded-none border-y border-transparent ${
                  isActive
                    ? "bg-[#f5f5f5] dark:bg-[#1c1d1f] text-[#111111] dark:text-white border-l-2 border-l-[#111111] dark:border-l-white font-bold"
                    : "text-slate-500 dark:text-slate-400 hover:bg-[#f5f5f5]/60 dark:hover:bg-slate-800/40 hover:text-[#111111] dark:hover:text-white"
                }`}
              >
                <span className={`material-symbols-outlined text-sm ${isActive ? "text-[#111111] dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
                  {item.icon}
                </span>
                <span>{item.label.toUpperCase()}</span>
              </Link>
            );
          })}
        </nav>

        {/* Admin User Footer & Logout Button */}
        <div className="p-4 border-t border-[#eaeaea] dark:border-slate-800/80 bg-white dark:bg-[#141517] space-y-3 font-technical">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-[4px] border border-[#eaeaea] dark:border-slate-700 bg-[#f5f5f5] dark:bg-slate-800 text-[#111111] dark:text-white flex items-center justify-center font-extrabold text-xs shrink-0">
                {user?.name ? user.name.slice(0, 1).toUpperCase() : <span className="material-symbols-outlined text-sm">person</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate uppercase">
                  {user?.name}
                </p>
                <p className="text-[9px] text-[#787774] dark:text-slate-450 font-bold truncate tracking-wider uppercase">
                  {user?.role}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowLogoutModal(true)}
              className="p-1.5 rounded-[4px] border border-[#eaeaea] dark:border-slate-700 bg-[#f5f5f5] dark:bg-slate-800 text-slate-500 hover:text-[#9F2F2D] hover:bg-[#FDEBEC] dark:hover:bg-red-950/20 transition-colors cursor-pointer"
              title="Keluar Sesi Admin"
            >
              <span className="material-symbols-outlined text-xs">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Confirmation Modal Logout */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] max-w-sm w-full p-6 space-y-4 shadow-[0_12px_40px_rgba(0,0,0,0.04)] text-center font-ui animate-fade-in-up">
            <div className="w-12 h-12 rounded-full border border-red-200 dark:border-red-950/50 bg-[#FDEBEC] dark:bg-red-950/20 text-[#9F2F2D] dark:text-red-400 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-lg">logout</span>
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#111111] dark:text-white uppercase tracking-tighter font-technical">KELUAR DARI ADMIN?</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 uppercase font-technical">
                Anda harus memasukkan email dan kata sandi kembali untuk masuk ke sesi dashboard.
              </p>
            </div>
            <div className="flex gap-3 pt-2 text-xs">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="w-1/2 py-2.5 bg-[#f5f5f5] dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-[6px] border border-[#eaeaea] dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer font-technical uppercase"
              >
                BATAL
              </button>
              <button
                onClick={handleLogout}
                className="w-1/2 py-2.5 bg-[#9F2F2D] text-white font-bold rounded-[6px] hover:bg-[#852523] transition-colors cursor-pointer font-technical uppercase"
              >
                YA, KELUAR
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
