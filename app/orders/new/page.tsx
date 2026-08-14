"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState<string>("");
  const [individualDiscounts, setIndividualDiscounts] = useState<Record<string, string>>({});
  const [customPrices, setCustomPrices] = useState<Record<string, string>>({});

  const [selectedCourier, setSelectedCourier] = useState<string>("");
  const [manualShippingCost, setManualShippingCost] = useState<string>("");
  const [orderStatus, setOrderStatus] = useState<string>("Menunggu");
  const [dpAmountInput, setDpAmountInput] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- State Modal Tambah Pelanggan Baru ---
  const [isNewCustModalOpen, setIsNewCustModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustWA, setNewCustWA] = useState("");
  const [newCustDomisili, setNewCustDomisili] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [newCustCourier, setNewCustCourier] = useState("JNE");
  const [newCustShippingCost, setNewCustShippingCost] = useState("");
  const [newCustError, setNewCustError] = useState<string | null>(null);
  const [savingNewCust, setSavingNewCust] = useState(false);

  const [zoomProduct, setZoomProduct] = useState<Product | null>(null);

  // --- State Autocomplete Pencarian Pelanggan ---
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = customerSearchQuery.trim().toLowerCase();
    if (!q) return customers.slice(0, 10);
    return customers.filter((c) => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchWA = c.whatsapp.includes(q);
      const matchDom = c.domisili?.toLowerCase().includes(q) ?? false;
      const matchId = c.id.toLowerCase().includes(q);
      return matchName || matchWA || matchDom || matchId;
    });
  }, [customers, customerSearchQuery]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoadingData(true);
      try {
        const [custRes, prodRes] = await Promise.all([
          fetch("/api/customers"),
          fetch("/api/products"),
        ]);
        const custData = await custRes.json();
        const prodData = await prodRes.json();
        if (!isMounted) return;
        if (custData.success) setCustomers(custData.data);
        if (prodData.success) {
          const available = prodData.data.filter((p: Product) => p.status === "Tersedia");
          setAvailableProducts(available);
        }
      } catch {
        if (isMounted) setErrorMessage("Gagal memuat data pelanggan & produk.");
      } finally {
        if (isMounted) setLoadingData(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

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
        [product.id]: "",
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

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return availableProducts;
    return availableProducts.filter((p) => {
      const matchId = p.id.toLowerCase().includes(q);
      const matchDesc = p.description?.toLowerCase().includes(q) ?? false;
      const matchShop = p.shop?.name?.toLowerCase().includes(q) ?? false;
      return matchId || matchDesc || matchShop;
    });
  }, [availableProducts, productSearch]);

  // Produk yang ditampilkan: yang dipilih selalu di atas, sisanya hasil filter
  const displayedProducts = useMemo(() => {
    const selected = filteredProducts.filter((p) => selectedProductIds.includes(p.id));
    const unselected = filteredProducts.filter((p) => !selectedProductIds.includes(p.id));
    // Jika ada search aktif, tampilkan juga produk terpilih yang tidak match
    const pinnedSelected = productSearch.trim()
      ? availableProducts.filter(
          (p) =>
            selectedProductIds.includes(p.id) &&
            !filteredProducts.find((fp) => fp.id === p.id)
        )
      : [];
    return [...pinnedSelected, ...selected, ...unselected];
  }, [filteredProducts, selectedProductIds, availableProducts, productSearch]);


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
        const rawDisc = individualDiscounts[p.id];
        const rawCustomPrice = customPrices[p.id];

        const parsedDisc = parseInt(rawDisc, 10);
        const parsedCustomPrice = parseInt(rawCustomPrice, 10);

        const discVal = isNaN(parsedDisc) ? 0 : parsedDisc;
        const customPriceVal = isNaN(parsedCustomPrice) ? p.price : parsedCustomPrice;

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

  const handleCreateNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewCustError(null);
    setSavingNewCust(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCustName,
          whatsapp: newCustWA,
          domisili: newCustDomisili,
          addressDetail: newCustAddress,
          courier: newCustCourier,
          shippingCost: parseInt(newCustShippingCost, 10) || 0,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const created: Customer = data.data;
      // Tambahkan ke list lokal dan langsung pilih pelanggan baru ini
      setCustomers((prev) => [created, ...prev]);
      handleCustomerChange(created.id);

      // Reset form & tutup modal
      setIsNewCustModalOpen(false);
      setNewCustName("");
      setNewCustWA("");
      setNewCustDomisili("");
      setNewCustAddress("");
      setNewCustCourier("JNE");
      setNewCustShippingCost("");
      setNewCustError(null);
    } catch (err: any) {
      setNewCustError(err.message || "Gagal menyimpan pelanggan baru.");
    } finally {
      setSavingNewCust(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#fbfbfa] dark:bg-[#0c0d0f] text-[#111111] dark:text-[#f3f3f3] font-ui transition-colors duration-200">

      {/* Modal Tambah Pelanggan Baru */}
      {isNewCustModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={() => setIsNewCustModalOpen(false)}>
          <div
            className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] w-full max-w-md p-6 space-y-4 shadow-[0_12px_40px_rgba(0,0,0,0.08)] animate-fade-in-up font-ui"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-[#eaeaea] dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-[#111111] dark:text-[#f3f3f3] uppercase font-technical tracking-tight">
                Tambah Pelanggan
              </h3>
              <button
                type="button"
                onClick={() => setIsNewCustModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Error */}
            {newCustError && (
              <div className="p-3 bg-[#FDEBEC] text-[#9F2F2D] border border-[#f5c2c2] rounded-[6px] text-xs font-semibold font-technical">
                {newCustError}
              </div>
            )}

            <form onSubmit={handleCreateNewCustomer} className="space-y-3 text-xs">
              {/* Nama */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Nama Pelanggan *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="Contoh: Siti Nurhaliza"
                  className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium transition-colors"
                />
              </div>

              {/* WhatsApp */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">No. WhatsApp</label>
                <input
                  type="text"
                  value={newCustWA}
                  onChange={(e) => setNewCustWA(e.target.value)}
                  placeholder="Contoh: 081234567890 (Opsional)"
                  className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium transition-colors font-technical"
                />
              </div>

              {/* Detail Alamat */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Detail Alamat</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="Contoh: Jl. Mawar No.5, Kel. Sukamaju (Opsional)"
                  className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium transition-colors"
                />
              </div>

              {/* Domisili & Ekspedisi row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Kota / Domisili</label>
                  <input
                    type="text"
                    value={newCustDomisili}
                    onChange={(e) => setNewCustDomisili(e.target.value)}
                    placeholder="Contoh: Bandung"
                    className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Ekspedisi</label>
                  <select
                    value={newCustCourier}
                    onChange={(e) => setNewCustCourier(e.target.value)}
                    className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium transition-colors cursor-pointer"
                  >
                    {AVAILABLE_COURIERS.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ongkir */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Ongkos Kirim Default (Rp)</label>
                <div className="flex items-center gap-1 bg-white dark:bg-[#1c1d1f] px-2.5 py-1.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800">
                  <span className="font-technical text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    value={newCustShippingCost}
                    onChange={(e) => setNewCustShippingCost(e.target.value)}
                    placeholder="0"
                    className="w-full text-right font-technical font-bold text-xs text-[#111111] dark:text-white focus:outline-none bg-transparent"
                  />
                </div>
              </div>

              {/* Info note */}
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-technical bg-[#f5f5f5] dark:bg-[#1c1d1f] p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800">
                Setelah disimpan, pelanggan akan otomatis terpilih. Data profil lanjutan (tipe, behavioral, dsb.) dapat dilengkapi di halaman CRM Customer cuk1.
              </p>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsNewCustModalOpen(false)}
                  className="w-1/3 py-2.5 bg-[#f5f5f5] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-[6px] transition-colors border border-[#eaeaea] dark:border-slate-700 cursor-pointer text-xs font-technical uppercase"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingNewCust}
                  className="flex-1 py-2.5 bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] font-bold rounded-[6px] transition-all disabled:opacity-50 cursor-pointer text-xs font-technical uppercase"
                >
                  {savingNewCust ? "Menyimpan..." : "Simpan & Pilih Pelanggan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <header className="flex justify-between items-center w-full pl-14 pr-4 md:px-6 h-16 bg-white dark:bg-[#141517] border-b border-[#eaeaea] dark:border-slate-800/80 z-30 sticky top-0 shrink-0 transition-colors">
        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-[#111111] dark:text-[#f3f3f3] tracking-tight uppercase font-technical">
            Buat Pesanan (Checkout)
          </h1>
          <span className="text-[10px] text-[#787774] dark:text-slate-400 font-technical uppercase mt-0.5 tracking-wider">
            [ Checkout Terminal ]
          </span>
        </div>
        <Link
          href="/orders"
          className="px-4 py-2 bg-[#f5f5f5] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-[6px] border border-[#eaeaea] dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer uppercase font-technical"
        >
          ← Kembali ke Data Pesanan
        </Link>
      </header>

      {/* Main Content Scroll Container */}
      <div className="flex-1 overflow-auto p-6 bg-[#fbfbfa] dark:bg-[#0c0d0f] w-full pb-8 transition-colors">
        {errorMessage && (
          <div className="mb-6 p-3 bg-[#FDEBEC] text-[#9F2F2D] border border-[#f5c2c2] rounded-[6px] text-xs font-semibold text-center font-technical max-w-6xl mx-auto">
            {errorMessage}
          </div>
        )}

        {loadingData ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs font-technical uppercase">[ Loading data inventaris & pelanggan... ]</div>
        ) : (
          <form onSubmit={handleCreateOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl mx-auto font-ui">
            
            {/* LEFT COLUMN (7 cols) */}
            <div className="lg:col-span-7 space-y-6">

              {/* Step 1: Select Customer */}
              <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] p-5 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-colors">
                <div className="flex justify-between items-center border-b border-[#eaeaea] dark:border-slate-800 pb-3">
                  <h3 className="text-xs font-bold text-[#111111] dark:text-[#f3f3f3] uppercase font-technical">
                    1. Pilih Pelanggan Tujuan
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsNewCustModalOpen(true)}
                    className="text-[10px] text-[#1F6C9F] dark:text-[#6cb6e4] font-bold hover:underline uppercase font-technical cursor-pointer flex items-center gap-1"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                    + Pelanggan
                  </button>
                </div>

                {/* Autocomplete Customer Picker */}
                <div ref={customerDropdownRef} className="relative">
                  {selectedCustomer ? (
                    /* Selected Customer View with Change Button */
                    <div className="p-3 bg-[#E1F3FE] dark:bg-[#18232c] border border-[#1F6C9F]/40 dark:border-[#1F6C9F]/60 rounded-[6px] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#1F6C9F] text-white flex items-center justify-center font-bold text-xs shrink-0 font-technical">
                          {selectedCustomer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#111111] dark:text-white truncate">
                              {selectedCustomer.name}
                            </span>
                            <span className="text-[10px] font-technical text-[#1F6C9F] dark:text-[#6cb6e4] font-bold">
                              #{selectedCustomer.id.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-technical">
                            WA: {selectedCustomer.whatsapp || "-"} • {selectedCustomer.domisili || selectedCustomer.addressDetail || "Tanpa domisili"}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId("");
                          setCustomerSearchQuery("");
                          setIsCustomerDropdownOpen(true);
                        }}
                        className="px-2.5 py-1.5 bg-white dark:bg-[#1c1d1f] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-[4px] border border-[#eaeaea] dark:border-slate-700 text-[10px] font-bold uppercase font-technical transition-colors cursor-pointer shrink-0"
                      >
                        Ganti Pelanggan
                      </button>
                    </div>
                  ) : (
                    /* Search Input & Suggestions Dropdown */
                    <div className="relative">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                          </svg>
                        </span>
                        <input
                          type="text"
                          value={customerSearchQuery}
                          onFocus={() => setIsCustomerDropdownOpen(true)}
                          onChange={(e) => {
                            setCustomerSearchQuery(e.target.value);
                            setIsCustomerDropdownOpen(true);
                          }}
                          placeholder="Ketik nama pelanggan, nomor WA, atau domisili..."
                          className="w-full pl-9 pr-9 py-2.5 bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium transition-colors"
                        />
                        {customerSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setCustomerSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6 6 18M6 6l12 12"/>
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Dropdown Suggestions */}
                      {isCustomerDropdownOpen && (
                        <div className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800 rounded-[8px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] max-h-64 overflow-y-auto divide-y divide-[#f1f1f1] dark:divide-slate-800/80 animate-fade-in-up">
                          {filteredCustomers.length === 0 ? (
                            <div className="p-4 text-center space-y-2">
                              <p className="text-slate-400 dark:text-slate-500 text-xs font-technical uppercase">
                                Customer tidak ditemukan
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCustomerDropdownOpen(false);
                                  setIsNewCustModalOpen(true);
                                }}
                                className="text-[10px] text-[#1F6C9F] dark:text-[#6cb6e4] font-bold hover:underline font-technical uppercase cursor-pointer"
                              >
                                Buat Customer Baru Sekarang
                              </button>
                            </div>
                          ) : (
                            filteredCustomers.map((c) => (
                              <div
                                key={c.id}
                                onClick={() => {
                                  handleCustomerChange(c.id);
                                  setIsCustomerDropdownOpen(false);
                                  setCustomerSearchQuery("");
                                }}
                                className="p-3 hover:bg-[#F9F9F8] dark:hover:bg-[#1c1d1f] cursor-pointer transition-colors flex items-center justify-between text-xs"
                              >
                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 dark:text-white truncate">
                                      {c.name}
                                    </span>
                                    <span className="font-technical text-[10px] text-[#1F6C9F] dark:text-[#6cb6e4] font-semibold">
                                      #{c.id.toUpperCase()}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-technical">
                                    WA: {c.whatsapp || "-"} {c.domisili ? `• ${c.domisili}` : ""} {c.courier ? `• ${c.courier}` : ""}
                                  </p>
                                </div>
                                <span className="text-[10px] font-technical uppercase font-bold text-slate-400 shrink-0 ml-2">
                                  PILIH →
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedCustomer && (
                  <div className="bg-[#f5f5f5] dark:bg-[#1c1d1f] p-3.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 text-xs text-slate-700 dark:text-slate-350 space-y-1 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#1F6C9F]">Detail Pelanggan:</span>
                      <span className="font-technical text-xs font-bold text-[#111111] dark:text-white">#{selectedCustomer.id.toUpperCase()}</span>
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-white">{selectedCustomer.name} (WA: {selectedCustomer.whatsapp})</p>
                    <p className="text-slate-500 dark:text-slate-400">{selectedCustomer.addressDetail}, {selectedCustomer.domisili || "-"}</p>
                    <div className="pt-2 flex items-center gap-3 font-technical text-[10px] text-slate-400 uppercase tracking-tight">
                      <span>Ekspedisi: <strong className="text-[#1F6C9F]">{selectedCustomer.courier || "JNE"}</strong></span>
                      <span>•</span>
                      <span>Ongkir Default: <strong className="text-slate-800 dark:text-slate-200">Rp {(selectedCustomer.shippingCost || 0).toLocaleString("id-ID")}</strong></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Multi-Select Available Products & Per-Bag Individual Discounts */}
              <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] p-5 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-colors">
                <h3 className="text-xs font-bold text-[#111111] dark:text-[#f3f3f3] border-b border-[#eaeaea] dark:border-slate-800 pb-3 flex justify-between items-center font-technical uppercase">
                  <span>2. Pilih Tas & Atur Diskon Individual</span>
                  <span className="text-[10px] text-[#1F6C9F] font-bold">
                    {selectedProductIds.length} Tas Terpilih
                  </span>
                </h3>

                {availableProducts.length === 0 ? (
                  <p className="text-slate-400 dark:text-slate-500 text-xs py-4 text-center font-technical uppercase">
                    Tidak ada tas berstatus &apos;Tersedia&apos; saat ini.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {/* Search Bar Tas */}
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                        </svg>
                      </span>
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Cari ID, deskripsi, atau nama toko..."
                        className="w-full pl-9 pr-9 py-2 text-xs bg-[#f5f5f5] dark:bg-[#1c1d1f] border border-[#eaeaea] dark:border-slate-800 rounded-[6px] text-[#111111] dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#1F6C9F] dark:focus:border-[#6cb6e4] font-technical transition-colors"
                      />
                      {productSearch && (
                        <button
                          type="button"
                          onClick={() => setProductSearch("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18M6 6l12 12"/>
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Counter hasil filter */}
                    <div className="flex items-center justify-between text-[10px] font-technical text-slate-400 dark:text-slate-500 uppercase tracking-wider px-0.5">
                      <span>
                        {productSearch.trim()
                          ? `${filteredProducts.length} dari ${availableProducts.length} tas ditemukan`
                          : `${availableProducts.length} tas tersedia`}
                      </span>
                      {selectedProductIds.length > 0 && (
                        <span className="text-[#1F6C9F] font-bold">
                          {selectedProductIds.length} terpilih
                        </span>
                      )}
                    </div>

                    {/* Daftar Tas */}
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {displayedProducts.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs font-technical uppercase">
                        Tidak ada tas yang cocok dengan pencarian.
                      </div>
                    ) : displayedProducts.map((p) => {
                      const isSelected = selectedProductIds.includes(p.id);
                      const currentDiscount = individualDiscounts[p.id] !== undefined ? individualDiscounts[p.id] : "";
                      const currentPrice = customPrices[p.id] !== undefined ? customPrices[p.id] : String(p.price);

                      const discVal = parseInt(currentDiscount, 10) || 0;

                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleProductSelect(p)}
                          className={`p-3.5 rounded-[6px] border cursor-pointer transition-all text-xs ${
                            isSelected
                              ? "bg-[#E1F3FE] dark:bg-[#18232c] border-[#1F6C9F] text-[#1F6C9F] dark:text-slate-200 shadow-sm"
                              : "bg-[#f5f5f5] dark:bg-[#1c1d1f] border-[#eaeaea] dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-650"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="accent-[#1F6C9F] w-4 h-4 shrink-0 cursor-pointer"
                              />

                              {/* Bag Image Thumbnail & Zoom Trigger */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setZoomProduct(p);
                                }}
                                className="w-12 h-12 rounded-[4px] bg-[#fbfbfa] dark:bg-slate-700 border border-[#eaeaea] dark:border-slate-600 overflow-hidden relative shrink-0 hover:opacity-85 transition-all shadow-sm group cursor-pointer"
                                title="Klik untuk zoom gambar tas"
                              >
                                {p.photoUrl && p.photoUrl !== "/uploads/placeholder.jpg" ? (
                                  <Image src={p.photoUrl} alt={p.id} fill sizes="48px" className="object-cover" />
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-400 font-bold text-[9px] uppercase font-technical">Foto</span>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[9px] font-bold font-technical uppercase">
                                  ZOOM
                                </div>
                              </button>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-[#111111] dark:text-white font-technical text-sm">#{p.id.toUpperCase()}</span>
                                </div>
                                <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold block uppercase tracking-wide">Harga Normal: Rp {p.price.toLocaleString("id-ID")}</span>
                                {p.description && (
                                  <span className="text-slate-400 dark:text-slate-400 text-[10px] font-medium block truncate max-w-xs">{p.description}</span>
                                )}
                              </div>
                            </div>

                            {!isSelected && (
                              <span className="font-bold text-[#111111] dark:text-white font-technical">
                                Rp {p.price.toLocaleString("id-ID")}
                              </span>
                            )}
                          </div>

                          {/* Individual Discount Controls per Bag */}
                          {isSelected && (
                            <div
                              className="mt-3 pt-3 border-t border-[#1F6C9F]/20 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Input Diskon Individual (Rp) */}
                              <div className="space-y-1">
                                <label className="block text-[9px] font-bold text-[#1F6C9F] dark:text-[#a2d8fa] uppercase tracking-wider font-technical">
                                  Diskon Tas Ini:
                                </label>
                                <div className="flex items-center gap-1 bg-white dark:bg-[#1c1d1f] px-2.5 py-1.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 shadow-sm">
                                  <span className="font-technical text-xs font-bold text-slate-400">Rp</span>
                                  <input
                                    type="number"
                                    value={currentDiscount}
                                    onChange={(e) => handleDiscountChange(p, e.target.value)}
                                    className="w-full text-right font-technical font-bold text-xs text-[#111111] dark:text-white focus:outline-none bg-transparent"
                                    placeholder="Contoh: 10000"
                                  />
                                </div>
                              </div>

                              {/* Input Harga Akhir (Rp) */}
                              <div className="space-y-1">
                                <label className="block text-[9px] font-bold text-[#1F6C9F] dark:text-[#a2d8fa] uppercase tracking-wider font-technical">
                                  Harga Akhir Setelah Diskon:
                                </label>
                                <div className="flex items-center gap-1 bg-white dark:bg-[#1c1d1f] px-2.5 py-1.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 shadow-sm">
                                  <span className="font-technical text-xs font-bold text-slate-400">Rp</span>
                                  <input
                                    type="number"
                                    value={currentPrice}
                                    onChange={(e) => handleCustomPriceChange(p, e.target.value)}
                                    className="w-full text-right font-technical font-bold text-xs text-[#111111] dark:text-white focus:outline-none bg-transparent"
                                    placeholder={String(p.price)}
                                  />
                                </div>
                              </div>

                              {/* Individual Discount Badge Notice */}
                              {discVal > 0 && (
                                <div className="sm:col-span-2 p-2 bg-[#E1F3FE] text-[#1F6C9F] border border-[#d2ecfc] rounded-[6px] text-[10px] font-technical font-bold flex justify-between items-center uppercase tracking-wide">
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
                  </div>
                )}
              </div>

              {/* Step 3: Input Ekspedisi & Nominal Ongkos Kirim */}
              <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] p-5 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-colors">
                <h3 className="text-xs font-bold text-[#111111] dark:text-[#f3f3f3] border-b border-[#eaeaea] dark:border-slate-800 pb-3 uppercase font-technical">
                  3. Ekspedisi & Nominal Ongkos Kirim
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Pilih Ekspedisi Pengiriman</label>
                    <select
                      value={selectedCourier}
                      onChange={(e) => setSelectedCourier(e.target.value)}
                      className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 font-medium focus:border-[#111111] focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Pilih Ekspedisi --</option>
                      {AVAILABLE_COURIERS.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Nominal Ongkos Kirim (Rp)</label>
                    <input
                      type="number"
                      value={manualShippingCost}
                      onChange={(e) => setManualShippingCost(e.target.value)}
                      placeholder="Contoh: 15000"
                      required
                      className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 font-technical text-sm font-semibold focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN (5 cols) */}
            <div className="lg:col-span-5 space-y-6">

              {/* Status & DP */}
              <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] p-5 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)] text-xs transition-colors">
                <h3 className="text-xs font-bold text-[#111111] dark:text-[#f3f3f3] border-b border-[#eaeaea] dark:border-slate-800 pb-3 uppercase font-technical">
                  Status Pesanan & DP
                </h3>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Status Awal Pesanan</label>
                  <select
                    value={orderStatus}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOrderStatus(val);
                      if (val !== "DP") {
                        setDpAmountInput("");
                      }
                    }}
                    className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 font-semibold focus:outline-none focus:border-[#111111] cursor-pointer"
                  >
                    <option value="">-- Pilih Status Awal Pesanan --</option>
                    <option value="Menunggu">Menunggu Pembayaran</option>
                    <option value="DP">DP (Pembekuan Dana)</option>
                    <option value="Siap Kirim">Siap Kirim (Lunas)</option>
                  </select>
                </div>

                {orderStatus === "DP" && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Nominal DP (Rp) *</label>
                    <input
                      type="number"
                      value={dpAmountInput}
                      onChange={(e) => setDpAmountInput(e.target.value)}
                      placeholder="Contoh: 50000"
                      required
                      className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 font-technical text-sm focus:outline-none focus:border-[#111111]"
                    />
                  </div>
                )}
              </div>

              {/* Summary Tagihan with Individual Discount Breakdown */}
              <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] p-5 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)] text-xs transition-colors">
                <h3 className="text-xs font-bold text-[#111111] dark:text-[#f3f3f3] border-b border-[#eaeaea] dark:border-slate-800 pb-3 uppercase font-technical">
                  Ringkasan Tagihan Order
                </h3>

                <div className="space-y-3 font-technical uppercase">
                  <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                    <span>Total Barang ({selectedProductIds.length} Tas):</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">
                      Rp {totalNormalBarangPrice.toLocaleString("id-ID")}
                    </span>
                  </div>

                  {totalIndividualDiscount > 0 && (
                    <div className="flex justify-between items-center text-[#9F2F2D] font-bold">
                      <span>Total Diskon Barang:</span>
                      <span>-Rp {totalIndividualDiscount.toLocaleString("id-ID")}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-slate-700 dark:text-slate-200 font-bold border-t border-[#eaeaea] dark:border-slate-800/80 pt-2">
                    <span>Subtotal Setelah Diskon:</span>
                    <span>Rp {totalBarangPriceAfterDiscount.toLocaleString("id-ID")}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                    <span>Ongkos Kirim ({selectedCourier || "Ekspedisi"}):</span>
                    <span className="text-[#1F6C9F] font-bold">
                      Rp {parsedCostNum.toLocaleString("id-ID")}
                    </span>
                  </div>

                  <div className="border-t border-[#eaeaea] dark:border-slate-800/80 pt-3 flex justify-between items-center text-xs">
                    <span className="font-bold text-[#111111] dark:text-white font-ui uppercase">Total Tagihan:</span>
                    <span className="font-bold text-red-650 dark:text-emerald-450 text-lg">
                      Rp {totalTagihan.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] font-bold rounded-[6px] shadow-sm transition-all text-xs uppercase font-technical tracking-wider cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] max-w-xl w-full p-5 space-y-4 shadow-[0_12px_40px_rgba(0,0,0,0.04)] overflow-hidden transition-colors font-ui animate-fade-in-up">
            <div className="flex justify-between items-center border-b border-[#eaeaea] dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#111111] dark:text-[#f3f3f3] font-technical uppercase">
                  Foto Tas #{zoomProduct.id.toUpperCase()}
                </h3>
                {zoomProduct.shop?.name && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase mt-0.5">Toko Supplier: {zoomProduct.shop.name}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setZoomProduct(null)}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-white font-bold text-xs px-2.5 py-1 rounded-[6px] bg-[#f5f5f5] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-[#eaeaea] dark:border-slate-750 cursor-pointer font-technical uppercase tracking-wide"
              >
                Tutup
              </button>
            </div>

            {/* High-res Image Preview */}
            <div className="w-full h-80 bg-[#fbfbfa] dark:bg-slate-900 rounded-[6px] overflow-hidden relative border border-[#eaeaea] dark:border-slate-800/85 flex items-center justify-center">
              {zoomProduct.photoUrl && zoomProduct.photoUrl !== "/uploads/placeholder.jpg" ? (
                <Image src={zoomProduct.photoUrl} alt={zoomProduct.id} fill sizes="600px" className="object-contain" />
              ) : (
                <span className="text-slate-300 dark:text-slate-600 font-bold text-xs uppercase font-technical">[ Tidak ada foto tas ]</span>
              )}
            </div>

            {zoomProduct.description && (
              <p className="text-xs text-slate-600 dark:text-slate-400 bg-[#f5f5f5] dark:bg-[#1c1d1f] p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800">
                <strong>Deskripsi:</strong> {zoomProduct.description}
              </p>
            )}

            <div className="flex justify-between items-center pt-2 text-xs font-technical uppercase tracking-tight">
              <span className="text-slate-500 dark:text-slate-400 font-bold">Harga: Rp {zoomProduct.price.toLocaleString("id-ID")}</span>
              <button
                type="button"
                onClick={() => setZoomProduct(null)}
                className="bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] font-bold px-4 py-2 rounded-[6px] transition-all text-xs cursor-pointer font-technical uppercase"
              >
                Kembali
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
