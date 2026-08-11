"use client";

import { useState, useEffect } from "react";

interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  addressDetail: string;
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

export default function PembekuanPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [actionOrder, setActionOrder] = useState<Order | null>(null);
  const [modalType, setModalType] = useState<"settle" | "forfeit" | "dp" | null>(null);

  const [dpInput, setDpInput] = useState(50000);
  const [reasonInput, setReasonInput] = useState("Batas waktu DP habis / Hit & Run");
  const [processing, setProcessing] = useState(false);

  const fetchDpOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (data.success) {
        const dpList = (data.data as Order[]).filter(
          (o) => o.status === "DP" || o.status === "Keep" || o.dpAmount > 0
        );
        setOrders(dpList);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDpOrders();
  }, []);

  const handleSettle = async () => {
    if (!actionOrder) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/orders/${actionOrder.id}/settle`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setActionOrder(null);
        setModalType(null);
        fetchDpOrders();
      } else {
        alert(data.error || "Gagal memproses pelunasan.");
      }
    } catch {
      alert("Terjadi kesalahan.");
    } finally {
      setProcessing(false);
    }
  };

  const handleForfeit = async () => {
    if (!actionOrder) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/orders/${actionOrder.id}/forfeit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reasonInput }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setActionOrder(null);
        setModalType(null);
        fetchDpOrders();
      } else {
        alert(data.error || "Gagal menghanguskan DP.");
      }
    } catch {
      alert("Terjadi kesalahan.");
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveDp = async () => {
    if (!actionOrder) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/orders/${actionOrder.id}/dp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dpAmount: dpInput }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setActionOrder(null);
        setModalType(null);
        fetchDpOrders();
      } else {
        alert(data.error || "Gagal mencatat DP.");
      }
    } catch {
      alert("Terjadi kesalahan.");
    } finally {
      setProcessing(false);
    }
  };

  const getDaysElapsed = (dateStr?: string | null) => {
    if (!dateStr) return 0;
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const activeDpOrders = orders.filter((o) => o.status === "DP" && !o.dpForfeited);
  const totalFrozenDP = activeDpOrders.reduce((sum, o) => sum + o.dpAmount, 0);

  return (
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#f7f9fb]">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full px-6 h-16 bg-white border-b border-slate-200 z-30 sticky top-0 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-blue-700 tracking-tight">Pembekuan (DP Monitor)</h1>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 bg-[#f7f9fb] w-full pb-8 space-y-6">
        
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1">
            <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Total Dana Dibekukan</span>
            <p className="text-3xl font-bold text-amber-600 font-mono">
              Rp {totalFrozenDP.toLocaleString("id-ID")}
            </p>
            <p className="text-xs text-slate-500">{activeDpOrders.length} transaksi berstatus DP aktif</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1">
            <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">DP Aging Warning (&gt;3 Hari)</span>
            <p className="text-3xl font-bold text-rose-600 font-mono">
              {activeDpOrders.filter((o) => getDaysElapsed(o.dpDate || o.createdAt) >= 3).length} Order
            </p>
            <p className="text-xs text-rose-600 font-semibold">Perlu di-follow up atau dihanguskan</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1">
            <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Barang Terikat Keep/DP</span>
            <p className="text-3xl font-bold text-slate-900 font-mono">
              {activeDpOrders.reduce((sum, o) => sum + o.products.length, 0)} Tas
            </p>
            <p className="text-xs text-slate-500">Status produk otomatis Booked</p>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">Loading data pembekuan dana...</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              Tidak ada transaksi pembekuan dana (DP/Keep) aktif.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Order ID</th>
                    <th className="p-4">Pelanggan</th>
                    <th className="p-4">Barang</th>
                    <th className="p-4">Total Tagihan</th>
                    <th className="p-4">DP Dibayar</th>
                    <th className="p-4">Sisa Tagihan</th>
                    <th className="p-4">Usia DP</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {orders.map((o) => {
                    const days = getDaysElapsed(o.dpDate || o.createdAt);
                    const sisa = o.totalPrice - o.dpAmount;
                    const isOld = days >= 3 && o.status === "DP";

                    return (
                      <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-mono font-bold text-blue-600">#{o.id.slice(0, 8)}</td>
                        <td className="p-4 font-bold text-slate-900">
                          {o.customer?.name}
                          <br />
                          <span className="text-[11px] text-slate-500 font-mono">{o.customer?.whatsapp}</span>
                        </td>
                        <td className="p-4">{o.products.map((p) => p.id).join(", ")}</td>
                        <td className="p-4 font-mono font-bold text-slate-900">
                          Rp {o.totalPrice.toLocaleString("id-ID")}
                        </td>
                        <td className="p-4 font-mono font-bold text-blue-600">
                          Rp {o.dpAmount.toLocaleString("id-ID")}
                        </td>
                        <td className="p-4 font-mono font-bold text-amber-600">
                          Rp {sisa.toLocaleString("id-ID")}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                              isOld
                                ? "bg-rose-100 text-rose-700 border border-rose-200 animate-pulse"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            ⏱️ {days} Hari
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded font-bold uppercase text-[10px] ${
                              o.dpForfeited
                                ? "bg-rose-100 text-rose-700 border border-rose-200"
                                : o.status === "DP"
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {o.dpForfeited ? "DP Hangus" : o.status}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {o.status !== "Cancelled" && !o.dpForfeited && (
                            <>
                              {o.dpAmount === 0 && (
                                <button
                                  onClick={() => {
                                    setActionOrder(o);
                                    setModalType("dp");
                                    setDpInput(50000);
                                  }}
                                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-all"
                                >
                                  🔒 Input DP
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setActionOrder(o);
                                  setModalType("settle");
                                }}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all"
                              >
                                ✅ Pelunasan
                              </button>

                              <button
                                onClick={() => {
                                  setActionOrder(o);
                                  setModalType("forfeit");
                                  setReasonInput("Batas waktu DP habis / Hit & Run");
                                }}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg text-xs transition-all"
                              >
                                🔥 Hanguskan DP
                              </button>
                            </>
                          )}
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

      {/* Modal Actions */}
      {actionOrder && modalType === "settle" && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
              Konfirmasi Pelunasan Order
            </h3>
            <p className="text-xs text-slate-600">
              Pelanggan <strong>{actionOrder.customer?.name}</strong> melunasi sisa tagihan sebesar:
            </p>
            <p className="text-2xl font-bold text-emerald-600 font-mono">
              Rp {(actionOrder.totalPrice - actionOrder.dpAmount).toLocaleString("id-ID")}
            </p>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActionOrder(null)}
                className="w-1/2 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSettle}
                disabled={processing}
                className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all"
              >
                {processing ? "Memproses..." : "Konfirmasi Pelunasan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {actionOrder && modalType === "forfeit" && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-rose-600 border-b border-slate-100 pb-2">
              🔥 Hanguskan (Forfeit) DP
            </h3>
            <p className="text-xs text-slate-600">
              Hanguskan DP <strong>Rp {actionOrder.dpAmount.toLocaleString("id-ID")}</strong> untuk <strong>{actionOrder.customer?.name}</strong>?
            </p>

            <div>
              <label className="block text-[11px] text-slate-500 font-semibold mb-1">Alasan</label>
              <input
                type="text"
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                className="w-full bg-slate-50 text-slate-900 text-xs p-2 rounded-lg border border-slate-300"
              />
            </div>

            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActionOrder(null)}
                className="w-1/2 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleForfeit}
                disabled={processing}
                className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-all"
              >
                {processing ? "Memproses..." : "Hanguskan DP"}
              </button>
            </div>
          </div>
        </div>
      )}

      {actionOrder && modalType === "dp" && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              Catat Pembekuan DP
            </h3>
            <div className="text-xs space-y-2">
              <label className="block text-slate-600 font-semibold">Nominal DP (Rp)</label>
              <input
                type="number"
                value={dpInput}
                onChange={(e) => setDpInput(Number(e.target.value))}
                className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 font-mono text-sm"
              />
            </div>

            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActionOrder(null)}
                className="w-1/2 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveDp}
                disabled={processing}
                className="w-1/2 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-all"
              >
                {processing ? "Simpan..." : "Simpan DP"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
