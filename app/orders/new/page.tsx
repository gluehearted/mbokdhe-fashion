"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ToastProvider";

interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  domisili?: string | null;
  shippingCost: number;
  courier?: string | null;
  addressDetail: string;
}

interface Product {
  id: string;
  shopOrigin: string;
  capitalPrice?: number;
  price: number;
  status: string;
  photoUrl: string;
}

const AVAILABLE_COURIERS = [
  { code: "JNE", label: "JNE" },
  { code: "SiCepat", label: "SiCepat" },
  { code: "J&T", label: "J&T Express" },
  { code: "TIKI", label: "TIKI" },
  { code: "POS", label: "POS Indonesia" },
  { code: "IDExpress", label: "IDExpress" },
  { code: "Ninja", label: "Ninja Express" },
  { code: "Wahana", label: "Wahana" },
  { code: "Lion", label: "Lion Parcel" },
];

export default function NewOrderPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  
  // Per-product pricing and individual discounts
  const [customPrices, setCustomPrices] = useState<Record<string, string>>({});
  const [individualDiscounts, setIndividualDiscounts] = useState<Record<string, string>>({});

  const [orderStatus, setOrderStatus] = useState("");
  const [dpAmountInput, setDpAmountInput] = useState<string>("");

  const [selectedCourier, setSelectedCourier] = useState("");
  const [manualShippingCost, setManualShippingCost] = useState<string>("");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoadingData(true);
      try {
        const [resCust, resProd] = await Promise.all([
          fetch("/api/customers"),
          fetch("/api/products?status=Tersedia"),
        ]);
        const dataCust = await resCust.json();
        const dataProd = await resProd.json();

        if (dataCust.success) setCustomers(dataCust.data);
        if (dataProd.success) setAvailableProducts(dataProd.data);
      } catch {
        // Ignore
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, []);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const handleCustomerChange = (cId: string) => {
    setSelectedCustomerId(cId);
    const target = customers.find((c) => c.id === cId);
    if (target) {
      if (target.courier) setSelectedCourier(target.courier);
      if (target.shippingCost !== undefined && target.shippingCost !== null) {
        setManualShippingCost(String(target.shippingCost));
      }
    }
  };

  const selectedProducts = availableProducts.filter((p) => selectedProductIds.includes(p.id));

  // Calculations for total pricing and individual discounts
  const totalNormalBarangPrice = selectedProducts.reduce((sum, p) => sum + p.price, 0);

  const totalIndividualDiscount = selectedProducts.reduce((sum, p) => {
    const discStr = individualDiscounts[p.id];
    const discVal = discStr !== undefined && discStr !== "" ? (parseInt(discStr, 10) || 0) : 0;
    return sum + discVal;
  }, 0);

  const totalBarangPriceAfterDiscount = selectedProducts.reduce((sum, p) => {
    const customStr = customPrices[p.id];
    const priceVal = customStr !== undefined && customStr !== "" ? (parseInt(customStr, 10) || 0) : p.price;
    return sum + priceVal;
  }, 0);

  const toggleProductSelect = (p: Product) => {
    const id = p.id;
    setSelectedProductIds((prev) => {
      const exists = prev.includes(id);
      if (exists) {
        return prev.filter((pId) => pId !== id);
      } else {
        if (customPrices[id] === undefined) {
          setCustomPrices((prevPrices) => ({
            ...prevPrices,
            [id]: String(p.price),
          }));
        }
        if (individualDiscounts[id] === undefined) {
          setIndividualDiscounts((prevDisc) => ({
            ...prevDisc,
            [id]: "",
          }));
        }
        return [...prev, id];
      }
    });
  };

  // Handler when user edits the discount amount for a specific bag
  const handleDiscountChange = (p: Product, val: string) => {
    const discVal = parseInt(val, 10) || 0;
    const newFinalPrice = Math.max(0, p.price - discVal);

    setIndividualDiscounts((prev) => ({
      ...prev,
      [p.id]: val,
    }));

    setCustomPrices((prev) => ({
      ...prev,
      [p.id]: String(newFinalPrice),
    }));
  };

  // Handler when user directly edits the final item price for a specific bag
  const handleCustomPriceChange = (p: Product, val: string) => {
    const finalVal = parseInt(val, 10) || 0;
    const calculatedDisc = Math.max(0, p.price - finalVal);

    setCustomPrices((prev) => ({
      ...prev,
      [p.id]: val,
    }));

    setIndividualDiscounts((prev) => ({
      ...prev,
      [p.id]: String(calculatedDisc),
    }));
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setErrorMessage("Pilih pelanggan terlebih dahulu.");
      showToast("Pilih pelanggan terlebih dahulu.", "error");
      return;
    }

    if (selectedProductIds.length === 0) {
      setErrorMessage("Pilih minimal 1 produk tas.");
      showToast("Pilih minimal 1 produk tas.", "error");
      return;
    }

    const parsedCost = parseInt(manualShippingCost, 10) || 0;
    const parsedDp = parseInt(dpAmountInput, 10) || 0;

    const formattedCustomPrices: Record<string, number> = {};
    selectedProductIds.forEach((pId) => {
      const priceStr = customPrices[pId];
      if (priceStr !== undefined && priceStr !== "") {
        formattedCustomPrices[pId] = parseInt(priceStr, 10) || 0;
      }
    });

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const finalStatus = parsedDp > 0 ? "DP" : (orderStatus || "Menunggu");

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          productIds: selectedProductIds,
          customPrices: formattedCustomPrices,
          status: finalStatus,
          shippingCourier: selectedCourier || "JNE",
          shippingService: "Reguler",
          shippingCost: parsedCost,
          totalWeightGram: 1000,
          dpAmount: parsedDp,
          totalPrice: totalBarangPriceAfterDiscount + parsedCost,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Gagal menyimpan pesanan.");
        showToast(data.error || "Gagal menyimpan pesanan.", "error");
      } else {
        showToast(`Pesanan baru berhasil dibuat! ID: #${data.data.id.slice(0, 8)}`, "success");
        router.push("/orders");
      }
    } catch {
      setErrorMessage("Terjadi kesalahan koneksi.");
      showToast("Terjadi kesalahan koneksi.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const parsedCostNum = parseInt(manualShippingCost, 10) || 0;
  const totalTagihan = totalBarangPriceAfterDiscount + parsedCostNum;

  return (
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#f8fafc]">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full px-6 h-16 bg-white border-b border-slate-200 z-30 sticky top-0 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-blue-700 tracking-tight">Buat Pesanan Baru (Checkout Admin)</h1>
        </div>
        <Link
          href="/orders"
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors border border-slate-200"
        >
          ← Kembali ke Pesanan
        </Link>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 bg-[#f8fafc] w-full pb-8">
        {errorMessage && (
          <div className="mb-4 p-4 bg-slate-100 border border-slate-300 rounded-xl text-blue-900 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        {loadingData ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading data inventaris & pelanggan...</div>
        ) : (
          <form onSubmit={handleCreateOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl mx-auto">
            
            {/* LEFT COLUMN (7 cols) */}
            <div className="lg:col-span-7 space-y-6">

              {/* Step 1: Select Customer */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    1. Pilih Pelanggan Tujuan
                  </h3>
                  <Link
                    href="/customers?action=new"
                    className="text-xs text-blue-600 font-bold hover:underline"
                  >
                    + Tambah Pelanggan Baru
                  </Link>
                </div>

                <div>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    required
                    className="w-full bg-slate-50 text-slate-900 text-xs p-3 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-medium uppercase"
                  >
                    <option value="">-- Pilih Pelanggan Terdaftar --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.id} - {c.name} ({c.whatsapp}) - {c.domisili || "Domisili"}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCustomer && (
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-blue-700">Detail Pelanggan:</span>
                      <span className="font-mono text-xs font-bold text-blue-600">#{selectedCustomer.id}</span>
                    </div>
                    <p className="font-semibold text-slate-900">{selectedCustomer.name} (WA: {selectedCustomer.whatsapp})</p>
                    <p className="text-slate-600">{selectedCustomer.addressDetail}, {selectedCustomer.domisili || "-"}</p>
                    <div className="pt-1 flex items-center gap-2 font-mono text-[11px] text-slate-500">
                      <span>Ekspedisi Default: <strong className="text-blue-700">{selectedCustomer.courier || "JNE"}</strong></span>
                      <span>•</span>
                      <span>Ongkir Default: <strong className="text-slate-900">Rp {(selectedCustomer.shippingCost || 0).toLocaleString("id-ID")}</strong></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Multi-Select Available Products & Per-Bag Individual Discounts */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex justify-between items-center">
                  <span>2. Pilih Tas & Atur Diskon Individual per Tas</span>
                  <span className="text-xs text-blue-600 font-mono font-bold">
                    {selectedProductIds.length} Tas Terpilih
                  </span>
                </h3>

                {availableProducts.length === 0 ? (
                  <p className="text-slate-500 text-xs py-4 text-center">
                    Tidak ada tas berstatus &apos;Tersedia&apos; saat ini.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {availableProducts.map((p) => {
                      const isSelected = selectedProductIds.includes(p.id);
                      const currentDiscount = individualDiscounts[p.id] !== undefined ? individualDiscounts[p.id] : "";
                      const currentPrice = customPrices[p.id] !== undefined ? customPrices[p.id] : String(p.price);

                      const discVal = parseInt(currentDiscount, 10) || 0;

                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleProductSelect(p)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all text-xs ${
                            isSelected
                              ? "bg-blue-50/70 border-blue-600 text-blue-900 shadow-sm"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="accent-blue-600 w-4 h-4"
                              />
                              <div>
                                <span className="font-extrabold text-blue-700 font-mono text-sm">#{p.id}</span>
                                <span className="text-slate-500 text-xs font-semibold ml-3">Harga Normal: Rp {p.price.toLocaleString("id-ID")}</span>
                              </div>
                            </div>

                            {!isSelected && (
                              <span className="font-bold text-slate-900 font-mono">
                                Rp {p.price.toLocaleString("id-ID")}
                              </span>
                            )}
                          </div>

                          {/* Individual Discount Controls per Bag */}
                          {isSelected && (
                            <div
                              className="mt-3 pt-3 border-t border-blue-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Input Diskon Individual (Rp) */}
                              <div>
                                <label className="block text-[11px] font-bold text-blue-800 mb-1">
                                  Diskon Tas Ini (Rp):
                                </label>
                                <div className="flex items-center gap-1 bg-white px-2.5 py-1.5 rounded-lg border border-blue-400 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20">
                                  <span className="font-mono text-xs font-bold text-slate-400">Rp</span>
                                  <input
                                    type="number"
                                    value={currentDiscount}
                                    onChange={(e) => handleDiscountChange(p, e.target.value)}
                                    className="w-full text-right font-mono font-bold text-xs text-blue-900 focus:outline-none"
                                    placeholder="Contoh: 10000"
                                  />
                                </div>
                              </div>

                              {/* Input Harga Akhir (Rp) */}
                              <div>
                                <label className="block text-[11px] font-bold text-blue-800 mb-1">
                                  Harga Akhir Setelah Diskon (Rp):
                                </label>
                                <div className="flex items-center gap-1 bg-white px-2.5 py-1.5 rounded-lg border border-blue-400 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20">
                                  <span className="font-mono text-xs font-bold text-slate-400">Rp</span>
                                  <input
                                    type="number"
                                    value={currentPrice}
                                    onChange={(e) => handleCustomPriceChange(p, e.target.value)}
                                    className="w-full text-right font-mono font-bold text-xs text-blue-900 focus:outline-none"
                                    placeholder={String(p.price)}
                                  />
                                </div>
                              </div>

                              {/* Individual Discount Badge Notice */}
                              {discVal > 0 && (
                                <div className="sm:col-span-2 p-2 bg-blue-100 border border-blue-300 rounded-lg text-[11px] font-mono font-bold text-blue-900 flex justify-between items-center">
                                  <span>Potongan Diskon Tas:</span>
                                  <span>-Rp {discVal.toLocaleString("id-ID")}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 3: Input Ekspedisi & Nominal Ongkos Kirim */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                  3. Ekspedisi & Nominal Ongkos Kirim
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1.5">Pilih Ekspedisi Pengiriman</label>
                    <select
                      value={selectedCourier}
                      onChange={(e) => setSelectedCourier(e.target.value)}
                      className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 font-medium focus:border-blue-600 focus:outline-none"
                    >
                      <option value="">-- Pilih Ekspedisi --</option>
                      {AVAILABLE_COURIERS.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1.5">Nominal Ongkos Kirim (Rp)</label>
                    <input
                      type="number"
                      value={manualShippingCost}
                      onChange={(e) => setManualShippingCost(e.target.value)}
                      placeholder="Contoh: 15000"
                      required
                      className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 font-mono text-sm font-bold focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN (5 cols) */}
            <div className="lg:col-span-5 space-y-6">

              {/* Status & DP */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm text-xs">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                  Status Pesanan & DP
                </h3>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Status Awal Pesanan</label>
                  <select
                    value={orderStatus}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOrderStatus(val);
                      if (val !== "DP") {
                        setDpAmountInput("");
                      }
                    }}
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 font-semibold"
                  >
                    <option value="">-- Pilih Status Awal Pesanan --</option>
                    <option value="Menunggu">Menunggu Pembayaran</option>
                    <option value="DP">DP (Pembekuan Dana)</option>
                    <option value="Siap Packing">Siap Packing (Lunas)</option>
                  </select>
                </div>

                {orderStatus === "DP" && (
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Nominal DP (Rp) *</label>
                    <input
                      type="number"
                      value={dpAmountInput}
                      onChange={(e) => setDpAmountInput(e.target.value)}
                      placeholder="Contoh: 50000"
                      required
                      className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 font-mono text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Summary Tagihan with Individual Discount Breakdown */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm text-xs">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                  Ringkasan Tagihan Order
                </h3>

                <div className="space-y-3 font-mono">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Total Normal Barang ({selectedProductIds.length} Tas):</span>
                    <span className="text-slate-900 font-bold">
                      Rp {totalNormalBarangPrice.toLocaleString("id-ID")}
                    </span>
                  </div>

                  {totalIndividualDiscount > 0 && (
                    <div className="flex justify-between items-center text-blue-700 font-bold">
                      <span>Total Diskon Barang:</span>
                      <span>-Rp {totalIndividualDiscount.toLocaleString("id-ID")}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-slate-700 font-bold border-t border-slate-100 pt-2">
                    <span>Subtotal Barang Setelah Diskon:</span>
                    <span>Rp {totalBarangPriceAfterDiscount.toLocaleString("id-ID")}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span>Ongkos Kirim ({selectedCourier || "Ekspedisi"}):</span>
                    <span className="text-blue-700 font-bold">
                      Rp {parsedCostNum.toLocaleString("id-ID")}
                    </span>
                  </div>

                  <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-900 font-sans">Total Tagihan:</span>
                    <span className="font-bold text-blue-700 text-xl">
                      Rp {totalTagihan.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-all text-sm disabled:opacity-50"
                >
                  {submitting ? "Memproses Pesanan..." : "SIMPAN PESANAN"}
                </button>
              </div>

            </div>

          </form>
        )}
      </div>
    </div>
  );
}
