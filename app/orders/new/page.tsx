"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  province?: string | null;
  cityName?: string | null;
  cityId: number;
  district?: string | null;
  subdistrict?: string | null;
  postalCode?: string | null;
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

interface ServiceOption {
  service: string;
  description: string;
  cost: number;
  etd: string;
}

interface ShopConfig {
  shopName: string;
  senderName: string;
  originCityId: number;
  cityName: string;
  province: string;
  district: string;
}

export default function NewOrderPage() {
  const router = useRouter();

  // Database Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [shopConfig, setShopConfig] = useState<ShopConfig | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Form Selection
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [orderStatus, setOrderStatus] = useState("Keep");
  const [dpAmountInput, setDpAmountInput] = useState<string>("");

  // Manual Package Weight Input (Gram) - Default null / empty string
  const [manualWeightGramInput, setManualWeightGramInput] = useState<string>("");

  // RajaOngkir State
  const [selectedCourier, setSelectedCourier] = useState("jne");
  const [isCalculating, setIsCalculating] = useState(false);
  const [servicesList, setServicesList] = useState<ServiceOption[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoadingData(true);
      try {
        const [resCust, resProd, resCfg] = await Promise.all([
          fetch("/api/customers"),
          fetch("/api/products?status=Available"),
          fetch("/api/config"),
        ]);
        const dataCust = await resCust.json();
        const dataProd = await resProd.json();
        const dataCfg = await resCfg.json();

        if (dataCust.success) setCustomers(dataCust.data);
        if (dataProd.success) setAvailableProducts(dataProd.data);
        if (dataCfg.success) setShopConfig(dataCfg.data);
      } catch {
        // Ignore
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, []);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const selectedProducts = availableProducts.filter((p) => selectedProductIds.includes(p.id));
  const totalBarangPrice = selectedProducts.reduce((sum, p) => sum + p.price, 0);

  const toggleProductSelect = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleCalculateShipping = async () => {
    if (!selectedCustomer) {
      setErrorMessage("Silakan pilih Pelanggan terlebih dahulu.");
      return;
    }

    if (selectedProductIds.length === 0) {
      setErrorMessage("Pilih minimal 1 produk tas untuk dikirim.");
      return;
    }

    const weightVal = parseInt(manualWeightGramInput, 10);

    if (isNaN(weightVal) || weightVal <= 0) {
      setErrorMessage("Masukkan total bobot berat paket (gram) yang valid.");
      return;
    }

    setIsCalculating(true);
    setErrorMessage(null);
    setSelectedService(null);
    setServicesList([]);

    const originId = shopConfig?.originCityId || 54;

    try {
      const res = await fetch("/api/shipping/cost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: originId,
          destination: selectedCustomer.cityId,
          weight: weightVal,
          courier: selectedCourier,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Gagal menghitung tarif RajaOngkir.");
      } else {
        const list: ServiceOption[] = data.services || [];
        setServicesList(list);
        if (list.length > 0) setSelectedService(list[0]);
      }
    } catch {
      setErrorMessage("Gagal menghubungi server RajaOngkir.");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setErrorMessage("Pilih pelanggan terlebih dahulu.");
      return;
    }

    if (selectedProductIds.length === 0) {
      setErrorMessage("Pilih minimal 1 produk tas.");
      return;
    }

    if (!selectedService) {
      setErrorMessage("Hitung & pilih tarif ongkir terlebih dahulu.");
      return;
    }

    const weightVal = parseInt(manualWeightGramInput, 10) || 1000;
    const parsedDp = parseInt(dpAmountInput, 10) || 0;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          productIds: selectedProductIds,
          status: parsedDp > 0 ? "DP" : orderStatus,
          shippingCourier: selectedCourier.toUpperCase(),
          shippingService: selectedService.service,
          shippingCost: selectedService.cost,
          totalWeightGram: weightVal,
          dpAmount: parsedDp,
          totalPrice: totalBarangPrice + selectedService.cost,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Gagal menyimpan pesanan.");
      } else {
        router.push("/orders");
      }
    } catch {
      setErrorMessage("Terjadi kesalahan koneksi.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalTagihan = totalBarangPrice + (selectedService?.cost || 0);
  const parsedWeightNum = parseInt(manualWeightGramInput, 10);

  return (
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#f7f9fb]">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full px-6 h-16 bg-white border-b border-slate-200 z-30 sticky top-0 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-blue-700 tracking-tight">Buat Pesanan Baru (Checkout Admin)</h1>
        </div>
        <Link
          href="/orders"
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors"
        >
          ← Kembali ke Tabel Orders
        </Link>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 bg-[#f7f9fb] w-full pb-8">
        {errorMessage && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
            ⚠️ {errorMessage}
          </div>
        )}

        {loadingData ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading data inventaris & pelanggan...</div>
        ) : (
          <form onSubmit={handleCreateOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl mx-auto">
            
            {/* LEFT COLUMN (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Info Origin Toko Admin */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">storefront</span>
                  <span className="text-slate-700">
                    Alamat Asal Pengirim Toko: <strong>{shopConfig?.shopName || "Mbokdhe Fashion"} ({shopConfig?.cityName || "Kab. Bogor"}, {shopConfig?.province || "Jawa Barat"})</strong>
                  </span>
                </div>
                <Link
                  href="/origin"
                  className="px-2.5 py-1 bg-white border border-blue-200 text-blue-700 font-bold rounded hover:bg-blue-50 text-[11px]"
                >
                  Ubah Alamat Toko
                </Link>
              </div>

              {/* Step 1: Select Customer */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600">person</span> 1. Pilih Pelanggan Tujuan
                  </h3>
                  <Link
                    href="/customers"
                    className="text-xs text-blue-600 font-bold hover:underline"
                  >
                    + Tambah Pelanggan Baru
                  </Link>
                </div>

                <div>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    required
                    className="w-full bg-slate-50 text-slate-900 text-xs p-3 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-medium uppercase"
                  >
                    <option value="">-- Pilih Pelanggan Terdaftar --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.whatsapp}) - {c.cityName || "Kota"}, {c.province || ""} (City ID: {c.cityId})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCustomer && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
                    <span className="font-bold text-blue-700 block">📍 Detail Alamat Tujuan Pelanggan:</span>
                    <p>{selectedCustomer.addressDetail}, Kel. {selectedCustomer.subdistrict || "-"}, Kec. {selectedCustomer.district || "-"}</p>
                    <p className="text-slate-500">{selectedCustomer.cityName || "-"}, {selectedCustomer.province || "-"} (Kode Pos: {selectedCustomer.postalCode || "-"})</p>
                  </div>
                )}
              </div>

              {/* Step 2: Multi-Select Available Products */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600">local_mall</span> 2. Pilih Produk Tas (Bisa Pilih Banyak)
                  </span>
                  <span className="text-xs text-blue-600 font-mono font-bold">
                    {selectedProductIds.length} Tas Terpilih
                  </span>
                </h3>

                {availableProducts.length === 0 ? (
                  <p className="text-slate-500 text-xs py-4 text-center">
                    Tidak ada tas berstatus &apos;Available&apos; saat ini.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                    {availableProducts.map((p) => {
                      const isSelected = selectedProductIds.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleProductSelect(p.id)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between text-xs ${
                            isSelected
                              ? "bg-blue-50 border-blue-600 text-blue-900 shadow-sm"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <div>
                            <p className="font-extrabold text-blue-700 font-mono">#{p.id}</p>
                            <p className="text-[11px] text-slate-500">Toko: {p.shopOrigin}</p>
                            <p className="font-bold text-slate-900 mt-1">Rp {p.price.toLocaleString("id-ID")}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="accent-blue-600 w-4 h-4"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 3: Input Bobot Berat Paket (Gram) & Hitung Ongkir */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">local_shipping</span> 3. Input Bobot Paket & Hitung Ongkir
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Total Bobot Berat Paket (Gram) *</label>
                    <input
                      type="number"
                      value={manualWeightGramInput}
                      onChange={(e) => setManualWeightGramInput(e.target.value)}
                      placeholder="Misal: 1000, 2500"
                      required
                      min={100}
                      className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-mono text-sm"
                    />
                    {!isNaN(parsedWeightNum) && parsedWeightNum > 0 && (
                      <span className="text-[11px] text-slate-500 font-mono block mt-1">
                        = {(parsedWeightNum / 1000).toFixed(1)} kg
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Pilih Kurir Ekspedisi</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["jne", "pos", "tiki"].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setSelectedCourier(c)}
                          className={`py-2 rounded-lg border font-bold uppercase ${
                            selectedCourier === c
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCalculateShipping}
                  disabled={isCalculating}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-blue-700 font-bold border border-blue-200 rounded-lg transition-all disabled:opacity-50 text-xs flex items-center justify-center gap-2"
                >
                  {isCalculating
                    ? "Menghitung Ongkir..."
                    : !isNaN(parsedWeightNum) && parsedWeightNum > 0
                    ? `⚡ Hitung Ongkir (${selectedCourier.toUpperCase()} - ${(parsedWeightNum / 1000).toFixed(1)} kg)`
                    : `⚡ Hitung Ongkir (${selectedCourier.toUpperCase()})`}
                </button>

                {servicesList.length > 0 && (
                  <div className="space-y-2 pt-2 text-xs">
                    <span className="font-semibold text-slate-500">Pilih Layanan Pengiriman:</span>
                    {servicesList.map((svc, idx) => (
                      <label
                        key={idx}
                        className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer ${
                          selectedService?.service === svc.service
                            ? "bg-blue-50 border-blue-600 text-blue-900 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="svc"
                            checked={selectedService?.service === svc.service}
                            onChange={() => setSelectedService(svc)}
                            className="accent-blue-600"
                          />
                          <span className="font-bold text-blue-700">{svc.service}</span>
                          <span className="text-slate-500">({svc.description})</span>
                        </div>
                        <span className="font-bold text-slate-900">Rp {svc.cost.toLocaleString("id-ID")}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT COLUMN (5 cols) */}
            <div className="lg:col-span-5 space-y-6">

              {/* Status & DP */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm text-xs">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                  ⚙️ Status Pesanan & DP
                </h3>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Status Awal Pesanan</label>
                  <select
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 font-semibold"
                  >
                    <option value="Keep">Keep / Menunggu Pembayaran</option>
                    <option value="DP">DP (Pembekuan Dana)</option>
                    <option value="Siap_Packing">Siap Packing (Lunas)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nominal DP (Opsional)</label>
                  <input
                    type="number"
                    value={dpAmountInput}
                    onChange={(e) => setDpAmountInput(e.target.value)}
                    placeholder="Misal: 50000"
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 font-mono text-sm"
                  />
                </div>
              </div>

              {/* Summary Tagihan Simpel */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm text-xs">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                  💳 Ringkasan Tagihan Order
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Total Harga Barang ({selectedProductIds.length} Tas):</span>
                    <span className="font-mono text-slate-900 font-bold text-sm">
                      Rp {totalBarangPrice.toLocaleString("id-ID")}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span>Ongkos Kirim ({selectedService?.service || "-"}):</span>
                    <span className="font-mono text-blue-700 font-bold text-sm">
                      {selectedService ? `Rp ${selectedService.cost.toLocaleString("id-ID")}` : "Rp 0"}
                    </span>
                  </div>

                  <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-900">Total Tagihan:</span>
                    <span className="font-bold text-blue-700 font-mono text-xl">
                      Rp {totalTagihan.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-all text-sm disabled:opacity-50"
                >
                  {submitting ? "Memproses Pesanan..." : "🛍️ SIMPAN PESANAN"}
                </button>
              </div>

            </div>

          </form>
        )}
      </div>
    </div>
  );
}
