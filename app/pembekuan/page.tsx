"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  domisili?: string | null;
}

interface Product {
  id: string;
  shopOrigin: string;
  capitalPrice?: number;
  price: number;
  status: string;
}

interface Order {
  id: string;
  customerId: string;
  customer: Customer;
  status: string;
  shippingCourier?: string | null;
  shippingService?: string | null;
  shippingCost: number;
  dpAmount: number;
  dpDate?: string | null;
  dpForfeited: boolean;
  totalPrice: number;
  notes?: string | null;
  createdAt: string;
  products: Product[];
}

interface DailySummary {
  date: string;
  orderCount: number;
  grossRevenue: number;
  capitalCost: number;
  shippingCostSum: number;
  dpForfeitedSum: number;
  netProfit: number;
}

export default function ProfitReportPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"DAILY" | "WEEKLY" | "MONTHLY" | "ALL">("DAILY");
  const [search, setSearch] = useState("");

  const fetchFinancialOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (data.success) {
        setOrders(data.data as Order[]);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFinancialOrders();
  }, [fetchFinancialOrders]);

  const metrics = useMemo(() => {
    let totalGrossRevenue = 0;
    let totalCapitalCost = 0;
    let totalShippingCost = 0;
    let totalDpForfeited = 0;
    let completedOrderCount = 0;

    orders.forEach((o) => {
      if (o.status === "Siap Kirim" || o.status === "Siap Packing" || o.status === "Siap_Kirim" || o.status === "Siap_Packing" || o.status === "Dikirim" || o.status === "Shipped") {
        completedOrderCount++;
        totalGrossRevenue += o.totalPrice;
        totalShippingCost += o.shippingCost;

        const prodCapital = o.products.reduce((sum, p) => sum + (p.capitalPrice || 0), 0);
        totalCapitalCost += prodCapital;
      }

      if (o.dpForfeited && o.dpAmount > 0) {
        totalDpForfeited += o.dpAmount;
      }
    });

    const totalProductRevenue = totalGrossRevenue - totalShippingCost;
    const totalNetProfit = (totalProductRevenue - totalCapitalCost) + totalDpForfeited;

    return {
      totalGrossRevenue,
      totalCapitalCost,
      totalShippingCost,
      totalDpForfeited,
      totalNetProfit,
      completedOrderCount,
    };
  }, [orders]);

  const summaries = useMemo(() => {
    const map: Record<string, DailySummary> = {};

    orders.forEach((o) => {
      const isCompleted = o.status === "Siap Kirim" || o.status === "Siap Packing" || o.status === "Siap_Kirim" || o.status === "Siap_Packing" || o.status === "Dikirim" || o.status === "Shipped";
      const isForfeited = o.dpForfeited && o.dpAmount > 0;

      if (!isCompleted && !isForfeited) return;

      const dateObj = new Date(o.createdAt);
      let groupKey = dateObj.toLocaleDateString("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      if (timeframe === "WEEKLY") {
        const day = dateObj.getDate();
        const weekOfMonth = Math.ceil(day / 7);
        const monthYear = dateObj.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
        groupKey = `Minggu Ke-${weekOfMonth} (${monthYear})`;
      } else if (timeframe === "MONTHLY") {
        groupKey = dateObj.toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        });
      } else if (timeframe === "ALL") {
        groupKey = "Semua Riwayat Terkumpul";
      }

      if (!map[groupKey]) {
        map[groupKey] = {
          date: groupKey,
          orderCount: 0,
          grossRevenue: 0,
          capitalCost: 0,
          shippingCostSum: 0,
          dpForfeitedSum: 0,
          netProfit: 0,
        };
      }

      if (isCompleted) {
        map[groupKey].orderCount += 1;
        map[groupKey].grossRevenue += o.totalPrice;
        map[groupKey].shippingCostSum += o.shippingCost;

        const prodCapital = o.products.reduce((sum, p) => sum + (p.capitalPrice || 0), 0);
        map[groupKey].capitalCost += prodCapital;
      }

      if (isForfeited) {
        map[groupKey].dpForfeitedSum += o.dpAmount;
      }
    });

    const list = Object.values(map).map((s) => {
      const prodRevenue = s.grossRevenue - s.shippingCostSum;
      const profit = (prodRevenue - s.capitalCost) + s.dpForfeitedSum;
      return {
        ...s,
        netProfit: profit,
      };
    });

    return list;
  }, [orders, timeframe]);

  const filteredCompletedOrders = useMemo(() => {
    return orders.filter((o) => {
      const isCompleted = o.status === "Siap Kirim" || o.status === "Siap Packing" || o.status === "Siap_Kirim" || o.status === "Siap_Packing" || o.status === "Dikirim" || o.status === "Shipped" || o.dpForfeited;
      const matchesSearch =
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.customer?.name.toLowerCase().includes(search.toLowerCase()) ||
        o.customer?.whatsapp.includes(search);
      return isCompleted && matchesSearch;
    });
  }, [orders, search]);

  return (
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#f8fafc]">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full px-6 h-16 bg-white border-b border-slate-200 z-30 sticky top-0 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-blue-700 tracking-tight flex items-center gap-2">
            Rekapitulasi Keuangan & Laporan Keuntungan
          </h1>
        </div>
        <button
          onClick={fetchFinancialOrders}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors border border-slate-200"
        >
          Refresh Rekap
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 bg-[#f8fafc] w-full pb-8 space-y-6">

        {/* Financial KPI Summary Cards (4 Metric Cards - Clean Blue & White) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Profit Bersih */}
          <div className="bg-white rounded-xl p-5 border border-blue-200 shadow-sm flex flex-col gap-2 bg-gradient-to-br from-white to-blue-50/40">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Total Profit Bersih
            </span>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-extrabold text-blue-900 font-mono">
                Rp {metrics.totalNetProfit.toLocaleString("id-ID")}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              Keuntungan bersih (Omset - Modal + DP Hangus)
            </span>
          </div>

          {/* Card 2: Total Omset Penjualan */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Omset Penjualan (Gross)
            </span>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-slate-900 font-mono">
                Rp {metrics.totalGrossRevenue.toLocaleString("id-ID")}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              Akumulasi {metrics.completedOrderCount} pesanan selesai
            </span>
          </div>

          {/* Card 3: Total Modal Pembelian */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Modal Tas
            </span>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-slate-900 font-mono">
                Rp {metrics.totalCapitalCost.toLocaleString("id-ID")}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              Total modal beli dari supplier
            </span>
          </div>

          {/* Card 4: DP Hangus */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col gap-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Keuntungan DP Hangus
            </span>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-extrabold text-blue-900 font-mono">
                Rp {metrics.totalDpForfeited.toLocaleString("id-ID")}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              Dana DP terbekukan yang hangus
            </span>
          </div>

        </div>

        {/* SECTION 1: Rekapitulasi Keuangan Per Periode */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm space-y-4 p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Tabel Rekapitulasi Laporan Keuangan
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Rekap akumulasi omset, modal, dan profit bersih berdasarkan periode harian, mingguan, atau bulanan.
              </p>
            </div>

            {/* Timeframe Filter Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              {[
                { label: "Per Hari (Harian)", value: "DAILY" },
                { label: "Per Minggu (Mingguan)", value: "WEEKLY" },
                { label: "Per Bulan (Bulanan)", value: "MONTHLY" },
                { label: "Semua Riwayat", value: "ALL" },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setTimeframe(tab.value as any)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    timeframe === tab.value
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">Mengkalkulasi rekapitulasi keuangan...</div>
          ) : summaries.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Belum ada riwayat transaksi selesai untuk dikalkulasi.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-center">Periode Tanggal</th>
                    <th className="p-4 text-center">Order Selesai</th>
                    <th className="p-4 text-center">Omset Penjualan</th>
                    <th className="p-4 text-center">Total Modal Tas</th>
                    <th className="p-4 text-center">Total Ongkir</th>
                    <th className="p-4 text-center">DP Hangus</th>
                    <th className="p-4 text-center">Profit Bersih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {summaries.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-center font-bold text-slate-900">{s.date}</td>
                      <td className="p-4 text-center font-mono font-bold text-blue-600">{s.orderCount} Pesanan</td>
                      <td className="p-4 text-center font-mono font-bold text-slate-900">
                        Rp {s.grossRevenue.toLocaleString("id-ID")}
                      </td>
                      <td className="p-4 text-center font-mono text-slate-600">
                        Rp {s.capitalCost.toLocaleString("id-ID")}
                      </td>
                      <td className="p-4 text-center font-mono text-slate-500">
                        Rp {s.shippingCostSum.toLocaleString("id-ID")}
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-blue-700">
                        +Rp {s.dpForfeitedSum.toLocaleString("id-ID")}
                      </td>
                      <td className="p-4 text-center font-mono font-extrabold text-blue-700 bg-blue-50">
                        +Rp {s.netProfit.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SECTION 2: Rincian Profit Per Transaksi Pesanan */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Rincian Margin Profit Transaksi Lunas / Selesai
              </h2>
            </div>
            <input
              type="text"
              placeholder="Cari ID order, nama pelanggan, WA..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 bg-slate-50 text-slate-800 text-xs px-3.5 py-2 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-mono"
            />
          </div>

          {filteredCompletedOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Tidak ada rincian transaksi selesai yang cocok.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-center">Order ID</th>
                    <th className="p-4 text-center">Pelanggan</th>
                    <th className="p-4 text-center">Produk Tas</th>
                    <th className="p-4 text-center">Status Pesanan</th>
                    <th className="p-4 text-center">Harga Modal</th>
                    <th className="p-4 text-center">Harga Jual</th>
                    <th className="p-4 text-center">Margin Profit Bersih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredCompletedOrders.map((o) => {
                    const capitalSum = o.products.reduce((acc, p) => acc + (p.capitalPrice || 0), 0);
                    const sellingSum = o.totalPrice - o.shippingCost;
                    const netMargin = (sellingSum - capitalSum) + (o.dpForfeited ? o.dpAmount : 0);

                    return (
                      <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-center font-mono font-extrabold text-blue-600">
                          #{o.id.slice(0, 8)}
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-bold text-slate-900 block">{o.customer?.name}</span>
                          <span className="text-[11px] font-mono text-slate-500">{o.customer?.whatsapp}</span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex flex-wrap gap-1 justify-center max-w-xs mx-auto">
                            {o.products.map((p) => (
                              <span key={p.id} className="bg-blue-50 text-blue-700 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-200">
                                #{p.id} ({p.shopOrigin})
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                            {o.dpForfeited ? "DP Hangus" : o.status}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono text-slate-600">
                          Rp {capitalSum.toLocaleString("id-ID")}
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-slate-900">
                          Rp {sellingSum.toLocaleString("id-ID")}
                        </td>
                        <td className="p-4 text-center font-mono font-extrabold text-blue-700">
                          +Rp {netMargin.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
