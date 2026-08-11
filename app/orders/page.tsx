"use client";

import { useState, useEffect } from "react";
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

  const [editingResiOrder, setEditingResiOrder] = useState<Order | null>(null);
  const [trackingNoInput, setTrackingNoInput] = useState("");
  const [savingResi, setSavingResi] = useState(false);

  const fetchOrders = async () => {
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
  };

  useEffect(() => {
    fetchOrders();
  }, []);

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
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#f8fafc]">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full px-6 h-16 bg-white border-b border-slate-200 z-30 sticky top-0 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-blue-700 tracking-tight">Tabel Pipeline Pesanan</h1>
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

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {[
              { label: "Semua Order", value: "ALL" },
              { label: "Menunggu", value: "Menunggu" },
              { label: "DP", value: "DP" },
              { label: "Siap Packing", value: "Siap Packing" },
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

        {/* Orders Data Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">Loading pesanan...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              Tidak ada data pesanan ditemukan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-center">Order ID</th>
                    <th className="p-4 text-center">Pelanggan</th>
                    <th className="p-4 text-center">Produk Tas</th>
                    <th className="p-4 text-center">Ekspedisi</th>
                    <th className="p-4 text-center">No. Resi</th>
                    <th className="p-4 text-center">Total Price</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredOrders.map((o) => {
                    return (
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
                                  className="bg-blue-50 text-blue-700 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-200"
                                >
                                  #{p.id}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </div>
                        </td>

                        <td className="p-4 text-center text-slate-600">
                          <span className="font-bold text-slate-900">{o.shippingCourier}</span>
                          <span className="text-[11px] text-slate-500 block">{o.shippingService}</span>
                        </td>

                        <td className="p-4 text-center font-mono">
                          {o.trackingNo ? (
                            <span className="text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded border border-blue-200 text-[11px]">
                              {o.trackingNo}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>

                        <td className="p-4 text-center">
                          <span className="font-mono font-bold text-slate-900 block">
                            Rp {o.totalPrice.toLocaleString("id-ID")}
                          </span>
                          {o.dpAmount > 0 && (
                            <span className="text-[11px] text-blue-700 font-mono font-bold block">
                              DP: Rp {o.dpAmount.toLocaleString("id-ID")}
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-center">
                          <select
                            value={o.status === "Keep" ? "Menunggu" : o.status === "Shipped" ? "Dikirim" : o.status}
                            onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                            className="bg-slate-50 text-slate-800 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold focus:outline-none focus:border-blue-600"
                          >
                            <option value="Menunggu">Menunggu</option>
                            <option value="DP">DP</option>
                            <option value="Siap Packing">Siap Packing</option>
                            <option value="Dikirim">Dikirim</option>
                            <option value="Dibatalkan">Dibatalkan</option>
                          </select>
                        </td>

                        <td className="p-4 text-center">
                          <TableActionsMenu
                            items={[
                              {
                                label: o.trackingNo ? "Edit Resi" : "Input Resi",
                                icon: "edit",
                                onClick: () => {
                                  setEditingResiOrder(o);
                                  setTrackingNoInput(o.trackingNo || "");
                                },
                              },
                              {
                                label: "Set Lunas (Siap Packing)",
                                icon: "task_alt",
                                onClick: () => updateOrderStatus(o.id, "Siap Packing"),
                                disabled: o.status === "Siap Packing" || o.status === "Dikirim",
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Modal Edit Resi */}
      {editingResiOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Input Nomor Resi [#{editingResiOrder.id.slice(0, 8)}]
              </h3>
              <button
                onClick={() => setEditingResiOrder(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                Batal
              </button>
            </div>

            <form onSubmit={handleSaveResi} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nomor Resi Pengiriman *</label>
                <input
                  type="text"
                  value={trackingNoInput}
                  onChange={(e) => setTrackingNoInput(e.target.value)}
                  placeholder="Contoh: JNE8829102391"
                  required
                  className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 font-mono focus:border-blue-600 focus:outline-none uppercase"
                />
              </div>

              <div className="flex gap-3 pt-2">
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
                  {savingResi ? "Simpan..." : "Simpan Resi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
