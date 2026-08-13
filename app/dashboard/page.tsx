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
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#f8fafc] dark:bg-slate-950 transition-colors">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full px-6 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30 sticky top-0 shrink-0 transition-colors">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-blue-700 dark:text-blue-400 tracking-tight">Dashboard Overview</h1>
        </div>
        <Link
          href="/orders/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors active:scale-95 shadow-sm"
        >
          Buat Pesanan Baru
        </Link>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 bg-[#f8fafc] dark:bg-slate-950 w-full pb-8 space-y-6">
        
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Tas Tersedia */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-2 transition-colors">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Tas Tersedia
            </h3>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-slate-900 dark:text-white font-mono">
                {totalAvailableBags}
              </span>
            </div>
          </div>

                    {/* Card 3: Total Order Hari Ini */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-2 transition-colors">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Total Order Hari Ini
            </h3>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-extrabold text-blue-700 dark:text-blue-400 font-mono">
                {todayOrderCount}
              </span>
            </div>
          </div>

          {/* Card 4: Perlu Dikirim */}
          <Link href="/ready-to-ship" className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-2 hover:border-blue-300 dark:hover:border-blue-700 transition-all group">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Perlu Dikirim
            </h3>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-slate-900 dark:text-white font-mono">
                {readyToShipCount}
              </span>
            </div>
          </Link>

          {/* Card 2: Total Keuntungan */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-blue-200 dark:border-blue-800/80 shadow-sm flex flex-col gap-2 bg-gradient-to-br from-white dark:from-slate-900 to-blue-50/30 dark:to-blue-950/30 transition-colors">
            <h3 className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
              Total Keuntungan
            </h3>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-extrabold text-blue-900 dark:text-blue-300 font-mono">
                Rp {totalProfit.toLocaleString("id-ID")}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Profit bersih toko
            </span>
          </div>

        </div>

        {/* DATA TABLE 1: Recent Orders Tracking Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/80">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Daftar Pesanan Terbaru
            </h2>
            <Link
              href="/orders"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Lihat Semua Orders →
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">Belum ada pesanan terdaftar.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4 text-center">Order ID</th>
                    <th className="p-4 text-center">Pelanggan</th>
                    <th className="p-4 text-center">Tas Dibeli</th>
                    <th className="p-4 text-center">Ekspedisi</th>
                    <th className="p-4 text-center">No. Resi</th>
                    <th className="p-4 text-center">DP / Status</th>
                    <th className="p-4 text-center">Total Tagihan</th>
                    <th className="p-4 text-center">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 text-center font-mono font-extrabold text-blue-600 dark:text-blue-400">
                        #{ord.id.slice(0, 8)}
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-bold text-slate-900 dark:text-white block">{ord.customer?.name}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{ord.customer?.whatsapp}</span>
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                        {ord.products.map((p) => p.id).join(", ")}
                      </td>
                      <td className="p-4 text-center text-slate-600 dark:text-slate-400">
                        {ord.shippingCourier} ({ord.shippingService})
                      </td>
                      <td className="p-4 text-center font-mono text-blue-700 dark:text-blue-400 font-bold">
                        {ord.trackingNo || "-"}
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2.5 py-1 rounded font-bold uppercase text-[10px] bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
                          {ord.status}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-slate-900 dark:text-white">
                        Rp {ord.totalPrice.toLocaleString("id-ID")}
                      </td>
                      <td className="p-4 text-center text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {new Date(ord.createdAt).toLocaleDateString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* DATA TABLE 2: Available Products Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/80">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Katalog Tas Tersedia
            </h2>
            <Link
              href="/products"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Kelola Katalog Tas →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4 text-center">Foto</th>
                  <th className="p-4 text-center">ID Tas</th>
                  <th className="p-4 text-center">Toko Asal</th>
                  <th className="p-4 text-center">Harga Modal</th>
                  <th className="p-4 text-center">Harga Jual</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {availableProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 text-center">
                      <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden relative flex items-center justify-center mx-auto">
                        {prod.photoUrl && !prod.photoUrl.includes("placeholder") ? (
                          <Image src={prod.photoUrl} alt={prod.id} fill sizes="40px" className="object-cover" />
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-xs font-bold">Tas</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center font-mono font-extrabold text-blue-600 dark:text-blue-400">#{prod.id}</td>
                    <td className="p-4 text-center font-bold text-slate-900 dark:text-white">{prod.shop?.name || "-"}</td>
                    <td className="p-4 text-center text-slate-600 dark:text-slate-400 font-mono">Rp {(prod.capitalPrice || 0).toLocaleString("id-ID")}</td>
                    <td className="p-4 text-center font-mono font-bold text-slate-900 dark:text-white">
                      Rp {prod.price.toLocaleString("id-ID")}
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 rounded font-bold uppercase text-[10px]">
                        {prod.status}
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
