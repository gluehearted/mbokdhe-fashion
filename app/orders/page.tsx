"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { TableActionsMenu } from "@/components/TableActionsMenu";
import { useToast } from "@/components/ToastProvider";
import { ConfirmModal } from "@/components/ConfirmModal";

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
  discount?: number;
  status: string;
  description?: string | null;
  photoUrl?: string | null;
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

export default function OrdersPage() {
  const { showToast } = useToast();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const [editingResiOrder, setEditingResiOrder] = useState<Order | null>(null);
  const [trackingNoInput, setTrackingNoInput] = useState("");
  const [savingResi, setSavingResi] = useState(false);

  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);

  // State Modal Release Keep Order
  const [orderToRelease, setOrderToRelease] = useState<Order | null>(null);
  const [isReleasingOrder, setIsReleasingOrder] = useState(false);

  // State Modal Edit Item Order (Real-time Grand Total)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editOrderItems, setEditOrderItems] = useState<{ productId: string; price: number; customPrice: number; discount: number; description?: string }[]>([]);
  const [availableProductsForEdit, setAvailableProductsForEdit] = useState<Product[]>([]);
  const [selectedAddProductId, setSelectedAddProductId] = useState<string>("");
  const [editShippingCost, setEditShippingCost] = useState<string>("0");
  const [editDpAmount, setEditDpAmount] = useState<string>("0");
  const [editNotes, setEditNotes] = useState<string>("");
  const [savingEditOrder, setSavingEditOrder] = useState(false);

  // Floating Hover Tooltip state (prevents table overflow clipping)
  const [hoveredPreview, setHoveredPreview] = useState<{
    product: Product;
    x: number;
    y: number;
    showBelow: boolean;
  } | null>(null);

  const handleBadgeMouseEnter = (e: React.MouseEvent, p: Product) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const showBelow = rect.top < 240; // if too close to top of viewport, flip below badge
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

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
      }
    } catch {
      showToast("Gagal memuat data pesanan.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Status pesanan #${orderId.slice(0, 8)} berhasil diubah ke '${newStatus}'.`, "success");
        fetchOrders();
      } else {
        showToast(data.error || "Gagal mengubah status pesanan.", "error");
      }
    } catch {
      showToast("Terjadi kesalahan koneksi saat mengubah status pesanan.", "error");
    }
  };

  const handleDeleteOrder = (order: Order) => {
    setOrderToDelete(order);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    setIsDeletingOrder(true);
    try {
      const res = await fetch(`/api/orders/${orderToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast(`Pesanan #${orderToDelete.id.slice(0, 8)} berhasil dihapus.`, "success");
        setOrderToDelete(null);
        fetchOrders();
      } else {
        showToast(data.error || "Gagal menghapus pesanan.", "error");
      }
    } catch {
      showToast("Terjadi kesalahan koneksi saat menghapus pesanan.", "error");
    } finally {
      setIsDeletingOrder(false);
    }
  };

  const confirmReleaseOrder = async () => {
    if (!orderToRelease) return;
    setIsReleasingOrder(true);
    try {
      const res = await fetch(`/api/orders/${orderToRelease.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Dibatalkan" }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Pesanan Keep #${orderToRelease.id.slice(0, 8)} dilepas & dibatalkan. Stok barang kembali 'Tersedia'.`, "success");
        setOrderToRelease(null);
        fetchOrders();
      } else {
        showToast(data.error || "Gagal melepas pesanan.", "error");
      }
    } catch {
      showToast("Terjadi kesalahan koneksi saat melepas pesanan.", "error");
    } finally {
      setIsReleasingOrder(false);
    }
  };

  const handleOpenEditModal = async (order: Order) => {
    setEditingOrder(order);
    setEditShippingCost(String(order.shippingCost || 0));
    setEditDpAmount(String(order.dpAmount || 0));
    setEditNotes(order.notes || "");
    setEditOrderItems(
      (order.products || []).map((p) => ({
        productId: p.id,
        price: p.price,
        customPrice: p.price,
        discount: p.discount || 0,
        description: p.description || undefined,
      }))
    );

    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (data.success) {
        setAvailableProductsForEdit(data.data.filter((p: Product) => p.status === "Tersedia"));
      }
    } catch {
      // Ignore
    }
  };

  const handleAddItemToEditOrder = (product: Product) => {
    if (editOrderItems.some((i) => i.productId === product.id)) {
      showToast("Produk sudah ada dalam pesanan ini.", "error");
      return;
    }
    setEditOrderItems((prev) => [
      ...prev,
      {
        productId: product.id,
        price: product.price,
        customPrice: product.price,
        discount: 0,
        description: product.description || undefined,
      },
    ]);
    setSelectedAddProductId("");
  };

  const handleRemoveItemFromEditOrder = (productId: string) => {
    if (editOrderItems.length <= 1) {
      showToast("Pesanan harus memiliki minimal 1 tas.", "error");
      return;
    }
    setEditOrderItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleSaveEditOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    if (editOrderItems.length === 0) {
      showToast("Pesanan harus memiliki minimal 1 item barang.", "error");
      return;
    }
    setSavingEditOrder(true);

    const totalBarang = editOrderItems.reduce((acc, item) => {
      const base = isNaN(item.customPrice) ? item.price : item.customPrice;
      const disc = isNaN(item.discount) ? 0 : item.discount;
      return acc + Math.max(0, base - disc);
    }, 0);

    const shipping = parseInt(editShippingCost, 10) || 0;
    const dp = parseInt(editDpAmount, 10) || 0;
    const grandTotal = totalBarang + shipping;

    try {
      const res = await fetch(`/api/orders/${editingOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingCost: shipping,
          dpAmount: dp,
          totalPrice: grandTotal,
          notes: editNotes.trim() || null,
          productIds: editOrderItems.map((i) => i.productId),
          products: editOrderItems.map((i) => ({
            productId: i.productId,
            customPrice: i.customPrice,
            discount: i.discount,
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Pesanan #${editingOrder.id.slice(0, 8)} berhasil diperbarui.`, "success");
        setEditingOrder(null);
        fetchOrders();
      } else {
        showToast(data.error || "Gagal memperbarui pesanan.", "error");
      }
    } catch {
      showToast("Terjadi kesalahan koneksi saat memperbarui pesanan.", "error");
    } finally {
      setSavingEditOrder(false);
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

  const generateWhatsappMessage = (o: Order) => {
    const formattedDate = parseSafeDate(o.createdAt).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });

    let statusDesc = o.status.toUpperCase();
    if (o.status === "Menunggu") {
      statusDesc = "MENUNGGU PEMBAYARAN";
    } else if (o.status === "DP") {
      statusDesc = `DP / UANG MUKA (DITERIMA: RP ${o.dpAmount.toLocaleString("id-ID")})`;
    } else if (o.status === "Siap Kirim" || o.status === "Siap Packing") {
      statusDesc = "SIAP KIRIM";
    } else if (o.status === "Dikirim") {
      statusDesc = "DIKIRIM";
    } else if (o.status === "Dibatalkan") {
      statusDesc = "DIBATALKAN";
    } else if (o.status === "Lunas" || o.status === "Selesai") {
      statusDesc = "LUNAS & SELESAI";
    }

    const totalDiscount = o.products.reduce((sum, p) => sum + (p.discount || 0), 0);
    const totalBarangPrice = o.products.reduce((sum, p) => sum + (p.price || 0), 0);

    const productList = o.products
      .map((p, idx) => {
        const desc = p.description?.trim();
        const itemDesc = desc
          ? desc
          : `Tas #${p.id.slice(0, 8).toUpperCase()}`;
        return `${idx + 1}. ${itemDesc} - Rp ${p.price.toLocaleString("id-ID")}`;
      })
      .join("\n");

    let financialLines = `Total Barang (${o.products.length}): Rp ${totalBarangPrice.toLocaleString("id-ID")}`;
    if (totalDiscount > 0) {
      financialLines += `\nDiskon: Rp ${totalDiscount.toLocaleString("id-ID")}`;
    }
    financialLines += `\nOngkir (${o.shippingCourier || "Ekspedisi"}): Rp ${(o.shippingCost || 0).toLocaleString("id-ID")}`;

    if (o.dpAmount > 0) {
      financialLines += `\nDP Dibayar: Rp ${o.dpAmount.toLocaleString("id-ID")}`;
      const sisa = Math.max(0, o.totalPrice - o.dpAmount);
      if (sisa > 0) {
        financialLines += `\nSisa Pelunasan: Rp ${sisa.toLocaleString("id-ID")}`;
      }
    }

    let resiSection = "";
    if (o.trackingNo) {
      resiSection = `\nNo. Resi (${(o.shippingCourier || "Ekspedisi").toUpperCase()}): ${o.trackingNo}\n----------------------------------`;
    }

    return `REKAP PESANAN
----------------------------------
Order ID: #${o.id.slice(0, 8).toUpperCase()}
Tanggal: ${formattedDate}
Status: ${statusDesc}

RINCIAN BARANG DIPESAN:
${productList}

RINCIAN PEMBAYARAN:
${financialLines}
----------------------------------
TOTAL TAGIHAN: Rp ${o.totalPrice.toLocaleString("id-ID")}
----------------------------------${resiSection ? "\n" + resiSection : ""}
Pembayaran bisa lewat rek. berikut:
BCA 1671403539
A/N ALRON EBENHAEZER C

BRI 8017 0101 8680 504
A/N ALRON EBENHAEZER C`;
  };

  const handleSendWhatsapp = (o: Order) => {
    if (!o.customer?.whatsapp) {
      showToast("Nomor WhatsApp pelanggan tidak ditemukan.", "error");
      return;
    }

    let waNum = o.customer.whatsapp.replace(/\D/g, "");
    if (waNum.startsWith("0")) {
      waNum = "62" + waNum.slice(1);
    }

    const text = generateWhatsappMessage(o);
    const encoded = encodeURIComponent(text);
    const url = `https://wa.me/${waNum}?text=${encoded}`;
    window.open(url, "_blank");
  };

  const filteredOrders = orders.filter((o) => {
    const matchesStatus =
      statusFilter === "ALL" ? o.status !== "Keep" : o.status === statusFilter;
    const matchesSearch =
      o.id.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      o.customer?.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      o.customer?.whatsapp.includes(debouncedSearch);
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTableData = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#fbfbfa] dark:bg-[#0c0d0f] text-[#111111] dark:text-[#f3f3f3] font-ui transition-colors duration-200">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full pl-14 pr-4 md:px-6 h-16 bg-white dark:bg-[#141517] border-b border-[#eaeaea] dark:border-slate-800/80 z-30 sticky top-0 shrink-0 transition-colors">
        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-[#111111] dark:text-[#f3f3f3] tracking-tight uppercase font-technical">
            Pipeline & Rekap Pesanan
          </h1>
          <span className="text-[10px] text-[#787774] dark:text-slate-400 font-technical uppercase mt-0.5 tracking-wider">
            [ Order Pipeline ]
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/orders/new"
            className="bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] px-4 py-2 rounded-[6px] font-semibold text-xs uppercase tracking-wider transition-colors active:scale-95 shadow-sm cursor-pointer"
          >
            Buat Pesanan
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 bg-[#fbfbfa] dark:bg-[#0c0d0f] w-full pb-8 space-y-6">

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 p-5 rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {[
              { label: "Semua Order", value: "ALL" },
              { label: "Menunggu", value: "Menunggu" },
              { label: "DP", value: "DP" },
              { label: "Siap Kirim", value: "Siap Kirim" },
              { label: "Dikirim", value: "Dikirim" },
              { label: "Dibatalkan", value: "Dibatalkan" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-[6px] text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.value
                    ? "bg-[#111111] text-white dark:bg-[#f3f3f3] dark:text-[#111111] font-bold"
                    : "bg-[#f5f5f5] dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-[#eaeaea] dark:border-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Cari ID pesanan, nama, WA..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full sm:w-64 bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white text-xs px-3.5 py-2 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-technical"
            />
          </div>
        </div>

        {/* Orders Content Area */}
        {loading ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs font-technical uppercase">[ Loading pesanan... ]</div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] p-12 text-center text-slate-400 dark:text-slate-500 text-xs font-technical uppercase">
            Tidak ada data pesanan ditemukan.
          </div>
        ) : (
          /* TABLE VIEW LAYOUT */
          <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs text-slate-700 dark:text-slate-300 border-collapse">
                <thead className="bg-[#F9F9F8] dark:bg-slate-900/60 border-b border-[#eaeaea] dark:border-slate-800 text-[10px] text-[#787774] dark:text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">Order ID</th>
                    <th className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">Pelanggan</th>
                    <th className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">Tanggal</th>
                    <th className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">Produk Tas & Toko</th>
                    <th className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">Ekspedisi</th>
                    <th className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">No. Resi</th>
                    <th className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">Total Price</th>
                    <th className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">Status</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f1f1] dark:divide-slate-800 font-technical text-xs text-slate-800 dark:text-slate-200">
                  {currentTableData.map((o) => (
                    <tr key={o.id} className="hover:bg-[#F9F9F8] dark:hover:bg-slate-900/20 transition-colors">
                      <td className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800 font-bold text-red-600 dark:text-emerald-400">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </td>

                      <td className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">
                        {o.customer ? (
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{o.customer.name}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{o.customer.whatsapp}</p>
                            {o.notes && (
                              <div className="mt-1.5 text-[10px] text-slate-600 dark:text-slate-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-1.5 rounded text-left font-sans max-w-xs">
                                <span className="font-bold text-amber-800 dark:text-amber-300 font-technical uppercase">Catatan:</span> {o.notes}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Pelanggan terhapus</span>
                        )}
                      </td>

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

                      <td className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">
                        <div className="flex flex-wrap gap-1.5 justify-center max-w-xs mx-auto">
                          {o.products && o.products.length > 0 ? (
                            o.products.map((p) => (
                              <div key={p.id} className="inline-block">
                                <span
                                  onMouseEnter={(e) => handleBadgeMouseEnter(e, p)}
                                  onMouseLeave={handleBadgeMouseLeave}
                                  className="px-2.5 py-0.5 bg-[#E1F3FE] text-[#1F6C9F] dark:bg-[#18232c] dark:text-[#6cb6e4] border border-[#d2ecfc] dark:border-slate-700 rounded-full font-bold text-[9px] uppercase tracking-wider inline-flex items-center gap-1 cursor-help transition-all hover:scale-105 hover:shadow-sm select-none"
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

                      <td className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800 font-mono">
                        <span className="font-bold text-[#111111] dark:text-white block">{o.shippingCourier || "JNE"}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Rp {(o.shippingCost || 0).toLocaleString("id-ID")}
                        </span>
                      </td>

                      <td className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800 font-mono">
                        {o.trackingNo ? (
                          <span className="font-bold text-[#1F6C9F] bg-[#E1F3FE] dark:bg-[#1c2c35] dark:text-[#6cb6e4] px-2.5 py-0.5 rounded-full text-[9px] inline-block uppercase">
                            {o.trackingNo}
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingResiOrder(o);
                              setTrackingNoInput("");
                            }}
                            className="text-red-600 dark:text-red-400 font-bold hover:underline text-[10px] uppercase font-technical cursor-pointer"
                          >
                            + Input Resi
                          </button>
                        )}
                      </td>

                      <td className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800 font-mono font-bold text-[#111111] dark:text-white">
                        Rp {o.totalPrice.toLocaleString("id-ID")}
                        {o.dpAmount > 0 && (
                          <span className="block text-[9px] text-[#1F6C9F] font-bold mt-0.5">
                            DP: Rp {o.dpAmount.toLocaleString("id-ID")}
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center border-r border-[#eaeaea] dark:border-slate-800">
                        <select
                          value={o.status}
                          onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                          className="bg-white dark:bg-[#1c1d1f] border border-[#eaeaea] dark:border-slate-800 text-[#111111] dark:text-white text-[10px] font-bold p-1.5 rounded-[6px] focus:border-[#111111] focus:outline-none cursor-pointer"
                        >
                          <option value="Menunggu">Menunggu</option>
                          <option value="DP">DP</option>
                          <option value="Siap Kirim">Siap Kirim</option>
                          <option value="Dikirim">Dikirim</option>
                          <option value="Dibatalkan">Dibatalkan</option>
                        </select>
                      </td>

                      <td className="p-4 text-center">
                        <TableActionsMenu
                          items={[
                            {
                              label: "Edit Item Pesanan",
                              icon: "edit",
                              onClick: () => handleOpenEditModal(o),
                            },
                            {
                              label: "Kirim Rekap WA",
                              icon: "chat",
                              onClick: () => handleSendWhatsapp(o),
                            },
                            {
                              label: "Input / Edit Resi",
                              icon: "edit",
                              onClick: () => {
                                setEditingResiOrder(o);
                                setTrackingNoInput(o.trackingNo || "");
                              },
                            },
                            {
                              label: "Tandai Siap Kirim",
                              icon: "task_alt",
                              onClick: () => updateOrderStatus(o.id, "Siap Kirim"),
                            },
                            {
                              label: "Hapus Order",
                              icon: "delete",
                              danger: true,
                              onClick: () => handleDeleteOrder(o),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Navigasi Pagination */}
            {filteredOrders.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#fbfbfa] dark:bg-slate-900/60 p-4 border-t border-[#eaeaea] dark:border-slate-800 font-technical uppercase">
                <span className="text-[10px] text-slate-500 dark:text-slate-450">
                  Menampilkan <span className="font-bold text-[#111111] dark:text-white">{startIndex + 1}</span> -{" "}
                  <span className="font-bold text-[#111111] dark:text-white">
                    {Math.min(startIndex + itemsPerPage, filteredOrders.length)}
                  </span>{" "}
                  dari total <span className="font-bold text-[#111111] dark:text-white">{filteredOrders.length}</span> order
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

      {/* Modal Input Resi */}
      {editingResiOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] max-w-md w-full p-6 space-y-4 shadow-[0_12px_40px_rgba(0,0,0,0.04)] animate-fade-in-up font-ui">
            <h3 className="text-sm font-bold text-[#111111] dark:text-[#f3f3f3] border-b border-[#eaeaea] dark:border-slate-800 pb-3 uppercase font-technical">
              Input Nomor Resi Pengiriman
            </h3>

            <form onSubmit={handleSaveResi} className="space-y-4 text-xs font-ui">
              <div className="p-3 bg-[#f5f5f5] dark:bg-[#1c1d1f] border border-[#eaeaea] dark:border-slate-800 rounded-[6px] space-y-1 font-technical uppercase">
                <p className="font-bold text-[#111111] dark:text-white">Order ID: #{editingResiOrder.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-slate-750 dark:text-slate-350">Pelanggan: {editingResiOrder.customer?.name}</p>
                <p className="text-slate-500 dark:text-slate-400 text-[10px]">Ekspedisi: {editingResiOrder.shippingCourier || "JNE"}</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Nomor Resi *</label>
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
                  className="w-1/2 py-2.5 bg-[#f5f5f5] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-[6px] transition-colors border border-[#eaeaea] dark:border-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingResi}
                  className="w-1/2 py-2.5 bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] font-bold rounded-[6px] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingResi ? "Simpan..." : "Simpan Resi & Kirim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Floating Hover Preview (Never Clipped by Table Overflow) */}
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
          {/* Photo preview container */}
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
              <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-technical text-center px-2">
                [ Foto tidak tersedia ]
              </span>
            )}
          </div>

          {/* Details */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-bold text-xs text-[#111111] dark:text-white font-technical">
                #{hoveredPreview.product.id.toUpperCase()}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#E1F3FE] text-[#1F6C9F] dark:bg-[#18232c] dark:text-[#6cb6e4]">
                {hoveredPreview.product.status || "Tersedia"}
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

      {/* Confirm Modal Hapus Order */}
      <ConfirmModal
        isOpen={Boolean(orderToDelete)}
        onClose={() => setOrderToDelete(null)}
        onConfirm={confirmDeleteOrder}
        title="Hapus Pesanan Order"
        message={
          orderToDelete ? (
            <div className="space-y-2">
              <p>
                Apakah Anda yakin ingin menghapus pesanan{" "}
                <span className="font-bold text-[#111111] dark:text-white font-technical">
                  #{orderToDelete.id.slice(0, 8).toUpperCase()}
                </span>
                {orderToDelete.customer ? ` untuk pelanggan "${orderToDelete.customer.name}"` : ""}?
              </p>
              <p className="text-[11px] text-[#9F2F2D] dark:text-red-400 font-semibold">
                Seluruh tas dalam pesanan ini akan otomatis dikembalikan ke etalase &quot;Tersedia&quot;.
              </p>
            </div>
          ) : ""
        }
        confirmText="Ya, Hapus Pesanan"
        cancelText="Batal"
        isLoading={isDeletingOrder}
      />

      {/* Confirm Modal Release Keep Order */}
      <ConfirmModal
        isOpen={Boolean(orderToRelease)}
        onClose={() => setOrderToRelease(null)}
        onConfirm={confirmReleaseOrder}
        title="Lepas & Batalkan Keep Order"
        message={
          orderToRelease ? (
            <div className="space-y-2">
              <p>
                Apakah Anda yakin ingin melepas pesanan Keep{" "}
                <span className="font-bold text-[#111111] dark:text-white font-technical">
                  #{orderToRelease.id.slice(0, 8).toUpperCase()}
                </span>
                {orderToRelease.customer ? ` atas nama "${orderToRelease.customer.name}"` : ""}?
              </p>
              <p className="text-[11px] text-[#9F2F2D] dark:text-red-400 font-semibold">
                ⚠️ Seluruh barang dalam pesanan ini akan dilepas dan status stoknya kembali &quot;Tersedia&quot; untuk umum.
              </p>
            </div>
          ) : ""
        }
        confirmText="Ya, Lepas & Batalkan"
        cancelText="Batal"
        isLoading={isReleasingOrder}
      />

      {/* Modal Edit Item Pesanan & Real-time Grand Total */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] max-w-lg w-full p-5 space-y-4 shadow-[0_12px_40px_rgba(0,0,0,0.04)] animate-fade-in-up font-ui">
            <div className="flex justify-between items-center border-b border-[#eaeaea] dark:border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-[#111111] dark:text-[#f3f3f3] uppercase font-technical">
                Edit Item Pesanan #{editingOrder.id.slice(0, 8).toUpperCase()}
              </h3>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-xs cursor-pointer font-technical uppercase"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditOrder} className="space-y-4 text-xs">
              {/* Daftar Item Pesanan */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
                  Item Tas dalam Pesanan ({editOrderItems.length})
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {editOrderItems.map((item) => (
                    <div
                      key={item.productId}
                      className="p-3 bg-[#f9f9f8] dark:bg-[#1c1d1f] border border-[#eaeaea] dark:border-slate-800 rounded-[6px] flex items-center justify-between gap-3"
                    >
                      <div>
                        <span className="font-bold text-[#111111] dark:text-white font-technical text-sm block">
                          #{item.productId.toUpperCase()}
                        </span>
                        {item.description && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate max-w-xs">
                            {item.description}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-1.5">
                          {/* Input Ubah Harga Normal */}
                          <div className="flex items-center justify-between gap-2 bg-white dark:bg-[#141517] px-2 py-1 rounded border border-[#eaeaea] dark:border-slate-700 w-[140px]">
                            <span className="text-[9px] text-slate-400 font-technical uppercase">Harga:</span>
                            <input
                              type="number"
                              value={item.customPrice}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 0;
                                setEditOrderItems((prev) =>
                                  prev.map((i) =>
                                    i.productId === item.productId
                                      ? { ...i, customPrice: val }
                                      : i
                                  )
                                );
                              }}
                              className="w-[80px] text-right font-technical font-bold text-[11px] text-[#111111] dark:text-white focus:outline-none bg-transparent"
                            />
                          </div>

                          {/* Input Diskon Nominal */}
                          <div className="flex items-center justify-between gap-2 bg-white dark:bg-[#141517] px-2 py-1 rounded border border-[#eaeaea] dark:border-slate-700 w-[140px]">
                            <span className="text-[9px] text-rose-500 font-technical uppercase">Diskon:</span>
                            <input
                              type="number"
                              value={item.discount || ""}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 0;
                                setEditOrderItems((prev) =>
                                  prev.map((i) =>
                                    i.productId === item.productId
                                      ? { ...i, discount: val }
                                      : i
                                  )
                                );
                              }}
                              placeholder="0"
                              className="w-[80px] text-right font-technical font-bold text-[11px] text-rose-600 dark:text-rose-400 focus:outline-none bg-transparent"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItemFromEditOrder(item.productId)}
                          className="text-rose-600 hover:text-rose-700 dark:text-rose-400 text-xs p-2 rounded font-technical cursor-pointer self-start ml-1"
                          title="Hapus tas ini"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Available Product Dropdown */}
              {availableProductsForEdit.length > 0 && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#1F6C9F] dark:text-[#6cb6e4] uppercase tracking-widest font-technical">
                    + Tambah Tas dari Etalase Tersedia
                  </label>
                  <select
                    value={selectedAddProductId}
                    onChange={(e) => {
                      const prodId = e.target.value;
                      if (!prodId) return;
                      const prod = availableProductsForEdit.find((p) => p.id === prodId);
                      if (prod) handleAddItemToEditOrder(prod);
                    }}
                    className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 font-technical text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Pilih Tas yang ingin ditambahkan --</option>
                    {availableProductsForEdit.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.id.toUpperCase()} - Rp {p.price.toLocaleString("id-ID")} {p.description ? `(${p.description})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Ongkir & DP Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
                    Ongkos Kirim (Rp)
                  </label>
                  <input
                    type="number"
                    value={editShippingCost}
                    onChange={(e) => setEditShippingCost(e.target.value)}
                    className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 font-technical text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
                    DP Dibayar (Rp)
                  </label>
                  <input
                    type="number"
                    value={editDpAmount}
                    onChange={(e) => setEditDpAmount(e.target.value)}
                    className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 font-technical text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
                  Catatan Pesanan
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Catatan pesanan..."
                  className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 text-xs focus:outline-none"
                />
              </div>

              {/* Real-time Grand Total Breakdown */}
              <div className="p-3 bg-[#E1F3FE] dark:bg-[#18232c] border border-[#d2ecfc] dark:border-slate-700 rounded-[6px] space-y-1 font-technical uppercase text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Subtotal Barang:</span>
                  <span className="font-bold">
                    Rp {editOrderItems.reduce((acc, i) => acc + Math.max(0, i.customPrice - (i.discount || 0)), 0).toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Ongkir:</span>
                  <span className="font-bold">Rp {(parseInt(editShippingCost, 10) || 0).toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between items-center border-t border-[#1F6C9F]/20 dark:border-slate-700 pt-1 text-[#1F6C9F] dark:text-[#6cb6e4] font-bold">
                  <span>Grand Total Tagihan:</span>
                  <span className="text-sm">
                    Rp {(editOrderItems.reduce((acc, i) => acc + Math.max(0, i.customPrice - (i.discount || 0)), 0) + (parseInt(editShippingCost, 10) || 0)).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="w-1/3 py-2.5 bg-[#f5f5f5] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-[6px] transition-colors border border-[#eaeaea] dark:border-slate-700 cursor-pointer text-xs font-technical uppercase"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEditOrder}
                  className="flex-1 py-2.5 bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] font-bold rounded-[6px] transition-all disabled:opacity-50 cursor-pointer text-xs font-technical uppercase"
                >
                  {savingEditOrder ? "Menyimpan..." : "Simpan Perubahan Pesanan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
