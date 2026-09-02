"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  description?: string | null;
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
    cleaned = "62" + cleaned.slice(1);
  } else if (cleaned.startsWith("8")) {
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
  const [courierFilter, setCourierFilter] = useState("ALL");

  const [editingResiOrder, setEditingResiOrder] = useState<Order | null>(null);
  const [trackingNoInput, setTrackingNoInput] = useState("");
  const [savingResi, setSavingResi] = useState(false);

  const fetchReadyOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (data.success) {
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
    showToast(`Template label pengiriman '${o.customer?.name}' berhasil disalin!`, "success");
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

  const availableCouriers = useMemo(() => {
    const list = Array.from(new Set(orders.map((o) => o.shippingCourier || "JNE"))).filter(Boolean);
    return list;
  }, [orders]);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.name.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.whatsapp.includes(search);

    const courier = o.shippingCourier || "JNE";
    const matchesCourier = courierFilter === "ALL" || courier.toLowerCase() === courierFilter.toLowerCase();

    return matchesSearch && matchesCourier;
  });

  return (
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#fbfbfa] dark:bg-[#0c0d0f] text-[#111111] dark:text-[#f3f3f3] font-ui transition-colors duration-200">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full pl-14 pr-4 md:px-6 h-16 bg-white dark:bg-[#141517] border-b border-[#eaeaea] dark:border-slate-800/80 z-30 sticky top-0 shrink-0 transition-colors">
        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-[#111111] dark:text-[#f3f3f3] tracking-tight uppercase font-technical">
            Rekap Pesanan Perlu Dikirim ({filteredOrders.length})
          </h1>
          <span className="text-[10px] text-[#787774] dark:text-slate-400 font-technical uppercase mt-0.5 tracking-wider">
            [ Shipping Queue ]
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-3.5 sm:p-6 bg-[#fbfbfa] dark:bg-[#0c0d0f] w-full pb-8 space-y-4 sm:space-y-6">

        {/* Filter Ekspedisi & Search Bar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 p-3.5 sm:p-5 rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          {/* Ekspedisi Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-1">
            <button
              onClick={() => setCourierFilter("ALL")}
              className={`px-3.5 py-1.5 rounded-[6px] text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                courierFilter === "ALL"
                  ? "bg-[#111111] text-white dark:bg-[#f3f3f3] dark:text-[#111111] font-bold"
                  : "bg-[#f5f5f5] dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-[#eaeaea] dark:border-slate-800"
              }`}
            >
              <span>Semua Ekspedisi</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-technical ${courierFilter === "ALL" ? "bg-white/20 text-white dark:bg-black/20 dark:text-[#111111]" : "bg-black/5 dark:bg-white/10"}`}>
                {orders.length}
              </span>
            </button>

            {availableCouriers.map((c) => {
              const count = orders.filter((o) => (o.shippingCourier || "JNE").toLowerCase() === c.toLowerCase()).length;
              return (
                <button
                  key={c}
                  onClick={() => setCourierFilter(c)}
                  className={`px-3.5 py-1.5 rounded-[6px] text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    courierFilter.toLowerCase() === c.toLowerCase()
                      ? "bg-[#111111] text-white dark:bg-[#f3f3f3] dark:text-[#111111] font-bold"
                      : "bg-[#f5f5f5] dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-[#eaeaea] dark:border-slate-800"
                  }`}
                >
                  <span>{c}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-technical ${courierFilter.toLowerCase() === c.toLowerCase() ? "bg-white/20 text-white dark:bg-black/20 dark:text-[#111111]" : "bg-black/5 dark:bg-white/10"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <input
            type="text"
            placeholder="Cari ID pesanan, nama, WA..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs px-3.5 py-2 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-technical"
          />
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs font-technical uppercase">[ Loading pesanan siap dikirim... ]</div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] p-12 text-center text-slate-400 dark:text-slate-500 text-xs font-technical uppercase">
            Tidak ada pesanan yang perlu dikirim saat ini. Semua pesanan sudah terkirim!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredOrders.map((o) => {
              const labelText = generateShippingTemplate(o);

              return (
                <div
                  key={o.id}
                  className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:-translate-y-0.5 transition-all duration-200 space-y-4 flex flex-col justify-between"
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-start border-b border-[#eaeaea] dark:border-slate-800/80 pb-3">
                    <div>
                      <span className="font-technical text-xs font-bold text-[#111111] dark:text-[#f3f3f3] block">
                        ORDER ID: #{o.id.slice(0, 8).toUpperCase()}
                      </span>
                      <p className="text-xs text-[#787774] dark:text-slate-400 font-medium mt-0.5">
                        Pelanggan: <strong className="text-[#111111] dark:text-white font-semibold">{o.customer?.name}</strong>
                      </p>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#111111] text-white dark:bg-white dark:text-[#111111]">
                      {o.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Template Shipping Box Preview */}
                  <div className="space-y-1.5">
                    <pre className="bg-[#fbfbfa] dark:bg-[#1c1d1f] text-[#111111] dark:text-[#f3f3f3] font-technical text-[10px] p-3.5 rounded-[6px] whitespace-pre-wrap leading-relaxed border border-[#eaeaea] dark:border-slate-800">
                      {labelText}
                    </pre>
                  </div>

                  {/* Product Summary */}
                  <div className="p-3 bg-[#f5f5f5] dark:bg-[#1c1d1f] border border-[#eaeaea] dark:border-slate-800 rounded-[6px] text-xs space-y-1 font-technical">
                    <div className="flex justify-between font-semibold text-[#111111] dark:text-white">
                      <span>Rincian Produk ({o.products.length} Tas):</span>
                      <span className="font-bold">Rp {o.totalPrice.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {o.products.map((p) => {
                        const desc = p.description?.trim();
                        const displayText = desc || `#${p.id.toUpperCase()}`;
                        return (
                          <span
                            key={p.id}
                            className="bg-white dark:bg-[#141517] text-[#111111] dark:text-white border border-[#eaeaea] dark:border-slate-800 font-technical text-[9px] font-bold px-2 py-0.5 rounded-full"
                            title={`ID: #${p.id.toUpperCase()}${p.shop?.name ? ` | Toko: ${p.shop.name}` : ""}`}
                          >
                            {displayText}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-[#eaeaea] dark:border-slate-800/80">
                    <a
                      href={`my.bluetoothprint.scheme://https://mbokdhe-fashion.vercel.app/api/print-label/${o.id}`}
                      className="flex-1 py-2 bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] rounded-[6px] text-xs font-bold uppercase font-technical cursor-pointer flex items-center justify-center gap-1.5 transition-colors border border-[#111111] dark:border-[#f3f3f3]"
                    >
                      <span>Cetak Label Thermal</span>
                    </a>

                    <button
                      onClick={() => handleCopyTemplate(o)}
                      className="flex-1 py-2 bg-white hover:bg-[#f5f5f5] dark:bg-[#141517] dark:hover:bg-slate-800 text-[#111111] dark:text-[#f3f3f3] font-bold text-xs rounded-[6px] transition-colors border border-[#eaeaea] dark:border-slate-800 flex items-center justify-center gap-1 cursor-pointer font-technical uppercase"
                    >
                      <span>Salin Label</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingResiOrder(o);
                        setTrackingNoInput(o.trackingNo || "");
                      }}
                      className="flex-1 py-2 bg-white hover:bg-[#f5f5f5] dark:bg-[#141517] dark:hover:bg-slate-800 text-[#111111] dark:text-[#f3f3f3] font-bold text-xs rounded-[6px] transition-colors border border-[#eaeaea] dark:border-slate-800 cursor-pointer font-technical uppercase"
                    >
                      Input Resi & Tandai Dikirim
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] max-w-md w-full p-6 space-y-4 shadow-[0_12px_40px_rgba(0,0,0,0.04)] animate-fade-in-up font-ui">
            <h3 className="text-sm font-bold text-[#111111] dark:text-[#f3f3f3] border-b border-[#eaeaea] dark:border-slate-800 pb-3 uppercase font-technical">
              Input Resi & Tandai Dikirim
            </h3>

            <form onSubmit={handleSaveResiAndShip} className="space-y-4 text-xs font-ui">
              <div className="p-3 bg-[#f5f5f5] dark:bg-[#1c1d1f] border border-[#eaeaea] dark:border-slate-800 rounded-[6px] space-y-1 font-technical">
                <p className="font-bold text-[#111111] dark:text-white">Order ID: #{editingResiOrder.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-slate-700 dark:text-slate-300">Pelanggan: {editingResiOrder.customer?.name}</p>
                <p className="text-slate-500 dark:text-slate-400 text-[10px]">Ekspedisi: {editingResiOrder.shippingCourier || "JNE"}</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Nomor Resi Pengiriman *</label>
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
                  className="w-1/2 py-2.5 bg-white hover:bg-[#f5f5f5] dark:bg-[#141517] dark:hover:bg-slate-800 text-[#111111] dark:text-[#f3f3f3] font-bold rounded-[6px] transition-colors border border-[#eaeaea] dark:border-slate-800 cursor-pointer font-technical uppercase"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingResi}
                  className="w-1/2 py-2.5 bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] font-bold rounded-[6px] transition-all disabled:opacity-50 cursor-pointer font-technical uppercase border border-[#111111] dark:border-[#f3f3f3]"
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
