"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import imageCompression from "browser-image-compression";
import { createClient } from "@/utils/supabase/client";
const supabase = createClient();
import { TableActionsMenu } from "@/components/TableActionsMenu";
import { useToast } from "@/components/ToastProvider";
import { ConfirmModal } from "@/components/ConfirmModal";

interface Product {
  id: string;
  shopId?: string | null;
  shop?: {
    id: string;
    name: string;
  } | null;
  capitalPrice: number;
  price: number;
  discount?: number;
  description?: string;
  status: string;
  photoUrl: string;
  orderId?: string | null;
  order?: {
    id: string;
    status: string;
    customer?: {
      name: string;
      whatsapp: string;
    } | null;
  } | null;
  createdAt: string;
}

interface Shop {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [shopFilter, setShopFilter] = useState("ALL");
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


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [viewingPhotoProduct, setViewingPhotoProduct] = useState<Product | null>(null);

  const [shopOrigin, setShopOrigin] = useState("");
  const [capitalPriceInput, setCapitalPriceInput] = useState<string>("");
  const [priceInput, setPriceInput] = useState<string>("");
  const [descriptionInput, setDescriptionInput] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [compressedInfo, setCompressedInfo] = useState<string | null>(null);

  const [debouncedProfit, setDebouncedProfit] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- State Confirm Modal ---
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);

  // --- State Modal Tambah Toko Cepat (Task 9) ---
  const [isNewShopModalOpen, setIsNewShopModalOpen] = useState(false);
  const [newShopNameInput, setNewShopNameInput] = useState("");
  const [savingNewShop, setSavingNewShop] = useState(false);
  const [newShopError, setNewShopError] = useState<string | null>(null);

  const handleCreateNewShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopNameInput.trim()) return;
    setSavingNewShop(true);
    setNewShopError(null);
    try {
      const res = await fetch("/api/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newShopNameInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal membuat toko baru.");
      }
      showToast(`Toko '${newShopNameInput.trim()}' berhasil ditambahkan!`, "success");
      const createdShop: Shop = data.data;
      setShops((prev) => [createdShop, ...prev]);
      if (isModalOpen) {
        setShopOrigin(createdShop.name);
      }
      setIsNewShopModalOpen(false);
      setNewShopNameInput("");
    } catch (err: any) {
      setNewShopError(err.message || "Gagal membuat toko baru.");
    } finally {
      setSavingNewShop(false);
    }
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusFilter !== "ALL" ? `/api/products?status=${statusFilter}` : "/api/products";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchShops = useCallback(async () => {
    try {
      const res = await fetch("/api/shops");
      const data = await res.json();
      if (data.success) {
        setShops(data.data);
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (isMounted) {
        await Promise.all([fetchProducts(), fetchShops()]);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [fetchProducts, fetchShops]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const capital = parseInt(capitalPriceInput, 10);
      const sell = parseInt(priceInput, 10);
      if (!isNaN(capital) && !isNaN(sell)) {
        setDebouncedProfit(sell - capital);
      } else {
        setDebouncedProfit(null);
      }
    }, 200);

    return () => clearTimeout(handler);
  }, [capitalPriceInput, priceInput]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setShopOrigin("");
    setCapitalPriceInput("");
    setPriceInput("");
    setDescriptionInput("");
    setFile(null);
    setPreviewUrl(null);
    setCompressedInfo(null);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setShopOrigin(p.shop?.name || "");
    setCapitalPriceInput(String(p.capitalPrice || 0));
    setPriceInput(String(p.price));
    setDescriptionInput(p.description || "");
    setFile(null);
    setPreviewUrl(p.photoUrl);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const processSelectedImage = async (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      showToast("Hanya file gambar (JPEG, PNG, WebP) yang diperbolehkan.", "error");
      return;
    }

    setCompressing(true);
    setCompressedInfo(null);

    try {
      const options = {
        maxSizeMB: 0.15, // Maksimal 150 KB
        maxWidthOrHeight: 1000,
        useWebWorker: true,
        fileType: "image/webp",
      };

      const origSizeKB = (selectedFile.size / 1024).toFixed(1);
      const compressedBlob = await imageCompression(selectedFile, options);

      const dotIdx = selectedFile.name.lastIndexOf(".");
      const baseName = dotIdx !== -1 ? selectedFile.name.substring(0, dotIdx) : selectedFile.name;
      const webpFile = new File([compressedBlob], `${baseName}.webp`, { type: "image/webp" });
      const compSizeKB = (webpFile.size / 1024).toFixed(1);

      setCompressedInfo(`Asli: ${origSizeKB} KB → WebP: ${compSizeKB} KB`);
      setFile(webpFile);
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(URL.createObjectURL(webpFile));
    } catch (err) {
      console.error("Gagal mengompresi foto:", err);
      setFile(selectedFile);
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } finally {
      setCompressing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processSelectedImage(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processSelectedImage(e.dataTransfer.files[0]);
    }
  };

  const handleRemovePhoto = () => {
    setFile(null);
    setCompressedInfo(null);
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(editingProduct ? editingProduct.photoUrl : null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCleanupStorage = () => {
    setIsCleanupModalOpen(true);
  };

  const confirmCleanupStorage = async () => {
    setCleaning(true);
    try {
      const res = await fetch("/api/products/cleanup", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "Pembersihan storage selesai.", "success");
        setIsCleanupModalOpen(false);
        fetchProducts();
      } else {
        showToast(data.error || "Gagal membersihkan storage.", "error");
      }
    } catch {
      showToast("Terjadi kesalahan koneksi saat membersihkan storage.", "error");
    } finally {
      setCleaning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, keepShop = false) => {
    e.preventDefault();
    if (!shopOrigin.trim()) {
      setErrorMessage("Pilih atau isi Toko Asal / Supplier terlebih dahulu.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("shopOrigin", shopOrigin.trim());
      formData.append("capitalPrice", capitalPriceInput || "0");
      formData.append("price", priceInput);
      formData.append("description", descriptionInput.trim());

      let uploadedToSupabase = false;
      if (supabase && file) {
        try {
          const fileExt = file.name.split(".").pop() || "jpg";
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
          const filePath = `bags/${fileName}`;
          const { error: uploadError } = await supabase.storage.from("products").upload(filePath, file);
          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage.from("products").getPublicUrl(filePath);
            if (publicUrlData?.publicUrl) {
              formData.append("photoUrl", publicUrlData.publicUrl);
              uploadedToSupabase = true;
            }
          }
        } catch (sErr) {
          console.warn("Upload Supabase tidak aktif, menggunakan penyimpanan lokal:", sErr);
        }
      }

      if (!file && editingProduct && editingProduct.photoUrl) {
        formData.append("photoUrl", editingProduct.photoUrl);
      }

      if (file && !uploadedToSupabase) {
        formData.append("file", file);
      }

      const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = editingProduct ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Gagal menyimpan produk.");
        showToast(data.error || "Gagal menyimpan produk.", "error");
      } else {
        if (!editingProduct && keepShop) {
          showToast(`Produk baru berhasil disimpan! Silakan input tas berikutnya untuk toko '${shopOrigin}'.`, "success");
          setCapitalPriceInput("");
          setPriceInput("");
          setDescriptionInput("");
          setFile(null);
          setPreviewUrl(null);
          setCompressedInfo(null);
          setErrorMessage(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          fetchProducts();
          fetchShops();
        } else {
          const msg = editingProduct ? "Produk berhasil diperbarui." : "Produk baru berhasil ditambahkan.";
          showToast(msg, "success");
          setIsModalOpen(false);
          fetchProducts();
          fetchShops();
        }
      }
    } catch {
      setErrorMessage("Terjadi kesalahan koneksi.");
      showToast("Terjadi kesalahan koneksi.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (p: Product) => {
    setProductToDelete(p);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeletingProduct(true);
    try {
      const res = await fetch(`/api/products/${productToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "Gagal menghapus produk.", "error");
      } else {
        showToast(`Produk ID #${productToDelete.id} berhasil dihapus.`, "success");
        setProductToDelete(null);
        fetchProducts();
      }
    } catch {
      showToast("Terjadi kesalahan koneksi saat menghapus produk.", "error");
    } finally {
      setIsDeletingProduct(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.id.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
      (p.shop?.name && p.shop.name.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
      (p.order?.customer?.name && p.order.customer.name.toLowerCase().includes(debouncedSearch.toLowerCase()));

    const matchesShop = shopFilter === "ALL" || p.shop?.name === shopFilter || p.shop?.id === shopFilter;

    return matchesSearch && matchesShop;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTableData = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#fbfbfa] dark:bg-[#0c0d0f] text-[#111111] dark:text-[#f3f3f3] font-ui transition-colors duration-200">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full pl-14 pr-4 md:px-6 h-16 bg-white dark:bg-[#141517] border-b border-[#eaeaea] dark:border-slate-800/80 z-30 sticky top-0 shrink-0 transition-colors">
        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-[#111111] dark:text-[#f3f3f3] tracking-tight uppercase font-technical">
            Katalog Inventaris Produk Tas
          </h1>
          <span className="text-[10px] text-[#787774] dark:text-slate-400 font-technical uppercase mt-0.5 tracking-wider">
            [ Product Catalog ]
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCleanupStorage}
            disabled={cleaning}
            className="h-9 px-4 bg-red-600 hover:bg-red-700 text-white rounded-[6px] font-semibold text-xs uppercase tracking-wider transition-all active:scale-95 shadow-sm cursor-pointer disabled:opacity-50 font-technical flex items-center justify-center"
          >
            {cleaning ? "Membersihkan..." : "Bersihkan Storage"}
          </button>
          <button
            type="button"
            onClick={() => {
              setNewShopNameInput("");
              setNewShopError(null);
              setIsNewShopModalOpen(true);
            }}
            className="h-9 px-4 bg-[#f5f5f5] hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-[6px] font-semibold text-xs uppercase tracking-wider transition-all border border-[#eaeaea] dark:border-slate-700 active:scale-95 shadow-sm cursor-pointer flex items-center justify-center font-technical"
          >
            Buat Toko
          </button>
          <button
            onClick={openCreateModal}
            className="h-9 px-4 bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] rounded-[6px] font-semibold text-xs uppercase tracking-wider transition-all active:scale-95 shadow-sm cursor-pointer font-technical flex items-center justify-center"
          >
            Tambah Produk
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 bg-[#fbfbfa] dark:bg-[#0c0d0f] w-full pb-8 space-y-6">

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 p-5 rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {[
              { label: "Semua Produk", value: "ALL" },
              { label: "Tersedia", value: "Tersedia" },
              { label: "Dibooking", value: "Dibooking" },
              { label: "Terjual", value: "Terjual" },
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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Dropdown Filter Toko */}
            <select
              value={shopFilter}
              onChange={(e) => {
                setShopFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white text-xs h-9 px-3 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-technical font-medium cursor-pointer"
            >
              <option value="ALL">Semua Toko / Supplier</option>
              {shops.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Cari ID, deskripsi, toko, pembeli..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full sm:w-64 h-9 bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs px-3.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-technical"
            />
          </div>
        </div>

        {/* Products Table View */}
        <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-colors">
          {loading ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs font-technical uppercase">[ Loading produk... ]</div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs font-technical uppercase">
              Tidak ada produk yang ditemukan.
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
              <table className="w-full text-center text-xs text-slate-700 dark:text-slate-300 border-collapse">
                <thead className="bg-[#F9F9F8] dark:bg-slate-900/60 border-b border-[#eaeaea] dark:border-slate-800 text-[10px] text-[#787774] dark:text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4 text-center">Foto</th>
                    <th className="p-4 text-center">ID Tas</th>
                    <th className="p-4 text-center">Deskripsi</th>
                    <th className="p-4 text-center">Toko Asal</th>
                    <th className="p-4 text-center">Harga Modal</th>
                    <th className="p-4 text-center">Harga Jual</th>
                    <th className="p-4 text-center">Profit Margin</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Pembeli / Pembook</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f1f1] dark:divide-slate-800 font-technical text-xs text-slate-800 dark:text-slate-200">
                  {currentTableData.map((p) => {
                    const profit = p.price - (p.capitalPrice || 0);
                    let statusBg = "bg-[#f5f5f5] text-slate-700 dark:bg-slate-800 dark:text-slate-300"; // default
                    
                    if (p.status === "Tersedia" || p.status === "Available") {
                      statusBg = "bg-[#EDF3EC] text-[#346538]"; // Pastel Green
                    } else if (p.status === "Dibooking" || p.status === "Booked" || p.status === "DP") {
                      statusBg = "bg-[#E1F3FE] text-[#1F6C9F]"; // Pastel Blue
                    } else if (p.status === "Terjual" || p.status === "Sold") {
                      statusBg = "bg-[#FDEBEC] text-[#9F2F2D]"; // Pastel Red
                    }

                    return (
                      <tr key={p.id} className="hover:bg-[#F9F9F8] dark:hover:bg-slate-900/20 transition-colors">
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => setViewingPhotoProduct(p)}
                            className="w-12 h-12 rounded-[4px] bg-[#fbfbfa] dark:bg-slate-900 border border-[#eaeaea] dark:border-slate-800 overflow-hidden relative flex items-center justify-center mx-auto hover:opacity-80 transition-all cursor-pointer"
                            title="Klik untuk lihat foto detail"
                          >
                            {p.photoUrl && p.photoUrl !== "/uploads/placeholder.jpg" ? (
                              <Image src={p.photoUrl} alt={p.id} fill sizes="48px" className="object-cover" />
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-bold text-xs uppercase font-technical">Tas</span>
                            )}
                          </button>
                        </td>
                        <td className="p-4 text-center font-bold text-[#111111] dark:text-[#f3f3f3]">
                          <button
                            type="button"
                            onClick={() => setViewingPhotoProduct(p)}
                            className="hover:underline font-technical"
                          >
                            #{p.id.toUpperCase()}
                          </button>
                        </td>
                        <td className="p-4 text-center max-w-[150px] truncate text-slate-500 dark:text-slate-400 font-medium" title={p.description || "-"}>
                          {p.description || "-"}
                        </td>
                        <td className="p-4 text-center font-semibold text-[#111111] dark:text-[#f3f3f3] uppercase">
                          {p.shop?.name || "-"}
                        </td>
                        <td className="p-4 text-center text-slate-400 dark:text-slate-500">
                          Rp {(p.capitalPrice || 0).toLocaleString("id-ID")}
                        </td>
                        <td className="p-4 text-center font-bold text-[#111111] dark:text-[#f3f3f3]">
                          Rp {p.price.toLocaleString("id-ID")}
                        </td>
                        <td className="p-4 text-center font-bold text-[#346538] dark:text-[#a0cfa4]">
                          +Rp {profit.toLocaleString("id-ID")}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${statusBg} inline-block`}>
                            {p.status === "Available" ? "Tersedia" : p.status === "Booked" ? "Dibooking" : p.status === "Sold" ? "Terjual" : p.status.toUpperCase()}
                          </span>
                        </td>
                        
                        <td className="p-4 text-center">
                          {p.status === "Tersedia" || p.status === "Available" || !p.order?.customer ? (
                            <span className="text-slate-300 dark:text-slate-600 font-normal">-</span>
                          ) : p.status === "Dibooking" || p.status === "Booked" || p.status === "DP" || p.status === "Menunggu" ? (
                            <div className="font-ui">
                              <span className="text-[9px] text-[#1F6C9F] font-bold block uppercase tracking-wider">Dibooking oleh:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{p.order.customer.name}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-technical">{p.order.customer.whatsapp}</span>
                            </div>
                          ) : (
                            <div className="font-ui">
                              <span className="text-[9px] text-[#9F2F2D] font-bold block uppercase tracking-wider">Dibeli oleh:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{p.order.customer.name}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-technical">{p.order.customer.whatsapp}</span>
                            </div>
                          )}
                        </td>

                        <td className="p-4 text-center">
                          <TableActionsMenu
                            items={[
                              {
                                label: "Lihat Detail Foto",
                                icon: "visibility",
                                onClick: () => setViewingPhotoProduct(p),
                              },
                              {
                                label: "Edit Produk",
                                icon: "edit",
                                onClick: () => openEditModal(p),
                              },
                              {
                                label: "Hapus Produk",
                                icon: "delete",
                                danger: true,
                                onClick: () => handleDelete(p),
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

            {/* Navigasi Pagination */}
            {filteredProducts.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#fbfbfa] dark:bg-slate-900/60 p-4 border-t border-[#eaeaea] dark:border-slate-800 font-technical uppercase">
                <span className="text-[10px] text-slate-500 dark:text-slate-450">
                  Menampilkan <span className="font-bold text-[#111111] dark:text-white">{startIndex + 1}</span> -{" "}
                  <span className="font-bold text-[#111111] dark:text-white">
                    {Math.min(startIndex + itemsPerPage, filteredProducts.length)}
                  </span>{" "}
                  dari total <span className="font-bold text-[#111111] dark:text-white">{filteredProducts.length}</span> produk
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
      </div>

      {/* Modal Detail Foto Product Lightbox */}
      {viewingPhotoProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] max-w-xl w-full p-6 space-y-4 shadow-[0_12px_40px_rgba(0,0,0,0.04)] overflow-hidden transition-colors animate-fade-in-up font-ui">
            <div className="flex justify-between items-center border-b border-[#eaeaea] dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#111111] dark:text-[#f3f3f3] font-technical uppercase">
                  Detail Foto Produk #{viewingPhotoProduct.id.toUpperCase()}
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase mt-0.5">Supplier Toko: {viewingPhotoProduct.shop?.name || "-"}</p>
              </div>
              <button
                onClick={() => setViewingPhotoProduct(null)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white uppercase tracking-wider cursor-pointer"
              >
                Tutup
              </button>
            </div>

            {/* High-res Image Preview */}
            <div className="w-full h-72 bg-[#fbfbfa] dark:bg-slate-900 rounded-[6px] overflow-hidden relative border border-[#eaeaea] dark:border-slate-800/80 flex items-center justify-center">
              {viewingPhotoProduct.photoUrl && viewingPhotoProduct.photoUrl !== "/uploads/placeholder.jpg" ? (
                <Image src={viewingPhotoProduct.photoUrl} alt={viewingPhotoProduct.id} fill sizes="600px" className="object-contain" />
              ) : (
                <span className="text-slate-300 dark:text-slate-600 text-xs uppercase font-technical">[ Tidak ada foto produk ]</span>
              )}
            </div>

            {/* Customer Buyer Notice in Lightbox */}
            {viewingPhotoProduct.order?.customer && (
              <div className="p-3 bg-[#E1F3FE] text-[#1F6C9F] rounded-[6px] border border-[#d2ecfc] text-xs flex justify-between items-center font-technical uppercase tracking-tight">
                <span className="font-bold">
                  {viewingPhotoProduct.status === "Terjual" ? "Dibeli Oleh:" : "Dibooking Oleh:"}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {viewingPhotoProduct.order.customer.name} ({viewingPhotoProduct.order.customer.whatsapp})
                </span>
              </div>
            )}

            {/* Price Details Grid */}
            <div className="grid grid-cols-3 gap-3 text-xs font-technical text-center pt-2">
              <div className="p-2.5 bg-[#f5f5f5] dark:bg-[#1c1d1f] border border-[#eaeaea] dark:border-slate-800 rounded-[6px]">
                <span className="text-[9px] text-[#787774] dark:text-slate-400 font-bold block uppercase tracking-wider">Harga Modal</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">Rp {(viewingPhotoProduct.capitalPrice || 0).toLocaleString("id-ID")}</span>
              </div>
              <div className="p-2.5 bg-[#f5f5f5] dark:bg-[#1c1d1f] border border-[#eaeaea] dark:border-slate-800 rounded-[6px]">
                <span className="text-[9px] text-[#787774] dark:text-slate-400 font-bold block uppercase tracking-wider">Harga Jual</span>
                <span className="font-bold text-[#111111] dark:text-white">Rp {viewingPhotoProduct.price.toLocaleString("id-ID")}</span>
              </div>
              <div className="p-2.5 bg-[#EDF3EC] text-[#346538] border border-[#cbe1cc] rounded-[6px]">
                <span className="text-[9px] font-bold block uppercase tracking-wider">Profit Margin</span>
                <span className="font-bold">+Rp {(viewingPhotoProduct.price - (viewingPhotoProduct.capitalPrice || 0)).toLocaleString("id-ID")}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#eaeaea] dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const target = viewingPhotoProduct;
                  setViewingPhotoProduct(null);
                  openEditModal(target);
                }}
                className="px-4 py-2 bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] font-semibold text-xs rounded-[6px] tracking-wide uppercase cursor-pointer"
              >
                Edit Produk Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit Produk */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] max-w-lg w-full p-6 space-y-4 shadow-[0_12px_40px_rgba(0,0,0,0.04)] overflow-y-auto max-h-[90vh] transition-colors animate-fade-in-up font-ui">
            <div className="flex justify-between items-center border-b border-[#eaeaea] dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-[#111111] dark:text-[#f3f3f3] uppercase font-technical">
                {editingProduct ? `Edit Produk [${editingProduct.id}]` : "Tambah Produk Tas Baru"}
              </h3>
            </div>

            {errorMessage && (
              <div className="p-3 bg-[#FDEBEC] text-[#9F2F2D] border border-[#f5c2c2] rounded-[6px] text-xs font-semibold text-center font-technical">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-ui">
              
              {/* Product ID Notice */}
              {editingProduct ? (
                <div className="p-2.5 bg-white dark:bg-[#1c1d1f] border border-[#eaeaea] dark:border-slate-800 rounded-[6px] text-xs font-technical font-bold text-[#111111] dark:text-white flex justify-between items-center">
                  <span>ID TAS (CUSTOM):</span>
                  <span>#{editingProduct.id.toUpperCase()}</span>
                </div>
              ) : (
                <div className="p-2.5 bg-[#E1F3FE] text-[#1F6C9F] rounded-[6px] text-[10px] font-technical uppercase">
                  ID Tas akan di-generate otomatis berdasarkan Toko Asal & tanggal input (misal: SKR-260811-01)
                </div>
              )}

              {/* Row 1: Toko Asal (Supplier) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
                    Toko Asal / Supplier *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setNewShopNameInput("");
                      setNewShopError(null);
                      setIsNewShopModalOpen(true);
                    }}
                    className="text-[10px] text-[#1F6C9F] dark:text-[#6cb6e4] font-bold hover:bg-[#d2ecfc] dark:hover:bg-[#1f303d] uppercase font-technical cursor-pointer flex items-center gap-1 bg-[#E1F3FE] dark:bg-[#18232c] px-2 py-0.5 rounded-[4px] border border-[#c5e6fb] dark:border-slate-700 transition-all"
                  >
                    <span>+ Toko</span>
                  </button>
                </div>
                <input
                  type="text"
                  list="shops-options"
                  value={shopOrigin}
                  onChange={(e) => setShopOrigin(e.target.value)}
                  placeholder="Pilih atau ketik nama toko..."
                  required
                  className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-semibold"
                />
                <datalist id="shops-options">
                  {shops.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              </div>

              {/* Row 2: Harga Modal & Harga Jual */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Harga Modal (Rp)</label>
                  <input
                    type="number"
                    value={capitalPriceInput}
                    onChange={(e) => setCapitalPriceInput(e.target.value)}
                    placeholder="Contoh: 70000"
                    className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-technical"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Harga Jual (Rp) *</label>
                  <input
                    type="number"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    placeholder="Contoh: 95000"
                    required
                    className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-technical font-semibold"
                  />
                </div>
              </div>

              {/* Debounced Profit Margin Badge */}
              {debouncedProfit !== null && (
                <div className="p-2.5 rounded-[6px] bg-[#EDF3EC] text-[#346538] border border-[#cbe1cc] text-[11px] font-technical font-semibold flex justify-between items-center">
                  <span>ESTIMASI PROFIT MARGIN:</span>
                  <span>+Rp {debouncedProfit.toLocaleString("id-ID")}</span>
                </div>
              )}

              {/* Row 3: Deskripsi Produk */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Deskripsi Produk Tas</label>
                <textarea
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  placeholder="Contoh: Bahan kulit sintetis, warna hitam, kondisi mulus 95%"
                  rows={2}
                  className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none text-xs font-medium"
                />
              </div>

              {/* Row 4: Upload & Drag-and-Drop Foto Tas */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
                    Foto Produk Tas (Kamera / Galeri / Drag & Drop)
                  </label>
                  {previewUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="text-[10px] text-red-600 dark:text-red-400 font-bold hover:underline uppercase font-technical cursor-pointer flex items-center gap-0.5"
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>

                {/* Drag and Drop Box Dropzone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-[8px] p-4 text-center transition-all ${
                    isDragging
                      ? "border-[#1F6C9F] bg-[#E1F3FE]/40 dark:bg-[#18232c]/50 scale-[1.01]"
                      : previewUrl
                      ? "border-[#eaeaea] dark:border-slate-800 bg-[#fbfbfa] dark:bg-[#141517]"
                      : "border-[#eaeaea] dark:border-slate-800 bg-[#fbfbfa] dark:bg-[#141517]"
                  }`}
                >
                  {/* Hidden Inputs */}
                  <input
                    type="file"
                    id="product-photo-file-input"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    disabled={compressing}
                    className="hidden"
                  />
                  <input
                    type="file"
                    id="product-photo-camera-input"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    disabled={compressing}
                    className="hidden"
                  />

                  {previewUrl ? (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-[6px] overflow-hidden border border-[#eaeaea] dark:border-slate-800 relative shrink-0 shadow-sm">
                        <Image src={previewUrl} alt="Preview" fill sizes="80px" className="object-cover" />
                      </div>
                      <div className="text-left space-y-1.5 min-w-0">
                        <p className="text-xs font-bold text-[#111111] dark:text-white font-technical truncate">
                          {file ? file.name : "Foto Produk Saat Ini"}
                        </p>
                        {compressedInfo && (
                          <span className="inline-block text-[9px] font-bold text-[#1F6C9F] dark:text-[#6cb6e4] bg-[#E1F3FE] dark:bg-[#18232c] px-2 py-0.5 rounded font-technical uppercase">
                            {compressedInfo}
                          </span>
                        )}
                        <div className="flex gap-2 pt-1">
                          <label
                            htmlFor="product-photo-camera-input"
                            className="px-2.5 py-1 bg-[#1F6C9F] hover:bg-[#195781] text-white font-bold rounded-[4px] text-[10px] uppercase font-technical cursor-pointer flex items-center gap-1 shadow-sm transition-all"
                          >
                            📷 Foto Kamera
                          </label>
                          <label
                            htmlFor="product-photo-file-input"
                            className="px-2.5 py-1 bg-[#f5f5f5] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-[4px] text-[10px] uppercase font-technical cursor-pointer border border-[#eaeaea] dark:border-slate-700 flex items-center gap-1 transition-all"
                          >
                            🖼️ Ganti Galeri
                          </label>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-2 space-y-2 text-slate-500 dark:text-slate-400">
                      <div className="w-10 h-10 rounded-full bg-[#f5f5f5] dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                        <span className="material-symbols-outlined text-xl">add_photo_alternate</span>
                      </div>
                      <p className="text-xs font-bold text-[#111111] dark:text-white font-technical uppercase">
                        Upload Foto Produk
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-technical">
                        Pilih foto dari Kamera HP langsung atau dari Galeri (Otomatis Kompres &lt; 150 KB)
                      </p>

                      {/* Tombol Pilihan Kamera vs Galeri */}
                      <div className="flex gap-2 pt-1.5">
                        <label
                          htmlFor="product-photo-camera-input"
                          className="px-3.5 py-2 bg-[#1F6C9F] hover:bg-[#195781] text-white font-bold rounded-[6px] text-[11px] uppercase font-technical cursor-pointer flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          📷 Ambil Foto Kamera
                        </label>
                        <label
                          htmlFor="product-photo-file-input"
                          className="px-3.5 py-2 bg-[#f5f5f5] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-[6px] text-[11px] uppercase font-technical cursor-pointer border border-[#eaeaea] dark:border-slate-700 flex items-center gap-1.5 transition-all"
                        >
                          🖼️ Pilih dari Galeri
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                  {compressing && (
                    <p className="text-xs text-[#1F6C9F] dark:text-[#6cb6e4] font-bold mt-2 animate-pulse font-technical">
                      ⚡ MENGOMPRESI FOTO DI BROWSER (&lt; 150 KB, WEBP)...
                    </p>
                  )}
                </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-3 border-t border-[#eaeaea] dark:border-slate-800/80 text-xs">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="sm:w-1/4 py-2.5 bg-[#f5f5f5] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-[6px] transition-colors border border-[#eaeaea] dark:border-slate-700 cursor-pointer font-technical uppercase text-[11px]"
                >
                  Batal
                </button>
                {!editingProduct && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={(e) => handleSubmit(e, true)}
                    className="flex-1 py-2.5 bg-[#E1F3FE] hover:bg-[#d2ecfc] dark:bg-[#18232c] dark:hover:bg-[#1f303d] text-[#1F6C9F] dark:text-[#a2d8fa] font-bold rounded-[6px] transition-all disabled:opacity-50 border border-[#c5e6fb] dark:border-slate-700 cursor-pointer font-technical uppercase text-[11px] flex items-center justify-center gap-1"
                  >
                    <span>Tambah 1 Lagi di Toko Ini</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={saving}
                  onClick={(e) => handleSubmit(e, false)}
                  className="flex-1 py-2.5 bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] font-bold rounded-[6px] transition-all disabled:opacity-50 cursor-pointer font-technical uppercase text-[11px]"
                >
                  {saving ? "Menyimpan..." : editingProduct ? "Simpan Perubahan" : "Simpan & Selesai"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Toko Cepat (Task 9) */}
      {isNewShopModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={() => setIsNewShopModalOpen(false)}>
          <div
            className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] max-w-sm w-full p-6 space-y-4 shadow-[0_12px_40px_rgba(0,0,0,0.08)] animate-fade-in-up font-ui"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-[#eaeaea] dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-[#111111] dark:text-[#f3f3f3] uppercase font-technical">
                Tambah Toko / Supplier
              </h3>
              <button
                type="button"
                onClick={() => setIsNewShopModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {newShopError && (
              <div className="p-3 bg-[#FDEBEC] text-[#9F2F2D] border border-[#f5c2c2] rounded-[6px] text-xs font-semibold font-technical">
                {newShopError}
              </div>
            )}

            <form onSubmit={handleCreateNewShop} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
                  Nama Toko / Supplier *
                </label>
                <input
                  type="text"
                  value={newShopNameInput}
                  onChange={(e) => setNewShopNameInput(e.target.value)}
                  placeholder="Contoh: Sukaraja Store, Supplier Batam"
                  required
                  autoFocus
                  className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewShopModalOpen(false)}
                  className="w-1/3 py-2 bg-[#f5f5f5] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-[6px] transition-colors border border-[#eaeaea] dark:border-slate-700 cursor-pointer uppercase font-technical text-[10px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingNewShop}
                  className="flex-1 py-2 bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] font-bold rounded-[6px] transition-all disabled:opacity-50 cursor-pointer uppercase font-technical text-[10px]"
                >
                  {savingNewShop ? "Menyimpan..." : "Simpan Toko"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal Hapus Produk */}
      <ConfirmModal
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        onConfirm={confirmDeleteProduct}
        title="Hapus Produk Tas"
        message={
          productToDelete ? (
            <div className="space-y-2">
              <p>
                Apakah Anda yakin ingin menghapus produk tas{" "}
                <span className="font-bold text-[#111111] dark:text-white font-technical">
                  #{productToDelete.id.toUpperCase()}
                </span>
                {productToDelete.description ? ` (${productToDelete.description})` : ""}?
              </p>
              <p className="text-[11px] text-[#9F2F2D] dark:text-red-400 font-semibold">
                Produk ini akan dihapus permanen dari inventaris dan etalase toko.
              </p>
            </div>
          ) : ""
        }
        confirmText="Ya, Hapus Produk"
        cancelText="Batal"
        isLoading={isDeletingProduct}
      />

      {/* Confirm Modal Bersihkan Storage */}
      <ConfirmModal
        isOpen={isCleanupModalOpen}
        onClose={() => setIsCleanupModalOpen(false)}
        onConfirm={confirmCleanupStorage}
        title="Bersihkan Storage Foto"
        message={
          <div className="space-y-2">
            <p>
              Tindakan ini akan menghapus semua file foto fisik produk berstatus{" "}
              <span className="font-bold text-[#111111] dark:text-white font-technical">
                &quot;Terjual&quot;
              </span>{" "}
              yang berumur lebih dari 3 bulan dari Storage Supabase.
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              URL foto pada riwayat order lama akan digantikan dengan gambar arsip agar menghemat kuota penyimpanan.
            </p>
          </div>
        }
        confirmText="Bersihkan Sekarang"
        cancelText="Batal"
        isLoading={cleaning}
      />
    </div>
  );
}
