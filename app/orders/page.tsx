"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { TableActionsMenu } from "@/components/TableActionsMenu";
import { useToast } from "@/components/ToastProvider";

interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  addressDetail: string;
  domisili?: string | null;
}

interface Product {
  id: string;
  shop?: {
    id: string;
    name: string;
  } | null;
  capitalPrice?: number;
  price: number;
  discount?: number;
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
  trackingNo?: string | null;
  notes?: string | null;
  createdAt: string;
  products: Product[];
}

export default function OrdersPage() {
  const { showToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  const [editingResiOrder, setEditingResiOrder] = useState<Order | null>(null);
  const [trackingNoInput, setTrackingNoInput] = useState("");
  const [savingResi, setSavingResi] = useState(false);

  const fetchOrders = useCallback(async () => {
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
        await fetchOrders();
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Status pesanan #${orderId.slice(0, 8)} diubah ke '${newStatus}'.`, "success");
        fetchOrders();
      } else {
        showToast(data.error || "Gagal memperbarui status order.", "error");
      }
    } catch {
      showToast("Terjadi kesalahan koneksi saat memperbarui status order.", "error");
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus order #${orderId.slice(0, 8)}?`)) return;

    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast(`Pesanan #${orderId.slice(0, 8)} berhasil dihapus.`, "success");
        fetchOrders();
      } else {
        showToast(data.error || "Gagal menghapus order.", "error");
      }
    } catch {
      showToast("Terjadi kesalahan koneksi saat menghapus order.", "error");
    }
  };

  const handleSaveResi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResiOrder) return;
    setSavingResi(true);

    try {
      const res = await fetch(`/api/orders/${editingResiOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNo: trackingNoInput,
          status: "Dikirim",
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Nomor resi ${trackingNoInput} berhasil disimpan untuk pesanan #${editingResiOrder.id.slice(0, 8)}.`, "success");
        setEditingResiOrder(null);
        fetchOrders();
      } else {
        showToast(data.error || "Gagal menyimpan nomor resi.", "error");
      }
    } catch {
      showToast("Terjadi kesalahan koneksi saat menyimpan nomor resi.", "error");
    } finally {
      setSavingResi(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    const matchesSearch =
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.name.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.whatsapp.includes(search);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#fbfbfa] dark:bg-[#0c0d0f] text-[#111111] dark:text-[#f3f3f3] font-ui transition-colors duration-200">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full px-6 h-16 bg-white dark:bg-[#141517] border-b border-[#eaeaea] dark:border-slate-800/80 z-30 sticky top-0 shrink-0 transition-colors">
        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-[#111111] dark:text-[#f3f3f3] tracking-tight uppercase font-technical">
            Pipeline & Rekap Pesanan
          </h1>
          <span className="text-[10px] text-[#787774] dark:text-slate-400 font-technical uppercase mt-0.5 tracking-wider">
            [ Order Pipeline ]
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="bg-[#f5f5f5] dark:bg-slate-800 p-1 rounded-[6px] border border-[#eaeaea] dark:border-slate-700 flex items-center gap-1 text-[10px] font-bold uppercase font-technical">
            <button
              onClick={() => setViewMode("card")}
              className={`px-3 py-1 rounded-[4px] cursor-pointer transition-all ${
                viewMode === "card"
                  ? "bg-white dark:bg-[#141517] text-[#111111] dark:text-[#f3f3f3] shadow-sm font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-[#111111] dark:hover:text-white"
              }`}
            >
              Kartu
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 rounded-[4px] cursor-pointer transition-all ${
                viewMode === "table"
                  ? "bg-white dark:bg-[#141517] text-[#111111] dark:text-[#f3f3f3] shadow-sm font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-[#111111] dark:hover:text-white"
              }`}
            >
              Tabel
            </button>
          </div>

          <Link
            href="/orders/new"
            className="bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] px-4 py-2 rounded-[6px] font-semibold text-xs uppercase tracking-wider transition-colors active:scale-95 shadow-sm cursor-pointer"
          >
            Buat Pesanan Baru
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 bg-[#fbfbfa] dark:bg-[#0c0d0f] w-full pb-8 space-y-6">

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 p-5 rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {[
              { label: "Semua Order", value: "ALL" },
              { label: "Menunggu", value: "Menunggu" },
              { label: "DP", value: "DP" },
              { label: "Siap Kirim", value: "Siap Kirim" },
              { label: "Dikirim", value: "Dikirim" },
              { label: "Dibatalkan", value: "Dibatalkan" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3.5 py-1.5 rounded-[6px] text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.value
                    ? "bg-[#111111] text-white dark:bg-[#f3f3f3] dark:text-[#111111] font-bold"
                    : "bg-[#f5f5f5] dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-[#eaeaea] dark:border-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Cari ID pesanan, nama, WA..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white text-xs px-3.5 py-2 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-technical"
          />
        </div>

        {/* Orders Content Area */}
        {loading ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs font-technical uppercase">[ Loading pesanan... ]</div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] p-12 text-center text-slate-400 dark:text-slate-500 text-xs font-technical uppercase">
            Tidak ada data pesanan ditemukan.
          </div>
        ) : viewMode === "card" ? (
          /* CARD VIEW LAYOUT */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredOrders.map((o) => {
              const totalBarang = o.products.reduce((acc, p) => acc + p.price, 0);
              const sisaTagihan = o.dpAmount > 0 ? o.totalPrice - o.dpAmount : 0;
              
              let statusBg = "bg-[#f5f5f5] text-slate-700 dark:bg-slate-800 dark:text-slate-300"; // default
              if (o.status === "Siap Kirim" || o.status === "Siap Packing" || o.status === "Lunas" || o.status === "Dikirim") {
                statusBg = "bg-[#EDF3EC] text-[#346538]"; // Pastel Green
              } else if (o.status === "DP") {
                statusBg = "bg-[#E1F3FE] text-[#1F6C9F]"; // Pastel Blue
              } else if (o.status === "Menunggu") {
                statusBg = "bg-[#FBF3DB] text-[#956400]"; // Pastel Yellow
              } else if (o.status === "Dibatalkan") {
                statusBg = "bg-[#FDEBEC] text-[#9F2F2D]"; // Pastel Red
              }

              return (
                <div key={o.id} className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4 hover:shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all flex flex-col justify-between">
                  
                  {/* Card Header: Order ID & Status */}
                  <div className="flex justify-between items-start border-b border-[#eaeaea] dark:border-slate-800/80 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-technical text-xs font-bold text-[#111111] dark:text-[#f3f3f3]">
                          ORDER ID: #{o.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-technical">
                          {new Date(o.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        Pelanggan: <strong className="text-[#111111] dark:text-white font-semibold">{o.customer?.name || "Pelanggan Terhapus"}</strong>
                      </p>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${statusBg}`}>
                      {o.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Customer Info Box */}
                  {o.customer && (
                    <div className="bg-[#f5f5f5] dark:bg-[#1c1d1f] border border-[#eaeaea] dark:border-slate-800 rounded-[6px] p-3 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900 dark:text-white">{o.customer.name}</span>
                        <a
                          href={`https://wa.me/${o.customer.whatsapp}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-technical text-red-600 dark:text-red-400 font-bold hover:underline"
                        >
                          {o.customer.whatsapp}
                        </a>
                      </div>
                      <p className="text-slate-400 dark:text-slate-500 text-[10px] leading-relaxed">
                        {o.customer.addressDetail}, {o.customer.domisili || "-"}
                      </p>
                    </div>
                  )}

                  {/* Rincian Barang Table */}
                  <div className="space-y-2 font-technical">
                    <span className="text-[9px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest block">
                      Rincian Barang Dipesan ({o.products.length} Tas):
                    </span>
                    <div className="bg-[#f5f5f5] dark:bg-[#1c1d1f] border border-[#eaeaea] dark:border-slate-800 rounded-[6px] overflow-hidden text-xs">
                      <table className="w-full text-center divide-y divide-[#eaeaea] dark:divide-slate-800">
                        <thead className="bg-[#f0f0f0] dark:bg-[#252629] text-slate-500 dark:text-slate-400 text-[9px] uppercase font-bold">
                          <tr>
                            <th className="p-2 text-center border-r border-[#eaeaea] dark:border-slate-800">ID Tas</th>
                            <th className="p-2 text-center border-r border-[#eaeaea] dark:border-slate-800">Harga</th>
                            <th className="p-2 text-center">Diskon</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eaeaea] dark:divide-slate-850 text-[10px] text-slate-800 dark:text-slate-200">
                          {o.products.map((p) => (
                            <tr key={p.id} className="hover:bg-white dark:hover:bg-[#141517]">
                              <td className="p-2 text-center border-r border-[#eaeaea] dark:border-slate-800 font-bold text-red-600 dark:text-emerald-400">#{p.id.toUpperCase()}</td>
                              <td className="p-2 text-center border-r border-[#eaeaea] dark:border-slate-800 font-bold">
                                Rp {p.price.toLocaleString("id-ID")}
                              </td>
                              <td className="p-2 text-center font-bold">
                                {p.discount && p.discount > 0 ? (
                                  <span className="text-[#9F2F2D]">
                                    Rp {p.discount.toLocaleString("id-ID")}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-normal">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Financial Breakdown Grid */}
                  <div className="bg-[#f5f5f5] dark:bg-[#1c1d1f] border border-[#eaeaea] dark:border-slate-800 rounded-[6px] p-3 space-y-1.5 text-xs font-technical uppercase">
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Total Barang ({o.products.length}):</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">Rp {totalBarang.toLocaleString("id-ID")}</span>
                    </div>

                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Ongkir ({o.shippingCourier || "Ekspedisi"}):</span>
                      <span className="font-bold">Rp {(o.shippingCost || 0).toLocaleString("id-ID")}</span>
                    </div>

                    {o.dpAmount > 0 && (
                      <div className="flex justify-between text-[#1F6C9F] dark:text-[#a2d8fa] font-bold border-t border-slate-200 dark:border-slate-800 pt-1.5">
                        <span>DP Dibayar:</span>
                        <span>-Rp {o.dpAmount.toLocaleString("id-ID")}</span>
                      </div>
                    )}

                    {sisaTagihan > 0 && (
                      <div className="flex justify-between text-[#956400] dark:text-amber-300 font-bold">
                        <span>Sisa Pelunasan:</span>
                        <span>Rp {sisaTagihan.toLocaleString("id-ID")}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-[#111111] dark:text-white font-bold text-sm border-t border-slate-200 dark:border-slate-800 pt-1.5">
                      <span>Total Tagihan:</span>
                      <span className="text-red-600 dark:text-emerald-400">Rp {o.totalPrice.toLocaleString("id-ID")}</span>
                    </div>
                  </div>

                  {/* Resi Badge */}
                  {o.trackingNo ? (
                    <div className="p-2.5 bg-[#E1F3FE] text-[#1F6C9F] border border-[#d2ecfc] rounded-[6px] text-[10px] flex justify-between items-center font-technical uppercase">
                      <span className="font-bold">Resi {o.shippingCourier || "Ekspedisi"}:</span>
                      <span className="font-bold text-[#1F6C9F]">{o.trackingNo}</span>
                    </div>
                  ) : null}

                  {/* Action Bar */}
                  <div className="flex gap-2 pt-2 border-t border-[#eaeaea] dark:border-slate-800/80">
                    <button
                      onClick={() => {
                        setEditingResiOrder(o);
                        setTrackingNoInput(o.trackingNo || "");
                      }}
                      className="flex-1 py-2 bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] font-bold text-xs rounded-[6px] transition-colors shadow-sm cursor-pointer font-technical uppercase tracking-wide"
                    >
                      {o.trackingNo ? "Edit Resi" : "+ Resi & Kirim"}
                    </button>

                    <button
                      onClick={() => handleDeleteOrder(o.id)}
                      className="px-3 py-2 bg-[#f5f5f5] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold text-xs rounded-[6px] transition-colors border border-[#eaeaea] dark:border-slate-700 cursor-pointer"
                    >
                      HAPUS
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          /* TABLE VIEW LAYOUT */
          <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs text-slate-700 dark:text-slate-300 border-collapse">
                <thead className="bg-[#F9F9F8] dark:bg-slate-900/60 border-b border-[#eaeaea] dark:border-slate-800 text-[10px] text-[#787774] dark:text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">Order ID</th>
                    <th className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">Pelanggan</th>
                    <th className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">Produk Tas & Toko</th>
                    <th className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">Ekspedisi</th>
                    <th className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">No. Resi</th>
                    <th className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">Total Price</th>
                    <th className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">Status</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f1f1] dark:divide-slate-800 font-technical text-xs text-slate-800 dark:text-slate-200">
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-[#F9F9F8] dark:hover:bg-slate-900/20 transition-colors">
                      <td className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800 font-bold text-red-600 dark:text-emerald-400">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </td>

                      <td className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">
                        {o.customer ? (
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{o.customer.name}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{o.customer.whatsapp}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400">Pelanggan terhapus</span>
                        )}
                      </td>

                      <td className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">
                        <div className="flex flex-wrap gap-1 justify-center max-w-xs mx-auto">
                          {o.products && o.products.length > 0 ? (
                            o.products.map((p) => (
                              <span
                                key={p.id}
                                className="px-2.5 py-0.5 bg-[#E1F3FE] text-[#1F6C9F] rounded-full font-bold text-[9px] uppercase tracking-wider"
                                title={`Supplier: ${p.shop?.name || "-"}`}
                              >
                                #{p.id.toUpperCase()} {p.shop?.name ? `(${p.shop.name})` : ""}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800 font-mono">
                        <span className="font-bold text-[#111111] dark:text-white block">{o.shippingCourier || "JNE"}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Rp {(o.shippingCost || 0).toLocaleString("id-ID")}
                        </span>
                      </td>

                      <td className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800 font-mono">
                        {o.trackingNo ? (
                          <span className="font-bold text-[#1F6C9F] bg-[#E1F3FE] px-2.5 py-0.5 rounded-full text-[9px] inline-block uppercase">
                            {o.trackingNo}
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingResiOrder(o);
                              setTrackingNoInput("");
                            }}
                            className="text-red-600 dark:text-red-400 font-bold hover:underline text-[10px] uppercase font-technical cursor-pointer"
                          >
                            + Input Resi
                          </button>
                        )}
                      </td>

                      <td className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800 font-mono font-bold text-[#111111] dark:text-white">
                        Rp {o.totalPrice.toLocaleString("id-ID")}
                        {o.dpAmount > 0 && (
                          <span className="block text-[9px] text-[#1F6C9F] font-bold mt-0.5">
                            DP: Rp {o.dpAmount.toLocaleString("id-ID")}
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">
                        <select
                          value={o.status}
                          onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                          className="bg-white dark:bg-[#1c1d1f] border border-[#eaeaea] dark:border-slate-800 text-[#111111] dark:text-white text-[10px] font-bold p-1.5 rounded-[6px] focus:border-[#111111] focus:outline-none cursor-pointer"
                        >
                          <option value="Menunggu">Menunggu</option>
                          <option value="DP">DP</option>
                          <option value="Siap Kirim">Siap Kirim</option>
                          <option value="Dikirim">Dikirim</option>
                          <option value="Dibatalkan">Dibatalkan</option>
                        </select>
                      </td>

                      <td className="p-4 text-center">
                        <TableActionsMenu
                          items={[
                            {
                              label: "Input / Edit Resi",
                              icon: "edit",
                              onClick: () => {
                                setEditingResiOrder(o);
                                setTrackingNoInput(o.trackingNo || "");
                              },
                            },
                            {
                              label: "Tandai Siap Kirim",
                              icon: "task_alt",
                              onClick: () => updateOrderStatus(o.id, "Siap Kirim"),
                            },
                            {
                              label: "Hapus Order",
                              icon: "delete",
                              danger: true,
                              onClick: () => handleDeleteOrder(o.id),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Modal Input Resi */}
      {editingResiOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] max-w-md w-full p-6 space-y-4 shadow-[0_12px_40px_rgba(0,0,0,0.04)] animate-fade-in-up font-ui">
            <h3 className="text-sm font-bold text-[#111111] dark:text-[#f3f3f3] border-b border-[#eaeaea] dark:border-slate-800 pb-3 uppercase font-technical">
              Input Nomor Resi Pengiriman
            </h3>

            <form onSubmit={handleSaveResi} className="space-y-4 text-xs font-ui">
              <div className="p-3 bg-[#f5f5f5] dark:bg-[#1c1d1f] border border-[#eaeaea] dark:border-slate-800 rounded-[6px] space-y-1 font-technical uppercase">
                <p className="font-bold text-[#111111] dark:text-white">Order ID: #{editingResiOrder.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-slate-750 dark:text-slate-350">Pelanggan: {editingResiOrder.customer?.name}</p>
                <p className="text-slate-500 dark:text-slate-400 text-[10px]">Ekspedisi: {editingResiOrder.shippingCourier || "JNE"}</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Nomor Resi *</label>
                <input
                  type="text"
                  value={trackingNoInput}
                  onChange={(e) => setTrackingNoInput(e.target.value)}
                  placeholder="Contoh: JNE1234567890"
                  required
                  autoFocus
                  className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 font-technical text-sm font-semibold focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-[#eaeaea] dark:border-slate-800/80 text-xs">
                <button
                  type="button"
                  onClick={() => setEditingResiOrder(null)}
                  className="w-1/2 py-2.5 bg-[#f5f5f5] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-[6px] transition-colors border border-[#eaeaea] dark:border-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingResi}
                  className="w-1/2 py-2.5 bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] font-bold rounded-[6px] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingResi ? "Simpan..." : "Simpan Resi & Kirim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
