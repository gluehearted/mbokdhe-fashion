"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

interface OrderProduct {
  id: string;
  capitalPrice?: number | null;
  price: number;
}

interface Customer {
  id: string;
  name: string;
  whatsapp: string;
}

interface Order {
  id: string;
  customer?: Customer | null;
  products: OrderProduct[];
  shippingCost: number;
  totalPrice: number;
  dpAmount: number;
  dpForfeited: boolean;
  status: string;
  createdAt: string;
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

export default function PembekuanPage() {
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
        setOrders(data.data);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (isMounted) {
        await fetchFinancialOrders();
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [fetchFinancialOrders]);

  const metrics = useMemo(() => {
    let totalGrossRevenue = 0;
    let totalCapitalCost = 0;
    let totalShippingCost = 0;
    let totalDpForfeited = 0;
    let completedOrderCount = 0;

    orders.forEach((o) => {
      const isCompleted = o.status === "Siap Kirim" || o.status === "Siap Packing" || o.status === "Siap_Kirim" || o.status === "Siap_Packing" || o.status === "Dikirim" || o.status === "Shipped";
      
      if (isCompleted) {
        completedOrderCount++;
        totalGrossRevenue += o.totalPrice;
        totalShippingCost += o.shippingCost;
        const capitalSum = o.products.reduce((acc, p) => acc + (p.capitalPrice || 0), 0);
        totalCapitalCost += capitalSum;
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
        groupKey = dateObj.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
      } else if (timeframe === "ALL") {
        groupKey = "Semua Riwayat Keuangan";
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
        const capitalSum = o.products.reduce((acc, p) => acc + (p.capitalPrice || 0), 0);
        map[groupKey].capitalCost += capitalSum;
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
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#fbfbfa] dark:bg-[#0c0d0f] text-[#111111] dark:text-[#f3f3f3] font-ui transition-colors duration-200">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full pl-14 pr-4 md:px-6 h-16 bg-white dark:bg-[#141517] border-b border-[#eaeaea] dark:border-slate-800/80 z-30 sticky top-0 shrink-0 transition-colors">
        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-[#111111] dark:text-[#f3f3f3] tracking-tight uppercase font-technical">
            Laporan Keuangan & Keuntungan
          </h1>
          <span className="text-[10px] text-[#787774] dark:text-slate-400 font-technical uppercase mt-0.5 tracking-wider">
            [ Financial Ledger ]
          </span>
        </div>
        <button
          onClick={fetchFinancialOrders}
          className="px-4 py-2 bg-[#f5f5f5] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-[6px] border border-[#eaeaea] dark:border-slate-700 transition-colors cursor-pointer font-technical uppercase"
        >
          Refresh Data
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 bg-[#fbfbfa] dark:bg-[#0c0d0f] w-full pb-8 space-y-6">

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Total Profit Bersih */}
          <div className="bg-[#EDF3EC] dark:bg-[#182319] rounded-[8px] p-6 border border-[#cbe1cc] dark:border-emerald-950/60 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col gap-2 transition-colors">
            <span className="text-[10px] font-bold text-[#346538] dark:text-emerald-400 uppercase tracking-widest font-technical">
              [01 // TOTAL PROFIT BERSIH]
            </span>
            <div className="flex items-end justify-between mt-1">
              <span className="text-2xl font-bold text-[#346538] dark:text-emerald-300 font-technical">
                Rp {metrics.totalNetProfit.toLocaleString("id-ID")}
              </span>
            </div>
            <span className="text-[9px] text-[#346538]/85 dark:text-emerald-400/85 uppercase">
              Omset - Modal + DP Hangus
            </span>
          </div>

          {/* Card 2: Total Omset Penjualan */}
          <div className="bg-white dark:bg-[#141517] rounded-[8px] p-6 border border-[#eaeaea] dark:border-slate-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col gap-2 transition-colors">
            <span className="text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
              [02 // OMSET PENJUALAN GROSS]
            </span>
            <div className="flex items-end justify-between mt-1">
              <span className="text-2xl font-bold text-[#111111] dark:text-[#f3f3f3] font-technical">
                Rp {metrics.totalGrossRevenue.toLocaleString("id-ID")}
              </span>
            </div>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase">
              Dari {metrics.completedOrderCount} pesanan selesai
            </span>
          </div>

          {/* Card 3: Total Modal Pembelian */}
          <div className="bg-white dark:bg-[#141517] rounded-[8px] p-6 border border-[#eaeaea] dark:border-slate-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col gap-2 transition-colors">
            <span className="text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
              [03 // TOTAL MODAL TAS]
            </span>
            <div className="flex items-end justify-between mt-1">
              <span className="text-2xl font-bold text-[#111111] dark:text-[#f3f3f3] font-technical">
                Rp {metrics.totalCapitalCost.toLocaleString("id-ID")}
              </span>
            </div>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase">
              Total modal dari supplier
            </span>
          </div>

          {/* Card 4: DP Hangus */}
          <div className="bg-white dark:bg-[#141517] rounded-[8px] p-6 border border-[#eaeaea] dark:border-slate-800/80 shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex flex-col gap-2 transition-colors">
            <span className="text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
              [04 // KEUNTUNGAN DP HANGUS]
            </span>
            <div className="flex items-end justify-between mt-1">
              <span className="text-2xl font-bold text-[#111111] dark:text-[#f3f3f3] font-technical">
                Rp {metrics.totalDpForfeited.toLocaleString("id-ID")}
              </span>
            </div>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase">
              Dana DP hangus terakumulasi
            </span>
          </div>

        </div>

        {/* SECTION 1: Tabel Ringkasan Keuangan Harian / Periodik */}
        <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)] p-5 space-y-4 transition-colors">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-[#eaeaea] dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-xs font-bold text-[#111111] dark:text-[#f3f3f3] uppercase font-technical">
                Tabel Rekapitulasi Laporan Keuangan
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                Kalkulasi akumulasi omset, modal, dan profit bersih berdasarkan periode terpililh.
              </p>
            </div>

            {/* Timeframe Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 bg-[#f5f5f5] dark:bg-slate-800 p-1 rounded-[6px] border border-[#eaeaea] dark:border-slate-700 text-xs font-semibold">
              {[
                { label: "Per Hari", value: "DAILY" },
                { label: "Per Minggu", value: "WEEKLY" },
                { label: "Per Bulan", value: "MONTHLY" },
                { label: "Semua", value: "ALL" },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setTimeframe(tab.value as any)}
                  className={`px-3 py-1 rounded-[4px] transition-all cursor-pointer font-technical uppercase ${
                    timeframe === tab.value
                      ? "bg-[#111111] dark:bg-[#f3f3f3] text-white dark:text-[#111111] font-bold"
                      : "text-slate-500 dark:text-slate-400 hover:text-[#111111] dark:hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs font-technical uppercase">[ Mengkalkulasi rekapitulasi keuangan... ]</div>
          ) : summaries.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs font-technical uppercase">
              Belum ada riwayat transaksi selesai untuk dikalkulasi.
            </div>
          ) : (
            <div className="overflow-x-auto font-technical">
              <table className="w-full text-center text-xs text-slate-700 dark:text-slate-200 border-collapse">
                <thead className="bg-[#F9F9F8] dark:bg-slate-900/60 border-b border-[#eaeaea] dark:border-slate-800 text-[10px] text-[#787774] dark:text-slate-400 font-bold uppercase tracking-wider">
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
                <tbody className="divide-y divide-[#f1f1f1] dark:divide-slate-800 font-technical text-xs text-slate-800 dark:text-slate-200">
                  {summaries.map((s, idx) => (
                    <tr key={idx} className="hover:bg-[#F9F9F8] dark:hover:bg-slate-900/20 transition-colors">
                      <td className="p-4 text-center font-bold text-slate-900 dark:text-white">{s.date}</td>
                      <td className="p-4 text-center font-bold text-slate-600 dark:text-slate-400">{s.orderCount} Pesanan</td>
                      <td className="p-4 text-center font-bold text-slate-900 dark:text-white">
                        Rp {s.grossRevenue.toLocaleString("id-ID")}
                      </td>
                      <td className="p-4 text-center text-slate-400 dark:text-slate-500">
                        Rp {s.capitalCost.toLocaleString("id-ID")}
                      </td>
                      <td className="p-4 text-center text-slate-400 dark:text-slate-500">
                        Rp {s.shippingCostSum.toLocaleString("id-ID")}
                      </td>
                      <td className="p-4 text-center font-bold text-[#956400] dark:text-amber-400">
                        +Rp {s.dpForfeitedSum.toLocaleString("id-ID")}
                      </td>
                      <td className="p-4 text-center font-bold text-[#346538] dark:text-emerald-300 bg-[#EDF3EC] dark:bg-[#182319]/40">
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
        <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)] p-5 space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#eaeaea] dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-xs font-bold text-[#111111] dark:text-[#f3f3f3] uppercase font-technical">
                Rincian Margin Profit Transaksi Lunas / Selesai
              </h2>
            </div>
            <input
              type="text"
              placeholder="Cari ID order, nama pelanggan, WA..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white text-xs px-3.5 py-2 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-technical"
            />
          </div>

          {filteredCompletedOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs font-technical uppercase">
              Tidak ada rincian transaksi selesai yang cocok.
            </div>
          ) : (
            <div className="overflow-x-auto font-technical">
              <table className="w-full text-center text-xs text-slate-700 dark:text-slate-200 border-collapse">
                <thead className="bg-[#F9F9F8] dark:bg-slate-900/60 border-b border-[#eaeaea] dark:border-slate-800 text-[10px] text-[#787774] dark:text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4 text-center">Order ID</th>
                    <th className="p-4 text-center">Pelanggan</th>
                    <th className="p-4 text-center">Total Tagihan</th>
                    <th className="p-4 text-center">Ongkir</th>
                    <th className="p-4 text-center">Pendapatan Tas</th>
                    <th className="p-4 text-center">Total Modal</th>
                    <th className="p-4 text-center">Profit Bersih</th>
                    <th className="p-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f1f1] dark:divide-slate-800 font-technical text-xs text-slate-800 dark:text-slate-200">
                  {filteredCompletedOrders.map((ord) => {
                    const isCompleted = ord.status === "Siap Kirim" || ord.status === "Siap Packing" || ord.status === "Siap_Kirim" || ord.status === "Siap_Packing" || ord.status === "Dikirim" || ord.status === "Shipped";
                    
                    const prodRevenue = ord.totalPrice - ord.shippingCost;
                    const capitalSum = ord.products.reduce((acc, p) => acc + (p.capitalPrice || 0), 0);
                    
                    const isCancelledDp = ord.dpForfeited && !isCompleted;
                    let profit = prodRevenue - capitalSum;
                    if (isCancelledDp) {
                      profit = ord.dpAmount;
                    }

                    return (
                      <tr key={ord.id} className="hover:bg-[#F9F9F8] dark:hover:bg-slate-900/20 transition-colors">
                        <td className="p-4 text-center font-bold text-red-600 dark:text-emerald-400">
                          #{ord.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-bold text-slate-900 dark:text-white block uppercase">{ord.customer?.name}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{ord.customer?.whatsapp}</span>
                        </td>
                        
                        <td className="p-4 text-center font-bold text-slate-900 dark:text-white">
                          {isCancelledDp ? <span className="text-slate-400 font-normal">[ Batal ]</span> : `Rp ${ord.totalPrice.toLocaleString("id-ID")}`}
                        </td>
                        <td className="p-4 text-center text-slate-400">
                          {isCancelledDp ? "-" : `Rp ${ord.shippingCost.toLocaleString("id-ID")}`}
                        </td>
                        <td className="p-4 text-center font-semibold text-slate-800 dark:text-slate-200">
                          {isCancelledDp ? "-" : `Rp ${prodRevenue.toLocaleString("id-ID")}`}
                        </td>
                        <td className="p-4 text-center text-slate-400">
                          {isCancelledDp ? <span className="text-slate-400">[ Barang Kembali ]</span> : `Rp ${capitalSum.toLocaleString("id-ID")}`}
                        </td>
                        
                        <td className="p-4 text-center font-bold text-[#346538] dark:text-emerald-300 bg-[#EDF3EC] dark:bg-[#182319]/40">
                          +Rp {profit.toLocaleString("id-ID")}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] inline-block ${
                            ord.dpForfeited
                              ? "bg-[#FBF3DB] text-[#956400]"
                              : "bg-[#E1F3FE] text-[#1F6C9F]"
                          }`}>
                            {ord.dpForfeited && !isCompleted ? "DP HANGUS" : ord.status.toUpperCase()}
                          </span>
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
