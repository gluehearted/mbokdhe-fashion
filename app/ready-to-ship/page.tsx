"use client";

import { useState, useEffect, useCallback } from "react";
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
  totalPrice: number;
  trackingNo?: string | null;
  createdAt: string;
  products: Product[];
}

function formatWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, "");
  
  if (cleaned.startsWith("0")) {
    // Jika diawali 0, ganti jadi 62
    cleaned = "62" + cleaned.slice(1);
  } else if (cleaned.startsWith("8")) {
    // Jika admin lupa ketik 0 dan langsung angka 8, tambahkan 62 di depan
    cleaned = "62" + cleaned;
  }
  
  return cleaned;
}

function generateShippingTemplate(o: Order): string {
  const c = o.customer;
  if (!c) return "";

  const wa = formatWhatsAppNumber(c.whatsapp);
  const rawAddress = c.addressDetail ? c.addressDetail.trim() : "";
  const rawDomisili = c.domisili ? c.domisili.trim() : "";

  return `Nama: ${c.name}
No. WA: ${wa}
Alamat: ${rawAddress.toUpperCase()}
DOMISILI / KOTA: ${rawDomisili.toUpperCase()} (${rawDomisili})
Ekspedisi: ${o.shippingCourier || "JNE"}`;
}

export default function ReadyToShipPage() {
  const { showToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [editingResiOrder, setEditingResiOrder] = useState<Order | null>(null);
  const [trackingNoInput, setTrackingNoInput] = useState("");
  const [savingResi, setSavingResi] = useState(false);

  const fetchReadyOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (data.success) {
        // Filter orders that are ready to ship: ONLY Siap Kirim (or legacy Siap Packing)
        const ready = data.data.filter(
          (o: Order) =>
            o.status === "Siap Kirim" ||
            o.status === "Siap Packing" ||
            o.status === "Siap_Kirim"
        );
        setOrders(ready);
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
        await fetchReadyOrders();
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [fetchReadyOrders]);

  const handleCopyTemplate = (o: Order) => {
    const text = generateShippingTemplate(o);
    navigator.clipboard.writeText(text);
    showToast(`Template label pengiriman '${o.customer?.name}' berhasil disalin ke clipboard!`, "success");
  };

  const handleSendWhatsApp = (o: Order) => {
    if (!o.customer) return;
    const waPhone = formatWhatsAppNumber(o.customer.whatsapp);
    const template = generateShippingTemplate(o);
    const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(template)}`;
    window.open(waUrl, "_blank");
    showToast(`Membuka WhatsApp Web untuk '${o.customer.name}'...`, "info");
  };

  const handleSaveResiAndShip = async (e: React.FormEvent) => {
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
        showToast(`Pesanan #${editingResiOrder.id.slice(0, 8)} berhasil ditandai 'Dikirim' dengan Resi ${trackingNoInput}.`, "success");
        setEditingResiOrder(null);
        fetchReadyOrders();
      } else {
        showToast(data.error || "Gagal memperbarui status pengiriman.", "error");
      }
    } catch {
      showToast("Terjadi kesalahan koneksi.", "error");
    } finally {
      setSavingResi(false);
    }
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.name.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.whatsapp.includes(search)
  );

  return (
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#f8fafc] dark:bg-slate-950 transition-colors">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full px-6 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30 sticky top-0 shrink-0 transition-colors">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-blue-700 dark:text-blue-400 tracking-tight">
            Rekap Pesanan Perlu Dikirim ({filteredOrders.length})
          </h1>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 bg-[#f8fafc] dark:bg-slate-950 w-full pb-8 space-y-6">

        {/* Search Bar & Banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="space-y-0.5">
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Rekapitulasi Pesanan Belum Dikirim (Sudah DP / Lunas)
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              Klik &quot;Salin Label&quot; atau &quot;Kirim WA&quot; untuk mengirimkan detail alamat pengiriman ke pelanggan.
            </p>
          </div>

          <input
            type="text"
            placeholder="Cari nama, WA, ID order..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-xs px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 focus:border-blue-600 focus:outline-none font-mono"
          />
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-sm">Loading pesanan siap dikirim...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-slate-500 dark:text-slate-400 text-sm shadow-sm">
            Tidak ada pesanan yang perlu dikirim saat ini. Semua pesanan sudah terkirim!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredOrders.map((o) => {
              const labelText = generateShippingTemplate(o);

              return (
                <div
                  key={o.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:border-blue-300 transition-all"
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                    <div>
                      <span className="font-mono text-base font-extrabold text-blue-700">
                        #{o.id.slice(0, 8)}
                      </span>
                      <p className="text-xs text-slate-500 font-medium">
                        Pelanggan: <strong className="text-slate-900">{o.customer?.name}</strong>
                      </p>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase shadow-sm ${
                        o.status === "Siap Kirim" || o.status === "Siap Packing"
                          ? "bg-blue-600 text-white"
                          : "bg-blue-100 text-blue-800 border border-blue-300"
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>

                  {/* Template Shipping Box Preview */}
                  <div className="space-y-1.5">
                    <pre className="bg-slate-50 text-slate-900 font-mono text-[11px] p-3.5 rounded-xl whitespace-pre-wrap leading-relaxed border border-slate-200 shadow-sm">
                      {labelText}
                    </pre>
                  </div>

                  {/* Product Summary */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>Rincian Produk ({o.products.length} Tas):</span>
                      <span className="font-mono text-blue-700">Rp {o.totalPrice.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {o.products.map((p) => (
                        <span key={p.id} className="bg-blue-50 text-blue-900 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
                          #{p.id}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleCopyTemplate(o)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-colors border border-slate-300 flex items-center justify-center gap-1"
                    >
                      <span>Salin Label</span>
                    </button>

                    <button
                      onClick={() => handleSendWhatsApp(o)}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1"
                    >
                      <span>Kirim WA ke Customer</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingResiOrder(o);
                        setTrackingNoInput(o.trackingNo || "");
                      }}
                      className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs rounded-lg transition-colors border border-blue-200"
                    >
                      + Input Resi & Tandai Dikirim
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Input Resi */}
      {editingResiOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Input Resi & Tandai Pesanan Dikirim
            </h3>

            <form onSubmit={handleSaveResiAndShip} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 font-mono">
                <p className="font-bold text-blue-700">Order ID: #{editingResiOrder.id.slice(0, 8)}</p>
                <p className="text-slate-700">Pelanggan: {editingResiOrder.customer?.name}</p>
                <p className="text-slate-500 text-[11px]">Ekspedisi: {editingResiOrder.shippingCourier || "JNE"}</p>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nomor Resi Pengiriman *</label>
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
                  {savingResi ? "Menyimpan..." : "Tandai Dikirim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
