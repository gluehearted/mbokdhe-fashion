import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";

export const revalidate = 0;

export default async function HomePage() {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const [
    availableProducts,
    allOrders,
    recentOrders,
  ] = await Promise.all([
    prisma.product.findMany({
      where: {
        OR: [{ status: "Tersedia" }, { status: "Available" }],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.order.findMany({
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            whatsapp: true,
            domisili: true,
          },
        },
        products: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            whatsapp: true,
            domisili: true,
          },
        },
        products: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

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
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#f8fafc]">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full px-6 h-16 bg-white border-b border-slate-200 z-30 sticky top-0 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-blue-700 tracking-tight">Dashboard Overview</h1>
        </div>
        <Link
          href="/orders/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors active:scale-95 shadow-sm"
        >
          Buat Pesanan Baru
        </Link>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 bg-[#f8fafc] w-full pb-8 space-y-6">
        
        {/* Metric Cards (Top Section - 4 Columns, Clean Blue & White) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Tas Tersedia */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Tas Tersedia
            </h3>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-slate-900 font-mono">
                {totalAvailableBags}
              </span>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                Tersedia
              </span>
            </div>
          </div>

          {/* Card 2: Total Keuntungan */}
          <div className="bg-white rounded-xl p-5 border border-blue-200 shadow-sm flex flex-col gap-2 bg-gradient-to-br from-white to-blue-50/30">
            <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Total Keuntungan
            </h3>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-extrabold text-blue-900 font-mono">
                Rp {totalProfit.toLocaleString("id-ID")}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              Profit bersih toko
            </span>
          </div>

          {/* Card 3: Total Order Hari Ini */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col gap-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Total Order Hari Ini
            </h3>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-extrabold text-blue-700 font-mono">
                {todayOrderCount}
              </span>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                Hari Ini
              </span>
            </div>
          </div>

          {/* Card 4: Perlu Dikirim */}
          <Link href="/ready-to-ship" className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col gap-2 hover:border-blue-300 transition-all group">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-blue-600 transition-colors">
              Perlu Dikirim
            </h3>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-slate-900 font-mono">
                {readyToShipCount}
              </span>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                Perlu Dikirim
              </span>
            </div>
          </Link>

        </div>

        {/* DATA TABLE 1: Recent Orders Tracking Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h2 className="text-base font-bold text-slate-900">
              Daftar Pesanan Terbaru
            </h2>
            <Link
              href="/orders"
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Lihat Semua Orders →
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">Belum ada pesanan terdaftar.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
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
                <tbody className="divide-y divide-slate-100 font-medium">
                  {recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-center font-mono font-extrabold text-blue-600">
                        #{ord.id.slice(0, 8)}
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-bold text-slate-900 block">{ord.customer?.name}</span>
                        <span className="text-[11px] text-slate-500 font-mono">{ord.customer?.whatsapp}</span>
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-slate-800">
                        {ord.products.map((p) => p.id).join(", ")}
                      </td>
                      <td className="p-4 text-center text-slate-600">
                        {ord.shippingCourier} ({ord.shippingService})
                      </td>
                      <td className="p-4 text-center font-mono text-blue-700 font-bold">
                        {ord.trackingNo || "-"}
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2.5 py-1 rounded font-bold uppercase text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                          {ord.status}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-slate-900">
                        Rp {ord.totalPrice.toLocaleString("id-ID")}
                      </td>
                      <td className="p-4 text-center text-slate-500 font-mono text-[11px]">
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
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h2 className="text-base font-bold text-slate-900">
              Katalog Tas Tersedia
            </h2>
            <Link
              href="/products"
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Kelola Katalog Tas →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4 text-center">Foto</th>
                  <th className="p-4 text-center">ID Tas</th>
                  <th className="p-4 text-center">Toko Asal</th>
                  <th className="p-4 text-center">Harga Modal</th>
                  <th className="p-4 text-center">Harga Jual</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {availableProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-center">
                      <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 overflow-hidden relative flex items-center justify-center mx-auto">
                        {prod.photoUrl && !prod.photoUrl.includes("placeholder") ? (
                          <Image src={prod.photoUrl} alt={prod.id} fill sizes="40px" className="object-cover" />
                        ) : (
                          <span className="text-slate-400 text-xs font-bold">Tas</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center font-mono font-extrabold text-blue-600">#{prod.id}</td>
                    <td className="p-4 text-center font-bold text-slate-900">{prod.shopOrigin}</td>
                    <td className="p-4 text-center text-slate-600 font-mono">Rp {(prod.capitalPrice || 0).toLocaleString("id-ID")}</td>
                    <td className="p-4 text-center font-mono font-bold text-slate-900">
                      Rp {prod.price.toLocaleString("id-ID")}
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded font-bold uppercase text-[10px]">
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
