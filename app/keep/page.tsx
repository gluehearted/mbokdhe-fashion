"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useToast } from "@/components/ToastProvider";
import { ConfirmModal } from "@/components/ConfirmModal";

interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  domisili?: string;
  addressDetail?: string;
  courier?: string;
  shippingCost?: number;
}

interface Shop {
  id: string;
  name: string;
}

interface Product {
  id: string;
  price: number;
  description?: string;
  photoUrl?: string;
  status?: string;
  shop?: Shop;
}

interface Order {
  id: string;
  customerId: string;
  status: string;
  shippingCourier?: string;
  shippingCost?: number;
  dpAmount: number;
  totalPrice: number;
  notes?: string;
  createdAt: string;
  customer?: Customer;
  products: Product[];
}

function parseSafeDate(dateStr: string) {
  if (!dateStr) return new Date();
  let safeStr = dateStr;
  if (!safeStr.includes("T")) safeStr = safeStr.replace(" ", "T");
  if (!safeStr.includes("Z") && !safeStr.includes("+")) safeStr = `${safeStr}Z`;
  return new Date(safeStr);
}

function getDurationHeld(createdAt: string) {
  const safeDate = parseSafeDate(createdAt);
  const diffMs = Date.now() - safeDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;

  let durationStr = "";
  if (diffDays > 0) {
    durationStr = `${diffDays} Hr ${remainingHours} Jm`;
  } else if (diffHours > 0) {
    durationStr = `${diffHours} Jam`;
  } else {
    const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    durationStr = `${diffMins} Mnt`;
  }

  const isWarning = diffHours >= 24;
  return { durationStr, diffHours, isWarning };
}

export default function KeepPage() {
  const { showToast } = useToast();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [keepOrders, setKeepOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Search debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Modal State: Release & Cancel Keep
  const [orderToRelease, setOrderToRelease] = useState<Order | null>(null);
  const [isReleasing, setIsReleasing] = useState(false);

  // Modal State: Checkout to Regular Order
  const [orderToCheckout, setOrderToCheckout] = useState<Order | null>(null);
  const [checkoutTargetStatus, setCheckoutTargetStatus] = useState("Menunggu");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Modal State: Create New Keep Entry
  const [isNewKeepModalOpen, setIsNewKeepModalOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [keepNotesInput, setKeepNotesInput] = useState("");
  const [savingKeep, setSavingKeep] = useState(false);
  const [keepModalError, setKeepModalError] = useState<string | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  // Modal State: Create New Customer on-the-fly inside Keep modal
  const [isNewCustModalOpen, setIsNewCustModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustWa, setNewCustWa] = useState("");
  const [newCustDomisili, setNewCustDomisili] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [savingNewCust, setSavingNewCust] = useState(false);

  // Hover Tooltip state for bag image preview
  const [hoveredPreview, setHoveredPreview] = useState<{
    product: Product;
    x: number;
    y: number;
    showBelow: boolean;
  } | null>(null);

  const handleBadgeMouseEnter = (e: React.MouseEvent, p: Product) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const showBelow = rect.top < 240;
    setHoveredPreview({
      product: p,
      x: rect.left + rect.width / 2,
      y: showBelow ? rect.bottom + 8 : rect.top - 8,
      showBelow,
    });
  };

  const handleBadgeMouseLeave = () => {
    setHoveredPreview(null);
  };

  // Fetch Keep Orders
  const fetchKeepOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders?status=Keep");
      const data = await res.json();
      if (data.success) {
        setKeepOrders(data.data);
      }
    } catch {
      showToast("Gagal memuat data Keep.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchKeepOrders();
  }, [fetchKeepOrders]);

  // Fetch Customers & Available Products when modal opens
  const loadModalData = useCallback(async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/products"),
      ]);
      const custData = await custRes.json();
      const prodData = await prodRes.json();

      if (custData.success) setCustomers(custData.data);
      if (prodData.success) {
        setAvailableProducts(
          prodData.data.filter((p: Product) => p.status === "Tersedia")
        );
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleOpenNewKeepModal = () => {
    setIsNewKeepModalOpen(true);
    setSelectedCustomerId("");
    setSelectedProductIds([]);
    setKeepNotesInput("");
    setKeepModalError(null);
    loadModalData();
  };

  const handleCreateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    setSavingNewCust(true);

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCustName.trim(),
          whatsapp: newCustWa.trim() || "-",
          domisili: newCustDomisili.trim() || "-",
          addressDetail: newCustAddress.trim() || "-",
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Pelanggan "${data.data.name}" berhasil dibuat.`, "success");
        setCustomers((prev) => [data.data, ...prev]);
        setSelectedCustomerId(data.data.id);
        setIsNewCustModalOpen(false);
        setNewCustName("");
        setNewCustWa("");
        setNewCustDomisili("");
        setNewCustAddress("");
      } else {
        showToast(data.error || "Gagal membuat pelanggan.", "error");
      }
    } catch {
      showToast("Kesalahan koneksi saat membuat pelanggan.", "error");
    } finally {
      setSavingNewCust(false);
    }
  };

  const toggleProductSelect = (p: Product) => {
    if (selectedProductIds.includes(p.id)) {
      setSelectedProductIds((prev) => prev.filter((id) => id !== p.id));
    } else {
      setSelectedProductIds((prev) => [...prev, p.id]);
    }
  };

  const handleCreateKeepOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeepModalError(null);

    if (!selectedCustomerId) {
      setKeepModalError("Silakan pilih pelanggan terlebih dahulu.");
      return;
    }
    if (selectedProductIds.length === 0) {
      setKeepModalError("Pilih minimal 1 tas untuk dikeep.");
      return;
    }

    setSavingKeep(true);

    const selectedProducts = availableProducts.filter((p) =>
      selectedProductIds.includes(p.id)
    );
    const productsPayload = selectedProducts.map((p) => ({
      productId: p.id,
      price: p.price,
    }));
    const totalBarang = selectedProducts.reduce((acc, p) => acc + p.price, 0);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          productIds: selectedProductIds,
          status: "Keep",
          shippingCourier: "JNE",
          shippingCost: 0,
          dpAmount: 0,
          totalPrice: totalBarang,
          notes: keepNotesInput.trim() || null,
          products: productsPayload,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast("Penahanan barang (Keep) berhasil disimpan!", "success");
        setIsNewKeepModalOpen(false);
        fetchKeepOrders();
      } else {
        setKeepModalError(data.error || "Gagal menyimpan Keep.");
      }
    } catch {
      setKeepModalError("Terjadi kesalahan koneksi saat menyimpan Keep.");
    } finally {
      setSavingKeep(false);
    }
  };

  // Convert Keep to Regular Order (Checkout)
  const confirmCheckoutOrder = async () => {
    if (!orderToCheckout) return;
    setIsCheckingOut(true);

    try {
      const res = await fetch(`/api/orders/${orderToCheckout.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: checkoutTargetStatus }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(
          `Pesanan Keep #${orderToCheckout.id.slice(0, 8)} berhasil dikonversi ke '${checkoutTargetStatus}'. Pesanan berpindah ke Halaman Orders.`,
          "success"
        );
        setOrderToCheckout(null);
        fetchKeepOrders();
      } else {
        showToast(data.error || "Gagal mengonversi pesanan Keep.", "error");
      }
    } catch {
      showToast("Kesalahan koneksi saat mengonversi pesanan Keep.", "error");
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Release & Cancel Keep Order
  const confirmReleaseOrder = async () => {
    if (!orderToRelease) return;
    setIsReleasing(true);

    try {
      const res = await fetch(`/api/orders/${orderToRelease.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Dibatalkan" }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(
          `Pesanan Keep #${orderToRelease.id.slice(0, 8)} telah dilepas. Seluruh barang dikembalikan ke status 'Tersedia'.`,
          "success"
        );
        setOrderToRelease(null);
        fetchKeepOrders();
      } else {
        showToast(data.error || "Gagal melepas pesanan Keep.", "error");
      }
    } catch {
      showToast("Kesalahan koneksi saat melepas pesanan Keep.", "error");
    } finally {
      setIsReleasing(false);
    }
  };

  // Filtered Keep Orders with null-safe optional chaining
  const filteredKeepOrders = keepOrders.filter((o) => {
    const q = debouncedSearch.toLowerCase();
    const matchId = o.id.toLowerCase().includes(q);
    const matchName = o.customer?.name?.toLowerCase().includes(q) || false;
    const matchWa = o.customer?.whatsapp?.includes(q) || false;
    const matchNotes = o.notes?.toLowerCase().includes(q) || false;
    const matchProduct = (o.products || []).some(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.shop?.name?.toLowerCase().includes(q)
    );
    return matchId || matchName || matchWa || matchNotes || matchProduct;
  });

  // Calculate Stat Cards
  const totalKeepItems = keepOrders.reduce(
    (acc, o) => acc + (o.products?.length || 0),
    0
  );
  const totalKeepValue = keepOrders.reduce((acc, o) => acc + o.totalPrice, 0);
  const alarmKeepCount = keepOrders.filter(
    (o) => getDurationHeld(o.createdAt).isWarning
  ).length;

  const totalPages = Math.ceil(filteredKeepOrders.length / itemsPerPage) || 1;

  // Auto Reset Pagination when out of bounds after deletion
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [filteredKeepOrders.length, totalPages, currentPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTableData = filteredKeepOrders.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const filteredCustomersModal = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      c.whatsapp.includes(customerSearchQuery) ||
      (c.domisili && c.domisili.toLowerCase().includes(customerSearchQuery.toLowerCase()))
  );
  const filteredProductsModal = availableProducts.filter(
    (p) =>
      p.id.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(productSearch.toLowerCase())) ||
      (p.shop?.name && p.shop.name.toLowerCase().includes(productSearch.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#fbfbfa] dark:bg-[#0c0d0f] text-[#111111] dark:text-[#f3f3f3] font-ui transition-colors duration-200">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full pl-14 pr-4 md:px-6 h-16 bg-white dark:bg-[#141517] border-b border-[#eaeaea] dark:border-slate-800/80 z-30 sticky top-0 shrink-0 transition-colors">
        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-[#111111] dark:text-[#f3f3f3] tracking-tight uppercase font-technical">
            Keep Barang / Soft Booking
          </h1>
          <span className="text-[10px] text-[#787774] dark:text-slate-400 font-technical uppercase mt-0.5 tracking-wider">
            [ Dedicated Reserved Stock Management ]
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenNewKeepModal}
            className="bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] px-4 py-2 rounded-[6px] font-semibold text-xs uppercase tracking-wider transition-colors active:scale-95 shadow-sm cursor-pointer flex items-center gap-1.5 font-technical"
          >
            Tambah Keep Baru
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 bg-[#fbfbfa] dark:bg-[#0c0d0f] w-full pb-8 space-y-6">

        {/* Header Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Keep */}
          <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 p-4 rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
                Total Barang Dikeep
              </span>
              <p className="text-2xl font-extrabold text-[#111111] dark:text-white font-technical mt-1">
                {totalKeepItems} <span className="text-xs font-semibold text-slate-400">Tas</span>
              </p>
              <span className="text-[10px] text-slate-400 font-technical">
                {keepOrders.length} transaksi penahanan aktif
              </span>
            </div>
          </div>

          {/* Card 2: Total Nominal */}
          <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 p-4 rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
                Total Estimasi Nominal
              </span>
              <p className="text-2xl font-extrabold text-[#1F6C9F] dark:text-[#6cb6e4] font-technical mt-1">
                Rp {totalKeepValue.toLocaleString("id-ID")}
              </p>
              <span className="text-[10px] text-slate-400 font-technical">
                Nilai produk yang sedang ditahan
              </span>
            </div>
          </div>

          {/* Card 3: Alarm Warning (>24 Jam) */}
          <div className={`border p-4 rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.01)] flex items-center justify-between transition-colors ${
            alarmKeepCount > 0
              ? "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60"
              : "bg-white dark:bg-[#141517] border-[#eaeaea] dark:border-slate-800/80"
          }`}>
            <div>
              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-widest font-technical">
                Dikeep &gt; 24 Jam
              </span>
              <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-technical mt-1">
                {alarmKeepCount} <span className="text-xs font-semibold text-rose-400">Tas</span>
              </p>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-technical">
                {alarmKeepCount > 0 ? "Perlu konfirmasi / follow-up admin!" : "Semua penahanan di bawah 24 jam"}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Search Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 p-5 rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-[#111111] dark:text-white uppercase font-technical">
              Daftar Barang Keep Aktif ({filteredKeepOrders.length})
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Cari ID Keep, nama pelanggan, WA, atau tas..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full sm:w-80 bg-[#f5f5f5] dark:bg-[#1c1d1f] text-[#111111] dark:text-white text-xs px-3.5 py-2 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-technical"
            />
          </div>
        </div>

        {/* Keep Table Layout */}
        {loading ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs font-technical uppercase">[ Memuat data Keep... ]</div>
        ) : filteredKeepOrders.length === 0 ? (
          <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] p-12 text-center text-slate-400 dark:text-slate-500 text-xs font-technical uppercase">
            Tidak ada transaksi Keep aktif saat ini.
          </div>
        ) : (
          <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs text-slate-700 dark:text-slate-300 border-collapse">
                <thead className="bg-[#F9F9F8] dark:bg-slate-900/60 border-b border-[#eaeaea] dark:border-slate-800 text-[10px] text-[#787774] dark:text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">Keep ID</th>
                    <th className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">Pelanggan</th>
                    <th className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">Tanggal Dikeep</th>
                    <th className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">Lama Ditahan (Duration)</th>
                    <th className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">Produk Tas Dikeep</th>
                    <th className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">Total Nilai</th>
                    <th className="p-4 text-center">Aksi Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f1f1] dark:divide-slate-800 font-technical text-xs text-slate-800 dark:text-slate-200">
                  {currentTableData.map((o) => {
                    const { durationStr, isWarning } = getDurationHeld(o.createdAt);

                    return (
                      <tr key={o.id} className={`transition-colors ${
                        isWarning
                          ? "bg-rose-50/30 dark:bg-rose-950/10 hover:bg-rose-50/60 dark:hover:bg-rose-950/20"
                          : "hover:bg-[#F9F9F8] dark:hover:bg-slate-900/20"
                      }`}>
                        {/* Keep ID */}
                        <td className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800 font-bold text-[#1F6C9F] dark:text-[#6cb6e4]">
                          #{o.id.slice(0, 8).toUpperCase()}
                        </td>

                        {/* Customer */}
                        <td className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">
                          {o.customer ? (
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">{o.customer.name}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{o.customer.whatsapp}</p>
                              {o.notes && (
                                <div className="mt-1.5 text-[10px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-1.5 rounded text-left font-sans max-w-xs">
                                  <span className="font-bold font-technical uppercase">Catatan:</span> {o.notes}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">Pelanggan terhapus</span>
                          )}
                        </td>

                        {/* Tanggal */}
                        <td className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800 font-mono whitespace-nowrap">
                          {isMounted && o.createdAt ? (
                            <>
                              <span className="font-semibold text-slate-900 dark:text-slate-200 block text-[11px]">
                                {parseSafeDate(o.createdAt).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  timeZone: "Asia/Jakarta",
                                })}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                                {parseSafeDate(o.createdAt).toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  timeZone: "Asia/Jakarta",
                                })} WIB
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Lama Ditahan & Visual Alarm */}
                        <td className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">
                          <div className={`px-3 py-1 rounded-[6px] border text-[10px] font-bold uppercase font-technical inline-flex items-center gap-1.5 ${
                            isWarning
                              ? "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800 animate-pulse shadow-sm"
                              : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                          }`}>
                            <span>Ditahan {durationStr}</span>
                          </div>
                        </td>

                        {/* Produk Tas */}
                        <td className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">
                          <div className="flex flex-wrap gap-1.5 justify-center max-w-xs mx-auto">
                            {o.products && o.products.length > 0 ? (
                              o.products.map((p) => (
                                <div key={p.id} className="inline-block">
                                  <span
                                    onMouseEnter={(e) => handleBadgeMouseEnter(e, p)}
                                    onMouseLeave={handleBadgeMouseLeave}
                                    className="px-2.5 py-0.5 bg-[#E1F3FE] text-[#1F6C9F] dark:bg-[#18232c] dark:text-[#6cb6e4] border border-[#d2ecfc] dark:border-slate-700 rounded-full font-bold text-[9px] uppercase tracking-wider inline-flex items-center gap-1 cursor-help transition-all hover:scale-105 select-none"
                                  >
                                    {p.photoUrl && p.photoUrl !== "/uploads/placeholder.jpg" && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#1F6C9F] dark:bg-[#6cb6e4] inline-block animate-pulse" />
                                    )}
                                    #{p.id.toUpperCase()} {p.shop?.name ? `(${p.shop.name})` : ""}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </div>
                        </td>

                        {/* Total Nominal */}
                        <td className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800 font-mono font-bold text-[#111111] dark:text-white">
                          Rp {o.totalPrice.toLocaleString("id-ID")}
                        </td>

                        {/* Action Column */}
                        <td className="p-4 text-center">
                          <div className="flex flex-col gap-1.5 items-center max-w-[130px] mx-auto">
                            <button
                              type="button"
                              onClick={() => {
                                setOrderToCheckout(o);
                                setCheckoutTargetStatus("Menunggu");
                              }}
                              className="w-full px-2.5 py-1.5 bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] font-bold rounded-[4px] text-[9px] uppercase tracking-wider font-technical transition-colors cursor-pointer shadow-xs"
                            >
                              Checkout / Order
                            </button>
                            <button
                              type="button"
                              onClick={() => setOrderToRelease(o)}
                              className="w-full px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 font-bold rounded-[4px] text-[9px] uppercase tracking-wider font-technical transition-colors cursor-pointer"
                            >
                              Lepas / Batalkan
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Navigation */}
            {filteredKeepOrders.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#fbfbfa] dark:bg-slate-900/60 p-4 border-t border-[#eaeaea] dark:border-slate-800 font-technical uppercase">
                <span className="text-[10px] text-slate-500 dark:text-slate-450">
                  Menampilkan <span className="font-bold text-[#111111] dark:text-white">{startIndex + 1}</span> -{" "}
                  <span className="font-bold text-[#111111] dark:text-white">
                    {Math.min(startIndex + itemsPerPage, filteredKeepOrders.length)}
                  </span>{" "}
                  dari total <span className="font-bold text-[#111111] dark:text-white">{filteredKeepOrders.length}</span> keep
                </span>

                <div className="flex items-center gap-2 text-xs font-bold">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-[6px] bg-[#f5f5f5] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-[#eaeaea] dark:border-slate-700 cursor-pointer text-[10px] tracking-wider"
                  >
                    PREV
                  </button>

                  <span className="px-3 py-1.5 bg-white dark:bg-[#141517] text-slate-700 dark:text-slate-300 border border-[#eaeaea] dark:border-slate-800 rounded-[6px] text-[10px]">
                    HAL {currentPage} / {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-[6px] bg-[#f5f5f5] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-[#eaeaea] dark:border-slate-700 cursor-pointer text-[10px] tracking-wider"
                  >
                    NEXT
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* --- Modal Tambah Keep Baru --- */}
      {isNewKeepModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] max-w-xl w-full p-5 space-y-4 shadow-[0_12px_40px_rgba(0,0,0,0.04)] overflow-hidden transition-colors font-ui animate-fade-in-up">
            <div className="flex justify-between items-center border-b border-[#eaeaea] dark:border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-[#111111] dark:text-[#f3f3f3] uppercase font-technical">
                🔒 Buat Transaksi Keep Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsNewKeepModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-xs cursor-pointer font-technical uppercase"
              >
                ✕
              </button>
            </div>

            {keepModalError && (
              <div className="p-3 bg-[#FDEBEC] text-[#9F2F2D] border border-[#f5c2c2] rounded-[6px] text-xs font-semibold font-technical">
                {keepModalError}
              </div>
            )}

            <form onSubmit={handleCreateKeepOrder} className="space-y-4 text-xs">
              {/* Step 1: Pilih Pelanggan */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
                    1. Pilih Pelanggan *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsNewCustModalOpen(true)}
                    className="text-[10px] text-[#1F6C9F] dark:text-[#6cb6e4] font-bold hover:underline font-technical uppercase cursor-pointer"
                  >
                    + Customer Baru
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      setIsCustomerDropdownOpen(true);
                    }}
                    onFocus={() => setIsCustomerDropdownOpen(true)}
                    placeholder="Ketik nama pelanggan atau nomor WA..."
                    className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:outline-none text-xs font-medium"
                  />

                  {isCustomerDropdownOpen && (
                    <div className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800 rounded-[8px] shadow-lg max-h-48 overflow-y-auto divide-y divide-[#f1f1f1] dark:divide-slate-800 font-technical">
                      {filteredCustomersModal.length === 0 ? (
                        <div className="p-3 text-center text-slate-400 text-xs uppercase">
                          Customer tidak ditemukan
                        </div>
                      ) : (
                        filteredCustomersModal.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedCustomerId(c.id);
                              setIsCustomerDropdownOpen(false);
                              setCustomerSearchQuery("");
                            }}
                            className="p-2.5 hover:bg-[#F9F9F8] dark:hover:bg-[#1c1d1f] cursor-pointer flex justify-between items-center text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">WA: {c.whatsapp}</span>
                            </div>
                            <span className="text-[10px] text-[#1F6C9F] font-bold uppercase">PILIH →</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {selectedCustomer && (
                  <div className="p-2.5 bg-[#f5f5f5] dark:bg-[#1c1d1f] rounded-[6px] border border-[#eaeaea] dark:border-slate-800 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{selectedCustomer.name}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">WA: {selectedCustomer.whatsapp} {selectedCustomer.domisili ? `• ${selectedCustomer.domisili}` : ""}</span>
                    </div>
                    <span className="text-[9px] font-bold text-[#1F6C9F] uppercase font-technical">Terpilih ✓</span>
                  </div>
                )}
              </div>

              {/* Step 2: Pilih Tas Tersedia */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
                    2. Pilih Tas untuk Dikeep ({selectedProductIds.length} Terpilih) *
                  </label>
                </div>

                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Cari ID tas, deskripsi, atau toko supplier..."
                  className="w-full bg-[#f5f5f5] dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 text-xs focus:outline-none font-technical"
                />

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {filteredProductsModal.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs uppercase font-technical">
                      Tidak ada tas berstatus &apos;Tersedia&apos; saat ini.
                    </div>
                  ) : (
                    filteredProductsModal.map((p) => {
                      const isSelected = selectedProductIds.includes(p.id);

                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleProductSelect(p)}
                          className={`p-2.5 rounded-[6px] border cursor-pointer transition-all flex items-center justify-between text-xs ${
                            isSelected
                              ? "bg-[#E1F3FE] dark:bg-[#18232c] border-[#1F6C9F] text-[#1F6C9F]"
                              : "bg-[#f9f9f8] dark:bg-[#1c1d1f] border-[#eaeaea] dark:border-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="accent-[#1F6C9F] w-4 h-4 cursor-pointer"
                            />
                            <div>
                              <span className="font-bold font-technical text-slate-900 dark:text-white">#{p.id.toUpperCase()}</span>
                              {p.shop?.name && <span className="text-[10px] text-slate-400 block font-technical">Toko: {p.shop.name}</span>}
                            </div>
                          </div>

                          <span className="font-technical font-bold text-slate-900 dark:text-white">
                            Rp {p.price.toLocaleString("id-ID")}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Step 3: Catatan Keep */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
                  3. Catatan Keep / Penahanan (Opsional)
                </label>
                <input
                  type="text"
                  value={keepNotesInput}
                  onChange={(e) => setKeepNotesInput(e.target.value)}
                  placeholder="Contoh: Janjikan pelunasan besok malam, ganti ukuran..."
                  className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 text-xs focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewKeepModalOpen(false)}
                  className="w-1/3 py-2.5 bg-[#f5f5f5] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-[6px] transition-colors border border-[#eaeaea] dark:border-slate-700 cursor-pointer text-xs font-technical uppercase"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingKeep}
                  className="flex-1 py-2.5 bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] font-bold rounded-[6px] transition-all disabled:opacity-50 cursor-pointer text-xs font-technical uppercase"
                >
                  {savingKeep ? "Menyimpan Keep..." : "Simpan Penahanan Keep"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modal Pop-up Pelanggan Baru on-the-fly --- */}
      {isNewCustModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] max-w-md w-full p-5 space-y-4 shadow-[0_12px_40px_rgba(0,0,0,0.04)] overflow-hidden transition-colors font-ui animate-fade-in-up">
            <div className="flex justify-between items-center border-b border-[#eaeaea] dark:border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-[#111111] dark:text-[#f3f3f3] uppercase font-technical">
                Tambah Pelanggan Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsNewCustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-xs cursor-pointer font-technical uppercase"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Nama Pelanggan *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="Nama lengkap..."
                  className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Nomor WhatsApp</label>
                <input
                  type="text"
                  value={newCustWa}
                  onChange={(e) => setNewCustWa(e.target.value)}
                  placeholder="08123456789"
                  className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Domisili / Kota</label>
                <input
                  type="text"
                  value={newCustDomisili}
                  onChange={(e) => setNewCustDomisili(e.target.value)}
                  placeholder="Jakarta, Surabaya..."
                  className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewCustModalOpen(false)}
                  className="w-1/3 py-2.5 bg-[#f5f5f5] dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-[6px] border border-[#eaeaea] dark:border-slate-700 text-xs font-technical uppercase"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingNewCust}
                  className="flex-1 py-2.5 bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] text-white dark:text-[#111111] font-bold rounded-[6px] text-xs font-technical uppercase"
                >
                  {savingNewCust ? "Menyimpan..." : "Simpan & Pilih Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Modal Konfirmasi Checkout / Konversi ke Order --- */}
      <ConfirmModal
        isOpen={Boolean(orderToCheckout)}
        onClose={() => setOrderToCheckout(null)}
        onConfirm={confirmCheckoutOrder}
        title="Lanjutkan ke Order (Checkout)"
        message={
          orderToCheckout ? (
            <div className="space-y-3 text-xs">
              <p>
                Apakah Anda yakin ingin memproses transaksi Keep{" "}
                <span className="font-bold text-[#111111] dark:text-white font-technical">
                  #{orderToCheckout.id.slice(0, 8).toUpperCase()}
                </span>{" "}
                atas nama <strong>{orderToCheckout.customer?.name}</strong> menjadi pesanan resmi?
              </p>

              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
                  Pilih Status Pesanan Baru:
                </label>
                <select
                  value={checkoutTargetStatus}
                  onChange={(e) => setCheckoutTargetStatus(e.target.value)}
                  className="w-full bg-[#f5f5f5] dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 font-bold text-xs focus:outline-none"
                >
                  <option value="Menunggu">Menunggu Pembayaran</option>
                  <option value="DP">DP (Pembekuan Dana)</option>
                  <option value="Siap Kirim">Siap Kirim (Lunas)</option>
                </select>
              </div>

              <p className="text-[11px] text-[#1F6C9F] dark:text-sky-400 font-semibold">
                ℹ️ Transaksi ini akan dipindahkan dari halaman Keep ke halaman Orders.
              </p>
            </div>
          ) : ""
        }
        confirmText="Ya, Konversi ke Order"
        cancelText="Batal"
        isLoading={isCheckingOut}
      />

      {/* --- Modal Konfirmasi Release & Cancel Keep --- */}
      <ConfirmModal
        isOpen={Boolean(orderToRelease)}
        onClose={() => setOrderToRelease(null)}
        onConfirm={confirmReleaseOrder}
        title="Lepas & Batalkan Penahanan Keep"
        message={
          orderToRelease ? (
            <div className="space-y-2 text-xs">
              <p>
                Apakah Anda yakin ingin melepas pesanan Keep{" "}
                <span className="font-bold text-[#111111] dark:text-white font-technical">
                  #{orderToRelease.id.slice(0, 8).toUpperCase()}
                </span>
                {orderToRelease.customer ? ` atas nama "${orderToRelease.customer.name}"` : ""}?
              </p>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                Seluruh tas dalam pesanan Keep ini akan dilepas dan statusnya dikembalikan menjadi &quot;Tersedia&quot; untuk etalase umum.
              </p>
            </div>
          ) : ""
        }
        confirmText="Ya, Lepas & Batalkan"
        cancelText="Batal"
        isLoading={isReleasing}
      />

      {/* Global Floating Hover Preview */}
      {hoveredPreview && (
        <div
          className={`fixed z-[9999] pointer-events-none w-60 p-3 bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800 rounded-[8px] shadow-[0_16px_48px_rgba(0,0,0,0.28)] font-ui -translate-x-1/2 ${
            hoveredPreview.showBelow ? "" : "-translate-y-full"
          }`}
          style={{
            left: `${Math.max(130, Math.min(typeof window !== "undefined" ? window.innerWidth - 130 : 500, hoveredPreview.x))}px`,
            top: `${hoveredPreview.y}px`,
          }}
        >
          <div className="w-full h-32 bg-[#fbfbfa] dark:bg-slate-900 rounded-[6px] overflow-hidden relative border border-[#eaeaea] dark:border-slate-800/80 mb-2.5 flex items-center justify-center">
            {hoveredPreview.product.photoUrl && hoveredPreview.product.photoUrl !== "/uploads/placeholder.jpg" ? (
              <Image
                src={hoveredPreview.product.photoUrl}
                alt={hoveredPreview.product.id}
                fill
                sizes="240px"
                className="object-contain"
              />
            ) : (
              <span className="text-slate-400 text-[10px] uppercase font-technical text-center px-2">
                [ Foto tidak tersedia ]
              </span>
            )}
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-xs text-[#111111] dark:text-white font-technical">
                #{hoveredPreview.product.id.toUpperCase()}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#E1F3FE] text-[#1F6C9F] dark:bg-[#18232c] dark:text-[#6cb6e4]">
                {hoveredPreview.product.status || "Dibooking"}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Supplier: <strong className="text-slate-800 dark:text-slate-200">{hoveredPreview.product.shop?.name || "-"}</strong>
            </p>

            {hoveredPreview.product.description && (
              <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 italic">
                &quot;{hoveredPreview.product.description}&quot;
              </p>
            )}

            <div className="pt-1.5 border-t border-[#f1f1f1] dark:border-slate-800 flex justify-between items-center text-[11px] font-technical">
              <span className="text-slate-400 font-medium">Harga:</span>
              <span className="font-bold text-[#111111] dark:text-white">
                Rp {hoveredPreview.product.price?.toLocaleString("id-ID") || 0}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
