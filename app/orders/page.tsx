"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TableActionsMenu } from "@/components/TableActionsMenu";

interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  addressDetail: string;
  cityId: number;
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Edit Resi state
  const [editingResiOrder, setEditingResiOrder] = useState<Order | null>(null);
  const [trackingNoInput, setTrackingNoInput] = useState("");
  const [savingResi, setSavingResi] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // API Call: GET /api/orders (mengambil daftar seluruh pesanan)
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
      // API Call: PATCH /api/orders/[id] (memperbarui status pipeline pesanan)
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchOrders();
      } else {
        alert(data.error || "Gagal memperbarui status order.");
      }
    } catch {
      alert("Terjadi kesalahan koneksi.");
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus order #${orderId.slice(0, 8)}?`)) return;

    try {
      // API Call: DELETE /api/orders/[id] (menghapus pesanan)
      const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchOrders();
      } else {
        alert(data.error || "Gagal menghapus order.");
      }
    } catch {
      alert("Terjadi kesalahan koneksi.");
    }
  };

  const handleSaveResi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResiOrder) return;
    setSavingResi(true);

    try {
      // API Call: PATCH /api/orders/[id] (menyimpan nomor resi pengiriman & update status ke Shipped)
      const res = await fetch(`/api/orders/${editingResiOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNo: trackingNoInput,
          status: "Shipped",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEditingResiOrder(null);
        fetchOrders();
      } else {
        alert(data.error || "Gagal menyimpan resi.");
      }
    } catch {
      alert("Terjadi kesalahan koneksi.");
    } finally {
      setSavingResi(false);
    }
  };

  const getDaysElapsed = (dateStr?: string | null) => {
    if (!dateStr) return 0;
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
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
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#f7f9fb]">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full px-6 h-16 bg-white border-b border-slate-200 z-30 sticky top-0 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-blue-700 tracking-tight">Tabel Pipeline Pesanan</h1>
        </div>

        <Link
          href="/orders/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors active:scale-95 shadow-sm"
        >
          <span className="material-symbols-outlined text-sm font-bold">add</span>
          <span>Buat Pesanan Baru</span>
        </Link>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 bg-[#f7f9fb] w-full pb-8 space-y-6">

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {[
              { label: "Semua Order", value: "ALL" },
              { label: "Keep / Menunggu", value: "Keep" },
              { label: "DP (Dibekukan)", value: "DP" },
              { label: "Siap Packing", value: "Siap_Packing" },
              { label: "Shipped (Dikirim)", value: "Shipped" },
              { label: "Dibatalkan", value: "Cancelled" },
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

        {/* Orders Data Table (Centered) */}
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
                    <th className="p-4 text-center">Tas Dibeli</th>
                    <th className="p-4 text-center">Kurir & Layanan</th>
                    <th className="p-4 text-center">No. Resi Pengiriman</th>
                    <th className="p-4 text-center">DP / Tagihan</th>
                    <th className="p-4 text-center">Status Pesanan</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredOrders.map((o) => {
                    const days = getDaysElapsed(o.dpDate || o.createdAt);
                    const isDpAging = o.status === "DP" && days >= 1;

                    return (
                      <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-center font-mono font-extrabold text-blue-600">
                          #{o.id.slice(0, 8)}
                        </td>

                        <td className="p-4 text-center">
                          <span className="font-bold text-slate-900 block">{o.customer?.name}</span>
                          <a
                            href={`https://wa.me/${o.customer?.whatsapp}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-blue-600 font-mono hover:underline inline-flex items-center gap-1 justify-center"
                          >
                            💬 {o.customer?.whatsapp}
                          </a>
                        </td>

                        <td className="p-4 text-center font-mono font-bold text-slate-800">
                          {o.products.map((p) => p.id).join(", ")}
                        </td>

                        <td className="p-4 text-center text-slate-600">
                          <span className="font-bold text-slate-900">{o.shippingCourier}</span>
                          <span className="text-[11px] text-slate-500 block">{o.shippingService}</span>
                        </td>

                        <td className="p-4 text-center font-mono">
                          {o.trackingNo ? (
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-200 text-[11px]">
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
                            <span className="text-[11px] text-amber-700 font-mono font-bold block">
                              DP: Rp {o.dpAmount.toLocaleString("id-ID")}
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <select
                              value={o.status}
                              onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                              className="bg-slate-50 text-slate-800 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold focus:outline-none focus:border-blue-600"
                            >
                              <option value="Keep">Keep</option>
                              <option value="DP">DP</option>
                              <option value="Siap_Packing">Siap Packing</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>

                            {isDpAging && (
                              <span className="bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                ⏱️ &gt;24h
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-4 text-center">
                          <TableActionsMenu
                            items={[
                              {
                                label: o.trackingNo ? "Edit Resi" : "Input Resi",
                                icon: "local_shipping",
                                onClick: () => {
                                  setEditingResiOrder(o);
                                  setTrackingNoInput(o.trackingNo || "");
                                },
                              },
                              {
                                label: "Set Lunas (Siap Packing)",
                                icon: "task_alt",
                                onClick: () => updateOrderStatus(o.id, "Siap_Packing"),
                                disabled: o.status === "Siap_Packing" || o.status === "Shipped",
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

      {/* Modal Input Nomor Resi */}
      {editingResiOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Input / Update Nomor Resi
            </h3>
            <p className="text-xs text-slate-500">
              Order ID: <code className="text-blue-600 font-mono font-bold">#{editingResiOrder.id.slice(0, 8)}</code>
            </p>

            <form onSubmit={handleSaveResi} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nomor Resi Pengiriman</label>
                <input
                  type="text"
                  value={trackingNoInput}
                  onChange={(e) => setTrackingNoInput(e.target.value)}
                  placeholder="Misal: JNE1234567890"
                  required
                  className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-mono uppercase"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingResiOrder(null)}
                  className="w-1/2 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingResi}
                  className="w-1/2 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all"
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
