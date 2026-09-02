"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

interface Shop {
  id: string;
  name: string;
}

interface Product {
  id: string;
  capitalPrice?: number | null;
  price: number;
  status: string;
  photoUrl: string;
  description?: string | null;
  shop?: Shop | null;
}

interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  domisili?: string | null;
}

interface Order {
  id: string;
  status: string;
  totalPrice: number;
  shippingCost: number;
  shippingCourier?: string | null;
  shippingService?: string | null;
  trackingNo?: string | null;
  dpAmount: number;
  dpForfeited: boolean;
  createdAt: string;
  customer?: Customer | null;
  products: Product[];
}

const isSettledOrder = (status: string) => {
  const s = (status || "").toLowerCase().trim();
  return (
    s === "siap kirim" ||
    s === "siap packing" ||
    s === "siap_kirim" ||
    s === "siap_packing" ||
    s === "dikirim" ||
    s === "shipped" ||
    s === "selesai" ||
    s === "lunas" ||
    s === "completed"
  );
};

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, orderRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/orders"),
      ]);

      const prodData = await prodRes.json();
      const orderData = await orderRes.json();

      if (prodData.success) {
        setProducts(prodData.data || []);
      }
      if (orderData.success) {
        setOrders(orderData.data || []);
      }
      setLastUpdated(new Date().toLocaleTimeString("id-ID"));
    } catch (err) {
      console.error("Gagal memuat data dashboard dari Supabase:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      loadDashboardData();
    }
    return () => {
      isMounted = false;
    };
  }, [loadDashboardData]);

  // --- Metrics Calculation ---
  const { totalAvailableBags, todayOrderCount, readyToShipCount, totalProfit } = useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const availableCount = products.filter(
      (p) => p.status === "Tersedia" || p.status === "Available"
    ).length;

    let todayOrders = 0;
    let readyToShip = 0;
    let profit = 0;

    orders.forEach((o) => {
      const orderDate = new Date(o.createdAt);
      if (orderDate >= startOfToday) {
        todayOrders++;
      }

      const s = (o.status || "").toLowerCase().trim();
      if (s === "siap kirim" || s === "siap packing" || s === "siap_kirim" || s === "siap_packing") {
        readyToShip++;
      }

      if (isSettledOrder(o.status)) {
        const prodRevenue = (o.totalPrice || 0) - (o.shippingCost || 0);
        const capitalSum = (o.products || []).reduce((acc, p) => acc + (p.capitalPrice || 0), 0);
        profit += (prodRevenue - capitalSum);
      } else if (o.dpForfeited && o.dpAmount > 0) {
        profit += o.dpAmount;
      }
    });

    return {
      totalAvailableBags: availableCount,
      todayOrderCount: todayOrders,
      readyToShipCount: readyToShip,
      totalProfit: profit,
    };
  }, [products, orders]);

  // 8 Pesanan Terakhir
  const recentOrders = useMemo(() => orders.slice(0, 8), [orders]);

  // 6 Tas Tersedia Terakhir
  const recentAvailableProducts = useMemo(() => {
    return products
      .filter((p) => p.status === "Tersedia" || p.status === "Available")
      .slice(0, 6);
  }, [products]);

  return (
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#fbfbfa] dark:bg-[#0c0d0f] text-[#111111] dark:text-[#f3f3f3] font-ui transition-colors duration-200">
      
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full pl-14 pr-4 md:px-6 h-16 bg-white dark:bg-[#141517] border-b border-[#eaeaea] dark:border-slate-800/80 z-30 sticky top-0 shrink-0 transition-colors">
        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-[#111111] dark:text-[#f3f3f3] tracking-tight uppercase font-technical">
            Dashboard Overview
          </h1>
          <span className="text-[10px] text-[#787774] dark:text-slate-400 font-technical uppercase mt-0.5 tracking-wider">
            [ Realtime Telemetry // Supabase Live ]
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadDashboardData}
            disabled={loading}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-[#f5f5f5] hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-[6px] text-xs font-technical uppercase font-bold border border-[#eaeaea] dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
            title="Refresh data dari database"
          >
            <span className={`material-symbols-outlined text-sm ${loading ? "animate-spin" : ""}`}>
              sync
            </span>
            <span>{loading ? "Menyinkronkan..." : "Refresh"}</span>
          </button>
          <Link
            href="/orders/new"
            className="bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] font-semibold px-4 py-2 rounded-[6px] text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-sm cursor-pointer font-technical"
          >
            Buat Pesanan
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-3.5 sm:p-6 bg-[#fbfbfa] dark:bg-[#0c0d0f] w-full pb-12 space-y-4 sm:space-y-6">
        
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
          
          {/* Card 1: Total Tas Tersedia */}
          <div className="bg-white dark:bg-[#141517] rounded-[8px] p-6 border border-[#eaeaea] dark:border-slate-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col justify-between transition-colors">
            <h3 className="text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
              [01 // STOK TAS TERSEDIA]
            </h3>
            <div className="flex items-end justify-between mt-2">
              <span className="text-2xl font-bold text-[#111111] dark:text-[#f3f3f3] font-technical">
                {loading ? "..." : `${totalAvailableBags} Units`}
              </span>
              <Link href="/products" className="text-[10px] font-bold text-[#1F6C9F] dark:text-[#6cb6e4] uppercase font-technical hover:underline">
                Katalog →
              </Link>
            </div>
          </div>

          {/* Card 2: Total Order Hari Ini */}
          <div className="bg-white dark:bg-[#141517] rounded-[8px] p-6 border border-[#eaeaea] dark:border-slate-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col justify-between transition-colors">
            <h3 className="text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
              [02 // PESANAN HARI INI]
            </h3>
            <div className="flex items-end justify-between mt-2">
              <span className="text-2xl font-bold text-[#111111] dark:text-[#f3f3f3] font-technical">
                {loading ? "..." : `${todayOrderCount} Orders`}
              </span>
              <Link href="/orders" className="text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase font-technical hover:underline">
                Daftar →
              </Link>
            </div>
          </div>

          {/* Card 3: Perlu Dikirim */}
          <Link 
            href="/ready-to-ship" 
            className="bg-white dark:bg-[#141517] rounded-[8px] p-6 border border-[#eaeaea] dark:border-slate-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col justify-between hover:border-[#111111] dark:hover:border-slate-500 transition-all group cursor-pointer"
          >
            <h3 className="text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical group-hover:text-[#111111] dark:group-hover:text-[#f3f3f3]">
              [03 // PIPELINE PENGIRIMAN]
            </h3>
            <div className="flex items-end justify-between mt-2">
              <span className="text-2xl font-bold text-[#9F2F2D] dark:text-red-400 font-technical">
                {loading ? "..." : `${readyToShipCount} Tas`}
              </span>
              <span className="text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-wider group-hover:underline">
                Kirim →
              </span>
            </div>
          </Link>

          {/* Card 4: Total Keuntungan */}
          <Link
            href="/pembekuan"
            className="bg-white dark:bg-[#141517] rounded-[8px] p-6 border border-[#eaeaea] dark:border-slate-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col justify-between transition-colors hover:border-[#111111] dark:hover:border-slate-700 cursor-pointer"
          >
            <h3 className="text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
              [04 // REKAP LABA BERSIH]
            </h3>
            <div className="flex items-end justify-between mt-2">
              <span className="text-xl font-bold text-[#111111] dark:text-[#f3f3f3] font-technical">
                {loading ? "..." : `Rp ${totalProfit.toLocaleString("id-ID")}`}
              </span>
              <span className="text-[9px] text-[#787774] dark:text-slate-400 font-bold uppercase font-technical">
                Laporan →
              </span>
            </div>
          </Link>

        </div>

        {/* DATA TABLE 1: Recent Orders Tracking Table */}
        <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <div className="p-5 border-b border-[#eaeaea] dark:border-slate-800/80 flex justify-between items-center bg-[#F9F9F8] dark:bg-slate-900/40 px-6">
            <h2 className="text-xs font-bold text-[#111111] dark:text-[#f3f3f3] uppercase font-technical tracking-wider">
              Pesanan Terbaru &amp; Status Pengiriman
            </h2>
            <Link
              href="/orders"
              className="text-[10px] text-[#787774] dark:text-slate-400 hover:text-[#111111] dark:hover:text-white font-technical font-semibold uppercase"
            >
              Lihat Semua →
            </Link>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500 font-technical text-xs uppercase animate-pulse">
              [ Menyinkronkan data pesanan dari Supabase... ]
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500 font-technical text-xs uppercase">
              [ Belum ada transaksi terdaftar ]
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs text-slate-700 dark:text-slate-300 border-collapse">
                <thead className="bg-[#F9F9F8] dark:bg-slate-900/60 border-b border-[#eaeaea] dark:border-slate-800 text-[10px] text-[#787774] dark:text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4 text-center">ORDER_ID</th>
                    <th className="p-4 text-center">PELANGGAN</th>
                    <th className="p-4 text-center">TAS</th>
                    <th className="p-4 text-center">KURIR</th>
                    <th className="p-4 text-center">STATUS</th>
                    <th className="p-4 text-center">TOTAL</th>
                    <th className="p-4 text-center">TANGGAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f1f1] dark:divide-slate-800 font-technical text-xs text-slate-800 dark:text-slate-200">
                  {recentOrders.map((ord) => {
                    let statusBg = "bg-[#111111] text-white dark:bg-white dark:text-[#111111]";
                    const s = (ord.status || "").toLowerCase().trim();
                    if (s === "siap kirim" || s === "siap packing" || s === "siap_kirim" || s === "siap_packing") {
                      statusBg = "bg-[#111111] text-white dark:bg-white dark:text-[#111111]";
                    } else if (s === "selesai" || s === "lunas" || s === "completed") {
                      statusBg = "bg-white text-[#111111] border border-[#eaeaea] dark:bg-[#141517] dark:text-[#f3f3f3] dark:border-slate-800";
                    } else if (s === "dibatalkan" || s === "cancelled") {
                      statusBg = "bg-[#787774] text-white dark:bg-slate-700 dark:text-slate-200";
                    }
                    
                    return (
                      <tr key={ord.id} className="hover:bg-[#F9F9F8] dark:hover:bg-slate-900/20 transition-colors">
                        <td className="p-4 text-center font-bold text-[#111111] dark:text-[#f3f3f3]">
                          #{ord.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-semibold text-[#111111] dark:text-[#f3f3f3] block">{ord.customer?.name || "-"}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-technical">{ord.customer?.whatsapp || "-"}</span>
                        </td>
                        <td className="p-4 text-center font-semibold text-slate-800 dark:text-slate-200">
                          {ord.products.length > 0 ? ord.products.map((p) => `#${p.id}`).join(", ") : "-"}
                        </td>
                        <td className="p-4 text-center uppercase text-[10px]">
                          {ord.shippingCourier || "-"} {ord.shippingCost ? `(Rp ${ord.shippingCost.toLocaleString("id-ID")})` : ""}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-0.5 rounded-full font-bold uppercase text-[9px] ${statusBg} inline-block`}>
                            {ord.dpForfeited ? "DP HANGUS" : ord.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-center font-semibold text-[#111111] dark:text-[#f3f3f3]">
                          Rp {(ord.totalPrice || 0).toLocaleString("id-ID")}
                        </td>
                        <td className="p-4 text-center text-slate-400 dark:text-slate-500 text-[10px]">
                          {new Date(ord.createdAt).toLocaleDateString("id-ID")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* DATA TABLE 2: Available Products Table */}
        <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <div className="p-5 border-b border-[#eaeaea] dark:border-slate-800/80 flex justify-between items-center bg-[#F9F9F8] dark:bg-slate-900/40 px-6">
            <h2 className="text-xs font-bold text-[#111111] dark:text-[#f3f3f3] uppercase font-technical">
              Katalog Tas Tersedia Terbaru
            </h2>
            <Link
              href="/products"
              className="text-[10px] font-bold text-[#787774] dark:text-slate-400 hover:text-[#111111] dark:hover:text-[#f3f3f3] uppercase font-technical"
            >
              Lihat Semua ({totalAvailableBags}) →
            </Link>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500 font-technical text-xs uppercase animate-pulse">
              [ Memuat katalog inventaris dari Supabase... ]
            </div>
          ) : recentAvailableProducts.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500 font-technical text-xs uppercase">
              [ Tidak ada tas yang berstatus Tersedia ]
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs text-slate-700 dark:text-slate-300 border-collapse">
                <thead className="bg-[#F9F9F8] dark:bg-slate-900/60 border-b border-[#eaeaea] dark:border-slate-800 text-[10px] text-[#787774] dark:text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4 text-center w-16">FOTO</th>
                    <th className="p-4 text-center">TAS_ID</th>
                    <th className="p-4 text-center">TOKO_ASAL</th>
                    <th className="p-4 text-center">HARGA_MODAL</th>
                    <th className="p-4 text-center">HARGA_JUAL</th>
                    <th className="p-4 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f1f1] dark:divide-slate-800 font-technical text-xs text-slate-800 dark:text-slate-200">
                  {recentAvailableProducts.map((prod) => (
                    <tr key={prod.id} className="hover:bg-[#F9F9F8] dark:hover:bg-slate-900/20 transition-colors">
                      <td className="p-4 text-center">
                        <div className="w-10 h-10 rounded-[4px] bg-[#fbfbfa] dark:bg-slate-900 border border-[#eaeaea] dark:border-slate-800 overflow-hidden relative flex items-center justify-center mx-auto">
                          {prod.photoUrl && !prod.photoUrl.includes("placeholder") ? (
                            <Image src={prod.photoUrl} alt={prod.id} fill sizes="40px" className="object-cover" />
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600 text-[9px] font-bold">TAS</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center font-bold text-[#111111] dark:text-[#f3f3f3]">#{prod.id.toUpperCase()}</td>
                      <td className="p-4 text-center font-semibold text-slate-800 dark:text-slate-200 uppercase">{prod.shop?.name || "-"}</td>
                      <td className="p-4 text-center font-technical">Rp {(prod.capitalPrice || 0).toLocaleString("id-ID")}</td>
                      <td className="p-4 text-center font-bold font-technical">
                        Rp {prod.price.toLocaleString("id-ID")}
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#111111] text-white dark:bg-white dark:text-[#111111] font-bold uppercase text-[9px] inline-block">
                          {prod.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
