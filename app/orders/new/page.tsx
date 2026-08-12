"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  domisili?: string | null;
  addressDetail: string;
  shippingCost?: number | null;
  courier?: string | null;
}

interface Product {
  id: string;
  price: number;
  capitalPrice?: number | null;
  status: string;
  photoUrl?: string | null;
  description?: string | null;
  shop?: { name: string } | null;
}

const AVAILABLE_COURIERS = [
  { code: "JNE", label: "JNE Express" },
  { code: "J&T", label: "J&T Express" },
  { code: "POS", label: "POS Indonesia" },
  { code: "SiCepat", label: "SiCepat Ekspres" },
  { code: "Ninja", label: "Ninja Xpress" },
  { code: "Lion", label: "Lion Parcel" },
  { code: "ShopeeExpress", label: "Shopee Xpress" },
  { code: "Lainnya", label: "Ekspedisi Lainnya" },
];

export default function NewOrderPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [individualDiscounts, setIndividualDiscounts] = useState<Record<string, string>>({});
  const [customPrices, setCustomPrices] = useState<Record<string, string>>({});

  const [selectedCourier, setSelectedCourier] = useState<string>("");
  const [manualShippingCost, setManualShippingCost] = useState<string>("");
  const [orderStatus, setOrderStatus] = useState<string>("Menunggu");
  const [dpAmountInput, setDpAmountInput] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lightbox Zoom Modal State
  const [zoomProduct, setZoomProduct] = useState<Product | null>(null);

  const fetchInitialData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [custRes, prodRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/products"),
      ]);

      const custData = await custRes.json();
      const prodData = await prodRes.json();

      if (custData.success) {
        setCustomers(custData.data);
      }

      if (prodData.success) {
        const available = prodData.data.filter((p: Product) => p.status === "Tersedia");
        setAvailableProducts(available);
      }
    } catch {
      setErrorMessage("Gagal memuat data pelanggan & produk.");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const found = customers.find((c) => c.id === customerId);
    if (found) {
      if (found.shippingCost !== undefined && found.shippingCost !== null) {
        setManualShippingCost(String(found.shippingCost));
      }
      if (found.courier) {
        setSelectedCourier(found.courier);
      }
    }
  };

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const toggleProductSelect = (product: Product) => {
    if (selectedProductIds.includes(product.id)) {
      setSelectedProductIds((prev) => prev.filter((id) => id !== product.id));
      setIndividualDiscounts((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
      setCustomPrices((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
    } else {
      setSelectedProductIds((prev) => [...prev, product.id]);
      setIndividualDiscounts((prev) => ({
        ...prev,
        [product.id]: "0",
      }));
      setCustomPrices((prev) => ({
        ...prev,
        [product.id]: String(product.price),
      }));
    }
  };

  const handleDiscountChange = (product: Product, rawValue: string) => {
    setIndividualDiscounts((prev) => ({
      ...prev,
      [product.id]: rawValue,
    }));

    const discVal = parseInt(rawValue, 10) || 0;
    const finalPrice = Math.max(0, product.price - discVal);
    setCustomPrices((prev) => ({
      ...prev,
      [product.id]: String(finalPrice),
    }));
  };

  const handleCustomPriceChange = (product: Product, rawValue: string) => {
    setCustomPrices((prev) => ({
      ...prev,
      [product.id]: rawValue,
    }));

    const finalPrice = parseInt(rawValue, 10) || 0;
    const computedDisc = Math.max(0, product.price - finalPrice);
    setIndividualDiscounts((prev) => ({
      ...prev,
      [product.id]: String(computedDisc),
    }));
  };

  const selectedProducts = useMemo(() => {
    return availableProducts.filter((p) => selectedProductIds.includes(p.id));
  }, [availableProducts, selectedProductIds]);

  const totalNormalBarangPrice = useMemo(() => {
    return selectedProducts.reduce((acc, p) => acc + p.price, 0);
  }, [selectedProducts]);

  const totalIndividualDiscount = useMemo(() => {
    return selectedProducts.reduce((acc, p) => {
      const discVal = parseInt(individualDiscounts[p.id] || "0", 10) || 0;
      return acc + discVal;
    }, 0);
  }, [selectedProducts, individualDiscounts]);

  const totalBarangPriceAfterDiscount = useMemo(() => {
    return Math.max(0, totalNormalBarangPrice - totalIndividualDiscount);
  }, [totalNormalBarangPrice, totalIndividualDiscount]);

  const parsedCostNum = parseInt(manualShippingCost, 10) || 0;
  const totalTagihan = totalBarangPriceAfterDiscount + parsedCostNum;

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedCustomerId) {
      setErrorMessage("Silakan pilih pelanggan tujuan.");
      return;
    }

    if (selectedProductIds.length === 0) {
      setErrorMessage("Silakan pilih minimal 1 tas.");
      return;
    }

    if (orderStatus === "DP") {
      const dpVal = parseInt(dpAmountInput, 10) || 0;
      if (dpVal <= 0) {
        setErrorMessage("Nominal DP harus lebih dari Rp 0 jika status 'DP'.");
        return;
      }
    }

    setSubmitting(true);

    try {
      const productsPayload = selectedProducts.map((p) => {
        const discVal = parseInt(individualDiscounts[p.id] || "0", 10) || 0;
        const customPriceVal = parseInt(customPrices[p.id] || String(p.price), 10) || p.price;
        return {
          productId: p.id,
          discount: discVal,
          customPrice: customPriceVal,
        };
      });

      const payload = {
        customerId: selectedCustomerId,
        productIds: selectedProductIds,
        products: productsPayload,
        shippingCost: parsedCostNum,
        courier: selectedCourier || selectedCustomer?.courier || "JNE",
        status: orderStatus,
        dpAmount: orderStatus === "DP" ? parseInt(dpAmountInput, 10) || 0 : 0,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal membuat pesanan baru.");
      }

      router.push("/orders");
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan sistem saat membuat pesanan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#f8fafc] dark:bg-slate-950 transition-colors">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full px-6 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30 sticky top-0 shrink-0 transition-colors">
        <h1 className="text-lg font-bold text-blue-700 dark:text-blue-400 tracking-tight">
          Buat Pesanan Baru (Checkout)
        </h1>
        <Link
          href="/orders"
          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg transition-colors border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-sm"
        >
          ← Kembali ke Data Pesanan
        </Link>
      </header>

      {/* Main Content Scroll Container */}
      <div className="flex-1 overflow-auto p-6 bg-[#f8fafc] dark:bg-slate-950 w-full pb-8 transition-colors">
        {errorMessage && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-red-700 dark:text-red-400 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        {loadingData ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-sm font-medium">Loading data inventaris & pelanggan...</div>
        ) : (
          <form onSubmit={handleCreateOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl mx-auto">
            
            {/* LEFT COLUMN (7 cols) */}
            <div className="lg:col-span-7 space-y-6">

              {/* Step 1: Select Customer */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm transition-colors">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    1. Pilih Pelanggan Tujuan
                  </h3>
                  <Link
                    href="/customers?action=new"
                    className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                  >
                    + Tambah Pelanggan Baru
                  </Link>
                </div>

                <div>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs p-3 rounded-lg border border-slate-300 dark:border-slate-700 focus:border-blue-600 focus:outline-none font-medium uppercase"
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
                  <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 space-y-1 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-blue-700 dark:text-blue-400">Detail Pelanggan:</span>
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">#{selectedCustomer.id}</span>
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-white">{selectedCustomer.name} (WA: {selectedCustomer.whatsapp})</p>
                    <p className="text-slate-600 dark:text-slate-300">{selectedCustomer.addressDetail}, {selectedCustomer.domisili || "-"}</p>
                    <div className="pt-1 flex items-center gap-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Ekspedisi Default: <strong className="text-blue-700 dark:text-blue-400">{selectedCustomer.courier || "JNE"}</strong></span>
                      <span>•</span>
                      <span>Ongkir Default: <strong className="text-slate-900 dark:text-white">Rp {(selectedCustomer.shippingCost || 0).toLocaleString("id-ID")}</strong></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Multi-Select Available Products & Per-Bag Individual Discounts */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm transition-colors">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
                  <span>2. Pilih Tas & Atur Diskon Individual per Tas</span>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-mono font-bold">
                    {selectedProductIds.length} Tas Terpilih
                  </span>
                </h3>

                {availableProducts.length === 0 ? (
                  <p className="text-slate-500 dark:text-slate-400 text-xs py-4 text-center">
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
                              ? "bg-blue-50/70 dark:bg-blue-950/80 border-blue-600 dark:border-blue-500 text-blue-900 dark:text-blue-200 shadow-sm"
                              : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="accent-blue-600 w-4 h-4 shrink-0"
                              />

                              {/* Bag Image Thumbnail & Zoom Trigger */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setZoomProduct(p);
                                }}
                                className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 overflow-hidden relative shrink-0 hover:opacity-85 transition-all shadow-sm group"
                                title="Klik untuk zoom gambar tas secara jelas"
                              >
                                {p.photoUrl && p.photoUrl !== "/uploads/placeholder.jpg" ? (
                                  <Image src={p.photoUrl} alt={p.id} fill sizes="48px" className="object-cover" />
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-300 font-bold text-[10px]">Foto</span>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                                  Zoom
                                </div>
                              </button>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-blue-700 dark:text-blue-400 font-mono text-sm">#{p.id}</span>
                                </div>
                                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold block">Harga Normal: Rp {p.price.toLocaleString("id-ID")}</span>
                                {p.description && (
                                  <span className="text-slate-400 dark:text-slate-300 text-[11px] font-medium block truncate max-w-xs">{p.description}</span>
                                )}
                              </div>
                            </div>

                            {!isSelected && (
                              <span className="font-bold text-slate-900 dark:text-white font-mono">
                                Rp {p.price.toLocaleString("id-ID")}
                              </span>
                            )}
                          </div>

                          {/* Individual Discount Controls per Bag */}
                          {isSelected && (
                            <div
                              className="mt-3 pt-3 border-t border-blue-200/80 dark:border-blue-900/60 grid grid-cols-1 sm:grid-cols-2 gap-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Input Diskon Individual (Rp) */}
                              <div>
                                <label className="block text-[11px] font-bold text-blue-800 dark:text-blue-300 mb-1">
                                  Diskon Tas Ini (Rp):
                                </label>
                                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-blue-400 dark:border-blue-700 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20">
                                  <span className="font-mono text-xs font-bold text-slate-400">Rp</span>
                                  <input
                                    type="number"
                                    value={currentDiscount}
                                    onChange={(e) => handleDiscountChange(p, e.target.value)}
                                    className="w-full text-right font-mono font-bold text-xs text-blue-900 dark:text-white focus:outline-none bg-transparent"
                                    placeholder="Contoh: 10000"
                                  />
                                </div>
                              </div>

                              {/* Input Harga Akhir (Rp) */}
                              <div>
                                <label className="block text-[11px] font-bold text-blue-800 dark:text-blue-300 mb-1">
                                  Harga Akhir Setelah Diskon (Rp):
                                </label>
                                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-blue-400 dark:border-blue-700 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20">
                                  <span className="font-mono text-xs font-bold text-slate-400">Rp</span>
                                  <input
                                    type="number"
                                    value={currentPrice}
                                    onChange={(e) => handleCustomPriceChange(p, e.target.value)}
                                    className="w-full text-right font-mono font-bold text-xs text-blue-900 dark:text-white focus:outline-none bg-transparent"
                                    placeholder={String(p.price)}
                                  />
                                </div>
                              </div>

                              {/* Individual Discount Badge Notice */}
                              {discVal > 0 && (
                                <div className="sm:col-span-2 p-2 bg-blue-100 dark:bg-blue-950/80 border border-blue-300 dark:border-blue-800/60 rounded-lg text-[11px] font-mono font-bold text-blue-900 dark:text-blue-300 flex justify-between items-center">
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
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm transition-colors">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                  3. Ekspedisi & Nominal Ongkos Kirim
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1.5">Pilih Ekspedisi Pengiriman</label>
                    <select
                      value={selectedCourier}
                      onChange={(e) => setSelectedCourier(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 font-medium focus:border-blue-600 focus:outline-none"
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
                    <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1.5">Nominal Ongkos Kirim (Rp)</label>
                    <input
                      type="number"
                      value={manualShippingCost}
                      onChange={(e) => setManualShippingCost(e.target.value)}
                      placeholder="Contoh: 15000"
                      required
                      className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 font-mono text-sm font-bold focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN (5 cols) */}
            <div className="lg:col-span-5 space-y-6">

              {/* Status & DP */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm text-xs transition-colors">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                  Status Pesanan & DP
                </h3>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Status Awal Pesanan</label>
                  <select
                    value={orderStatus}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOrderStatus(val);
                      if (val !== "DP") {
                        setDpAmountInput("");
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold"
                  >
                    <option value="">-- Pilih Status Awal Pesanan --</option>
                    <option value="Menunggu">Menunggu Pembayaran</option>
                    <option value="DP">DP (Pembekuan Dana)</option>
                    <option value="Siap Kirim">Siap Kirim (Lunas)</option>
                  </select>
                </div>

                {orderStatus === "DP" && (
                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">Nominal DP (Rp) *</label>
                    <input
                      type="number"
                      value={dpAmountInput}
                      onChange={(e) => setDpAmountInput(e.target.value)}
                      placeholder="Contoh: 50000"
                      required
                      className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 font-mono text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Summary Tagihan with Individual Discount Breakdown */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm text-xs transition-colors">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                  Ringkasan Tagihan Order
                </h3>

                <div className="space-y-3 font-mono">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>Total Normal Barang ({selectedProductIds.length} Tas):</span>
                    <span className="text-slate-900 dark:text-white font-bold">
                      Rp {totalNormalBarangPrice.toLocaleString("id-ID")}
                    </span>
                  </div>

                  {totalIndividualDiscount > 0 && (
                    <div className="flex justify-between items-center text-blue-700 dark:text-blue-400 font-bold">
                      <span>Total Diskon Barang:</span>
                      <span>-Rp {totalIndividualDiscount.toLocaleString("id-ID")}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-slate-700 dark:text-slate-200 font-bold border-t border-slate-100 dark:border-slate-800 pt-2">
                    <span>Subtotal Barang Setelah Diskon:</span>
                    <span>Rp {totalBarangPriceAfterDiscount.toLocaleString("id-ID")}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>Ongkos Kirim ({selectedCourier || "Ekspedisi"}):</span>
                    <span className="text-blue-700 dark:text-blue-400 font-bold">
                      Rp {parsedCostNum.toLocaleString("id-ID")}
                    </span>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-900 dark:text-white font-sans">Total Tagihan:</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400 text-xl">
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

      {/* Lightbox Zoom Modal Gambar Tas */}
      {zoomProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl overflow-hidden transition-colors">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-blue-700 dark:text-blue-400 font-mono">
                  Foto Tas #{zoomProduct.id}
                </h3>
                {zoomProduct.shop?.name && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Toko Supplier: {zoomProduct.shop.name}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setZoomProduct(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold text-sm px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
              >
                Tutup
              </button>
            </div>

            {/* High-res Image Preview */}
            <div className="w-full h-80 bg-slate-900 rounded-xl overflow-hidden relative border border-slate-200 dark:border-slate-800 flex items-center justify-center">
              {zoomProduct.photoUrl && zoomProduct.photoUrl !== "/uploads/placeholder.jpg" ? (
                <Image src={zoomProduct.photoUrl} alt={zoomProduct.id} fill sizes="600px" className="object-contain" />
              ) : (
                <span className="text-slate-400 font-bold text-sm">Tidak ada foto produk</span>
              )}
            </div>

            {zoomProduct.description && (
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 font-medium">
                <strong>Deskripsi:</strong> {zoomProduct.description}
              </p>
            )}

            <div className="flex justify-between items-center pt-2 text-xs font-mono">
              <span className="text-slate-600 dark:text-slate-300 font-bold">Harga Normal: Rp {zoomProduct.price.toLocaleString("id-ID")}</span>
              <button
                type="button"
                onClick={() => setZoomProduct(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg transition-all text-xs"
              >
                Selesai Melihat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
