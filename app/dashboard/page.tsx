import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import Image from "next/image";

export const revalidate = 0;

export default async function DashboardPage() {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  let availableProducts: Array<{
    id: string;
    capitalPrice?: number | null;
    price: number;
    status: string;
    photoUrl: string;
    shop?: { name: string } | null;
  }> = [];

  let allOrders: Array<{
    id: string;
    status: string;
    totalPrice: number;
    shippingCost: number;
    dpAmount: number;
    dpForfeited: boolean;
    createdAt: Date;
    products: Array<{ capitalPrice?: number | null }>;
  }> = [];

  let recentOrders: Array<{
    id: string;
    status: string;
    totalPrice: number;
    shippingCourier?: string | null;
    shippingService?: string | null;
    trackingNo?: string | null;
    createdAt: Date;
    customer?: { name: string; whatsapp: string } | null;
    products: Array<{ id: string }>;
  }> = [];

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const [productsRes, allOrdersRes, recentOrdersRes] = await Promise.all([
      supabase
        .from("products")
        .select("*, shop:shops(*)")
        .or("status.eq.Tersedia,status.eq.Available")
        .order("createdAt", { ascending: false })
        .limit(5),
      supabase
        .from("orders")
        .select("*, customer:customers(id, name, whatsapp, domisili), products(*)")
        .order("createdAt", { ascending: false }),
      supabase
        .from("orders")
        .select("*, customer:customers(id, name, whatsapp, domisili), products(*)")
        .order("createdAt", { ascending: false })
        .limit(8),
    ]);

    if (productsRes.error) throw productsRes.error;
    if (allOrdersRes.error) throw allOrdersRes.error;
    if (recentOrdersRes.error) throw recentOrdersRes.error;

    availableProducts = (productsRes.data || []).map((p: any) => ({
      ...p,
      shop: Array.isArray(p.shop) ? p.shop[0] : p.shop || null,
    }));

    allOrders = (allOrdersRes.data || []).map((o: any) => ({
      ...o,
      createdAt: new Date(o.createdAt),
      customer: Array.isArray(o.customer) ? o.customer[0] : o.customer || null,
      products: o.products || [],
    }));

    recentOrders = (recentOrdersRes.data || []).map((o: any) => ({
      ...o,
      createdAt: new Date(o.createdAt),
      customer: Array.isArray(o.customer) ? o.customer[0] : o.customer || null,
      products: o.products || [],
    }));
  } catch (err) {
    console.warn("Koneksi database belum terhubung atau kata sandi database pada .env belum diisi:", err);
  }

  const totalAvailableBags = availableProducts.length;

  let totalProfit = 0;
  let readyToShipCount = 0;
  let todayOrderCount = 0;

  allOrders.forEach((o) => {
    const isCompleted = o.status === "Siap Kirim" || o.status === "Siap Packing" || o.status === "Siap_Kirim" || o.status === "Dikirim" || o.status === "Shipped";
    if (isCompleted) {
      if (o.status === "Siap Kirim" || o.status === "Siap Packing" || o.status === "Siap_Kirim") {
        readyToShipCount++;
      }
      const prodRevenue = o.totalPrice - o.shippingCost;
      const capitalSum = o.products.reduce((acc, p) => acc + (p.capitalPrice || 0), 0);
      totalProfit += (prodRevenue - capitalSum);
    }

    if (o.dpForfeited && o.dpAmount > 0) {
      totalProfit += o.dpAmount;
    }

    const orderDate = new Date(o.createdAt);
    if (orderDate >= startOfToday) {
      todayOrderCount++;
    }
  });

  return (
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#fbfbfa] dark:bg-[#0c0d0f] text-[#111111] dark:text-[#f3f3f3] font-ui transition-colors duration-200">
      
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full px-6 h-16 bg-white dark:bg-[#141517] border-b border-[#eaeaea] dark:border-slate-800/80 z-30 sticky top-0 shrink-0 transition-colors">
        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-[#111111] dark:text-[#f3f3f3] tracking-tight uppercase font-technical">
            Dashboard Overview
          </h1>
          <span className="text-[10px] text-[#787774] dark:text-slate-400 font-technical uppercase mt-0.5 tracking-wider">
            [ System Telemetry ]
          </span>
        </div>
        <Link
          href="/orders/new"
          className="bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] font-semibold px-4 py-2 rounded-[6px] text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
        >
          Buat Pesanan Baru
        </Link>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 bg-[#fbfbfa] dark:bg-[#0c0d0f] w-full pb-12 space-y-6">
        
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Total Tas Tersedia */}
          <div className="bg-white dark:bg-[#141517] rounded-[8px] p-6 border border-[#eaeaea] dark:border-slate-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col gap-2 transition-colors">
            <h3 className="text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
              [01 // STOK TAS TERSEDIA]
            </h3>
            <div className="flex items-end justify-between mt-1">
              <span className="text-2xl font-semibold text-[#111111] dark:text-[#f3f3f3] font-technical">
                {totalAvailableBags} Units
              </span>
            </div>
          </div>

          {/* Card 2: Total Order Hari Ini */}
          <div className="bg-white dark:bg-[#141517] rounded-[8px] p-6 border border-[#eaeaea] dark:border-slate-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col gap-2 transition-colors">
            <h3 className="text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
              [02 // PESANAN HARI INI]
            </h3>
            <div className="flex items-end justify-between mt-1">
              <span className="text-2xl font-semibold text-[#111111] dark:text-[#f3f3f3] font-technical">
                {todayOrderCount} Orders
              </span>
            </div>
          </div>

          {/* Card 3: Perlu Dikirim */}
          <Link 
            href="/ready-to-ship" 
            className="bg-white dark:bg-[#141517] rounded-[8px] p-6 border border-[#eaeaea] dark:border-slate-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col gap-2 hover:border-[#111111] dark:hover:border-slate-500 transition-all group cursor-pointer"
          >
            <h3 className="text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical group-hover:text-[#111111] dark:group-hover:text-[#f3f3f3]">
              [03 // PIPELINE PENGIRIMAN]
            </h3>
            <div className="flex items-end justify-between mt-1">
              <span className="text-2xl font-semibold text-[#111111] dark:text-[#f3f3f3] font-technical">
                {readyToShipCount} Tas
              </span>
              <span className="text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-wider group-hover:underline">
                Kirim →
              </span>
            </div>
          </Link>

          {/* Card 4: Total Keuntungan (Accent Background) */}
          <div className="bg-[#EDF3EC] dark:bg-[#182319] rounded-[8px] p-6 border border-[#cbe1cc] dark:border-emerald-950/60 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col gap-2 transition-colors">
            <h3 className="text-[10px] font-bold text-[#346538] dark:text-emerald-400 uppercase tracking-widest font-technical">
              [04 // REKAP LABA BERSIH]
            </h3>
            <div className="flex items-end justify-between mt-1">
              <span className="text-xl font-bold text-[#346538] dark:text-emerald-300 font-technical">
                Rp {totalProfit.toLocaleString("id-ID")}
              </span>
            </div>
            <span className="text-[9px] text-slate-500 dark:text-emerald-400/85 uppercase">
              Perolehan Bersih Sesi Berjalan
            </span>
          </div>

        </div>

        {/* DATA TABLE 1: Recent Orders Tracking Table */}
        <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <div className="p-5 border-b border-[#eaeaea] dark:border-slate-800/80 flex justify-between items-center bg-[#F9F9F8] dark:bg-slate-900/40 px-6">
            <h2 className="text-xs font-bold text-[#111111] dark:text-[#f3f3f3] uppercase font-technical">
              Daftar Pesanan Terbaru
            </h2>
            <Link
              href="/orders"
              className="text-[10px] font-bold text-[#787774] dark:text-slate-400 hover:text-[#111111] dark:hover:text-[#f3f3f3] uppercase font-technical"
            >
              Lihat Semua →
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500 font-technical text-xs uppercase">[ Belum ada transaksi terdaftar ]</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs text-slate-700 dark:text-slate-300 border-collapse">
                <thead className="bg-[#F9F9F8] dark:bg-slate-900/60 border-b border-[#eaeaea] dark:border-slate-800 text-[10px] text-[#787774] dark:text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4 text-center">ORDER_ID</th>
                    <th className="p-4 text-center">PELANGGAN</th>
                    <th className="p-4 text-center">TAS_ID</th>
                    <th className="p-4 text-center">KURIR</th>
                    <th className="p-4 text-center">NO_RESI</th>
                    <th className="p-4 text-center">STATUS</th>
                    <th className="p-4 text-center">TOTAL</th>
                    <th className="p-4 text-center">TANGGAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f1f1] dark:divide-slate-800 font-technical text-xs text-slate-800 dark:text-slate-200">
                  {recentOrders.map((ord) => {
                    let statusBg = "bg-[#E1F3FE] text-[#1F6C9F]"; // Default blue
                    if (ord.status === "Siap Kirim" || ord.status === "Siap Packing" || ord.status === "Siap_Kirim") {
                      statusBg = "bg-[#FDEBEC] text-[#9F2F2D]"; // Pale Red
                    } else if (ord.status === "Selesai" || ord.status === "Completed") {
                      statusBg = "bg-[#EDF3EC] text-[#346538]"; // Pale Green
                    }
                    
                    return (
                      <tr key={ord.id} className="hover:bg-[#F9F9F8] dark:hover:bg-slate-900/20 transition-colors">
                        <td className="p-4 text-center font-bold text-[#111111] dark:text-[#f3f3f3]">
                          #{ord.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-semibold text-[#111111] dark:text-[#f3f3f3] block">{ord.customer?.name}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-technical">{ord.customer?.whatsapp}</span>
                        </td>
                        <td className="p-4 text-center font-semibold text-slate-800 dark:text-slate-200">
                          {ord.products.map((p) => `#${p.id}`).join(", ")}
                        </td>
                        <td className="p-4 text-center uppercase text-[10px]">
                          {ord.shippingCourier || "-"} ({ord.shippingService || "-"})
                        </td>
                        <td className="p-4 text-center font-semibold uppercase text-[10px]">
                          {ord.trackingNo || "-"}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-0.5 rounded-full font-bold uppercase text-[9px] ${statusBg} inline-block`}>
                            {ord.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-center font-semibold text-[#111111] dark:text-[#f3f3f3]">
                          Rp {ord.totalPrice.toLocaleString("id-ID")}
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
              Katalog Tas Tersedia
            </h2>
            <Link
              href="/products"
              className="text-[10px] font-bold text-[#787774] dark:text-slate-400 hover:text-[#111111] dark:hover:text-[#f3f3f3] uppercase font-technical"
            >
              Kelola Tas →
            </Link>
          </div>

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
                {availableProducts.map((prod) => (
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
                      <span className="px-2.5 py-0.5 rounded-full bg-[#EDF3EC] text-[#346538] font-bold uppercase text-[9px] inline-block">
                        {prod.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
