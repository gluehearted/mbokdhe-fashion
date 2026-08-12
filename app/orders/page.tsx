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
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#f8fafc] dark:bg-slate-950 transition-colors">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full px-6 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30 sticky top-0 shrink-0 transition-colors">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-blue-700 dark:text-blue-400 tracking-tight">Pipeline & Rekap Pesanan</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 text-xs">
            <button
              onClick={() => setViewMode("card")}
              className={`px-3 py-1 rounded-md font-bold transition-all ${
                viewMode === "card"
                  ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Tampilan Kartu
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 rounded-md font-bold transition-all ${
                viewMode === "table"
                  ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Tampilan Tabel
            </button>
          </div>

          <Link
            href="/orders/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors active:scale-95 shadow-sm"
          >
            Buat Pesanan Baru
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 bg-[#f8fafc] dark:bg-slate-950 w-full pb-8 space-y-6">

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {[
              {label: "Semua Order", value: "ALL" },
              { label: "Menunggu", value: "Menunggu" },
              { label: "DP", value: "DP" },
              { label: "Siap Kirim", value: "Siap Kirim" },
              { label: "Dikirim", value: "Dikirim" },
              { label: "Dibatalkan", value: "Dibatalkan" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  statusFilter === tab.value
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
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
            className="w-full sm:w-64 bg-slate-50 text-slate-800 text-xs px-3.5 py-2 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-mono"
          />
        </div>

        {/* Orders Content Area */}
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading pesanan...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-slate-500 dark:text-slate-400 text-sm font-medium shadow-sm transition-colors">
            Tidak ada data pesanan ditemukan.
          </div>
        ) : viewMode === "card" ? (
          /* CARD VIEW LAYOUT */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredOrders.map((o) => {
              const totalBarang = o.products.reduce((acc, p) => acc + p.price, 0);
              const sisaTagihan = o.dpAmount > 0 ? o.totalPrice - o.dpAmount : 0;

              return (
                <div key={o.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:border-blue-300 transition-all">
                  
                  {/* Card Header: Order ID & Status */}
                  <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-extrabold text-blue-700">#{o.id.slice(0, 8)}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(o.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Pelanggan: <strong className="text-slate-900">{o.customer?.name || "Pelanggan Terhapus"}</strong>
                      </p>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase shadow-sm ${
                        o.status === "Siap Kirim" || o.status === "Siap Packing" || o.status === "Lunas"
                          ? "bg-blue-600 text-white"
                          : o.status === "DP"
                          ? "bg-blue-100 text-blue-800 border border-blue-300"
                          : o.status === "Dikirim"
                          ? "bg-slate-100 text-slate-800 border border-slate-300"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>

                  {/* Customer Info Box */}
                  {o.customer && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">{o.customer.name}</span>
                        <a
                          href={`https://wa.me/${o.customer.whatsapp}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-blue-600 font-bold hover:underline"
                        >
                          {o.customer.whatsapp}
                        </a>
                      </div>
                      <p className="text-slate-500 text-[11px] leading-relaxed">
                        {o.customer.addressDetail}, {o.customer.domisili || "-"}
                      </p>
                    </div>
                  )}

                  {/* Rincian Barang Table */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Rincian Barang Dipesan ({o.products.length} Tas):
                    </span>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-center divide-y divide-slate-200">
                        <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase font-bold">
                          <tr>
                            <th className="p-2 text-center">ID Tas</th>
                            <th className="p-2 text-center">Harga</th>
                            <th className="p-2 text-center">Diskon</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {o.products.map((p) => (
                            <tr key={p.id} className="hover:bg-white">
                              <td className="p-2 text-center font-bold text-blue-600">#{p.id}</td>
                              <td className="p-2 text-center font-bold text-slate-900">
                                Rp {p.price.toLocaleString("id-ID")}
                              </td>
                              <td className="p-2 text-center font-bold">
                                {p.discount && p.discount > 0 ? (
                                  <span className="text-red-700">
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
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Barang ({o.products.length}):</span>
                      <span className="font-bold text-slate-800">Rp {totalBarang.toLocaleString("id-ID")}</span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span>Ongkir ({o.shippingCourier || "Ekspedisi"}):</span>
                      <span className="font-bold text-blue-700">Rp {(o.shippingCost || 0).toLocaleString("id-ID")}</span>
                    </div>

                    {o.dpAmount > 0 && (
                      <div className="flex justify-between text-blue-800 font-bold border-t border-slate-200 pt-1.5">
                        <span>DP Dibayar:</span>
                        <span>-Rp {o.dpAmount.toLocaleString("id-ID")}</span>
                      </div>
                    )}

                    {sisaTagihan > 0 && (
                      <div className="flex justify-between text-amber-700 font-bold">
                        <span>Sisa Pelunasan:</span>
                        <span>Rp {sisaTagihan.toLocaleString("id-ID")}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-900 font-extrabold text-sm border-t border-slate-200 pt-1.5">
                      <span>Total Tagihan:</span>
                      <span className="text-blue-700">Rp {o.totalPrice.toLocaleString("id-ID")}</span>
                    </div>
                  </div>

                  {/* Resi Badge */}
                  {o.trackingNo ? (
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs flex justify-between items-center font-mono">
                      <span className="text-blue-700 font-bold">Resi {o.shippingCourier || "Ekspedisi"}:</span>
                      <span className="font-bold text-blue-900">{o.trackingNo}</span>
                    </div>
                  ) : null}

                  {/* Action Bar */}
                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setEditingResiOrder(o);
                        setTrackingNoInput(o.trackingNo || "");
                      }}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
                    >
                      {o.trackingNo ? "Edit Resi" : "+ Input Resi & Kirim"}
                    </button>

                    <button
                      onClick={() => handleDeleteOrder(o.id)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg transition-colors border border-slate-200"
                    >
                      Hapus
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          /* TABLE VIEW LAYOUT */
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-center">Order ID</th>
                    <th className="p-4 text-center">Pelanggan</th>
                    <th className="p-4 text-center">Produk Tas & Supplier</th>
                    <th className="p-4 text-center">Ekspedisi</th>
                    <th className="p-4 text-center">No. Resi</th>
                    <th className="p-4 text-center">Total Price</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-center font-mono font-extrabold text-blue-600">
                        #{o.id.slice(0, 8)}
                      </td>

                      <td className="p-4 text-center">
                        {o.customer ? (
                          <div>
                            <p className="font-bold text-slate-900">{o.customer.name}</p>
                            <p className="text-[11px] font-mono text-slate-500">{o.customer.whatsapp}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400">Pelanggan terhapus</span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex flex-wrap gap-1 justify-center max-w-xs mx-auto">
                          {o.products && o.products.length > 0 ? (
                            o.products.map((p) => (
                              <span
                                key={p.id}
                                className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-extrabold text-[11px]"
                                title={`Supplier: ${p.shop?.name || "-"}`}
                              >
                                #{p.id} {p.shop?.name ? `(${p.shop.name})` : ""}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-center font-mono">
                        <span className="font-bold text-slate-900 block">{o.shippingCourier || "JNE"}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Rp {(o.shippingCost || 0).toLocaleString("id-ID")}
                        </span>
                      </td>

                      <td className="p-4 text-center font-mono">
                        {o.trackingNo ? (
                          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px] inline-block">
                            {o.trackingNo}
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingResiOrder(o);
                              setTrackingNoInput("");
                            }}
                            className="text-blue-600 font-bold hover:underline text-[11px]"
                          >
                            + Input Resi
                          </button>
                        )}
                      </td>

                      <td className="p-4 text-center font-mono font-bold text-slate-900">
                        Rp {o.totalPrice.toLocaleString("id-ID")}
                        {o.dpAmount > 0 && (
                          <span className="block text-[10px] text-blue-700 font-bold mt-0.5">
                            DP: Rp {o.dpAmount.toLocaleString("id-ID")}
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <select
                          value={o.status}
                          onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                          className="bg-slate-50 border border-slate-200 text-slate-900 text-[11px] font-bold p-1.5 rounded-lg focus:border-blue-600 focus:outline-none"
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Input Nomor Resi Pengiriman
            </h3>

            <form onSubmit={handleSaveResi} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 font-mono">
                <p className="font-bold text-blue-700">Order ID: #{editingResiOrder.id.slice(0, 8)}</p>
                <p className="text-slate-700">Pelanggan: {editingResiOrder.customer?.name}</p>
                <p className="text-slate-500 text-[11px]">Ekspedisi: {editingResiOrder.shippingCourier || "JNE"}</p>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nomor Resi *</label>
                <input
                  type="text"
                  value={trackingNoInput}
                  onChange={(e) => setTrackingNoInput(e.target.value)}
                  placeholder="Contoh: JNE1234567890"
                  required
                  autoFocus
                  className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 font-mono text-sm font-bold focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingResiOrder(null)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors border border-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingResi}
                  className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all disabled:opacity-50"
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
