"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import imageCompression from "browser-image-compression";
import { createClient } from "@/utils/supabase/client";
const supabase = createClient();
import { TableActionsMenu } from "@/components/TableActionsMenu";
import { useToast } from "@/components/ToastProvider";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const originalFile = e.target.files[0];
      setCompressing(true);
      setCompressedInfo(null);

      try {
        const options = {
          maxSizeMB: 0.15, // Turunkan maksimal jadi 150 KB
          maxWidthOrHeight: 1000, 
          useWebWorker: true,
          fileType: "image/webp",
        };

        const origSizeKB = (originalFile.size / 1024).toFixed(1);
        const compressedBlob = await imageCompression(originalFile, options);
        
        const dotIdx = originalFile.name.lastIndexOf('.');
        const baseName = dotIdx !== -1 ? originalFile.name.substring(0, dotIdx) : originalFile.name;
        const webpFile = new File([compressedBlob], `${baseName}.webp`, { type: "image/webp" });
        const compSizeKB = (webpFile.size / 1024).toFixed(1);

        setCompressedInfo(`Ukuran Asli: ${origSizeKB} KB | Dikompresi: ${compSizeKB} KB`);
        setFile(webpFile);
        if (previewUrl && previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(URL.createObjectURL(webpFile));
      } catch (err) {
        console.error("Gagal mengompresi foto:", err);
        setFile(originalFile);
        if (previewUrl && previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(URL.createObjectURL(originalFile));
      } finally {
        setCompressing(false);
      }
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

  const handleCleanupStorage = async () => {
    if (!confirm("Apakah Anda yakin ingin membersihkan storage? Tindakan ini akan menghapus semua file foto fisik produk berstatus 'Terjual' yang berumur lebih dari 3 bulan dari Storage, lalu mengganti URL-nya dengan gambar placeholder.")) return;
    
    setCleaning(true);
    try {
      const res = await fetch("/api/products/cleanup", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "Pembersihan storage selesai.", "success");
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

  const handleSubmit = async (e: React.FormEvent) => {
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
        const msg = editingProduct ? "Produk berhasil diperbarui." : "Produk baru berhasil ditambahkan.";
        showToast(msg, "success");
        setIsModalOpen(false);
        fetchProducts();
      }
    } catch {
      setErrorMessage("Terjadi kesalahan koneksi.");
      showToast("Terjadi kesalahan koneksi.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus produk tas ID #${p.id}?`)) return;

    try {
      const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "Gagal menghapus produk.", "error");
      } else {
        showToast(`Produk ID #${p.id} berhasil dihapus.`, "success");
        fetchProducts();
      }
    } catch {
      showToast("Terjadi kesalahan koneksi saat menghapus produk.", "error");
    }
  };

  const filteredProducts = products.filter((p) =>
    p.id.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    (p.shop?.name && p.shop.name.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
    (p.order?.customer?.name && p.order.customer.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTableData = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#fbfbfa] dark:bg-[#0c0d0f] text-[#111111] dark:text-[#f3f3f3] font-ui transition-colors duration-200">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full px-6 h-16 bg-white dark:bg-[#141517] border-b border-[#eaeaea] dark:border-slate-800/80 z-30 sticky top-0 shrink-0 transition-colors">
        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-[#111111] dark:text-[#f3f3f3] tracking-tight uppercase font-technical">
            Katalog Inventaris Produk Tas
          </h1>
          <span className="text-[10px] text-[#787774] dark:text-slate-400 font-technical uppercase mt-0.5 tracking-wider">
            [ Product Catalog ]
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCleanupStorage}
            disabled={cleaning}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-[6px] font-semibold text-xs uppercase tracking-wider transition-colors active:scale-95 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {cleaning ? "Membersihkan..." : "Bersihkan Storage"}
          </button>
          <button
            onClick={openCreateModal}
            className="bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] px-4 py-2 rounded-[6px] font-semibold text-xs uppercase tracking-wider transition-colors active:scale-95 shadow-sm cursor-pointer"
          >
            Tambah Produk Baru
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 bg-[#fbfbfa] dark:bg-[#0c0d0f] w-full pb-8 space-y-6">

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 p-5 rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
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

          <input
            type="text"
            placeholder="Cari ID produk, toko, pembeli..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full sm:w-64 bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs px-3.5 py-2 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-technical"
          />
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
                <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Toko Asal / Supplier *</label>
                <input
                  type="text"
                  list="shops-options"
                  value={shopOrigin}
                  onChange={(e) => setShopOrigin(e.target.value)}
                  placeholder="Pilih atau ketik nama toko baru..."
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

              {/* Row 4: Upload Foto Tas */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Foto Produk Tas</label>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  disabled={compressing}
                  className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-[4px] file:border file:border-[#eaeaea] dark:file:border-slate-700 file:text-xs file:font-semibold file:bg-white dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200 hover:file:bg-[#f5f5f5] disabled:opacity-50"
                />
                {compressing && (
                  <p className="text-xs text-slate-500 font-bold mt-1.5 animate-pulse font-technical">
                    ⚡ MENGOMPRESI FOTO DI BROWSER (&lt; 150 KB, WEBP)...
                  </p>
                )}
                {compressedInfo && !compressing && (
                  <p className="text-[10px] text-[#1F6C9F] font-technical font-bold mt-1.5 bg-[#E1F3FE] p-2 rounded-[6px] border border-[#d2ecfc] uppercase tracking-wide">
                    {compressedInfo}
                  </p>
                )}
              </div>

              {/* Preview Foto */}
              {previewUrl && (
                <div className="w-24 h-24 bg-[#fbfbfa] dark:bg-slate-900 rounded-[6px] overflow-hidden border border-[#eaeaea] dark:border-slate-800/80 relative mx-auto">
                  <Image src={previewUrl} alt="Preview" fill sizes="96px" className="object-cover" />
                  {/* Tombol Hapus/Batal Silang Merah (Hanya muncul jika file baru dipilih) */}
                  {file && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute top-1 right-1 bg-red-600 hover:bg-red-750 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-sm transition-all cursor-pointer"
                      title="Batal pilih foto ini"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-[#eaeaea] dark:border-slate-800/80 text-xs">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 bg-[#f5f5f5] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-[6px] transition-colors border border-[#eaeaea] dark:border-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 py-2.5 bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] font-bold rounded-[6px] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Menyimpan..." : "Simpan Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
