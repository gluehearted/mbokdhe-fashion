"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import imageCompression from "browser-image-compression";
import { supabase } from "@/lib/supabase";
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
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [viewingPhotoProduct, setViewingPhotoProduct] = useState<Product | null>(null);

  const [id, setId] = useState("");
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
    setId("");
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
    setId(p.id);
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
          maxSizeMB: 0.3, // Maksimal 300 KB
          maxWidthOrHeight: 1200, // Maksimal dimensi gambar 1200px
          useWebWorker: true,
        };

        const origSizeKB = (originalFile.size / 1024).toFixed(1);
        const compressedFile = await imageCompression(originalFile, options);
        const compSizeKB = (compressedFile.size / 1024).toFixed(1);

        setCompressedInfo(`Ukuran Asli: ${origSizeKB} KB ➔ Dikompresi: ${compSizeKB} KB (<300 KB)`);
        setFile(compressedFile);
        setPreviewUrl(URL.createObjectURL(compressedFile));
      } catch (err) {
        console.error("Gagal mengompresi foto:", err);
        setFile(originalFile);
        setPreviewUrl(URL.createObjectURL(originalFile));
      } finally {
        setCompressing(false);
      }
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
      formData.append("capitalPrice", capitalPriceInput);
      formData.append("price", priceInput);
      formData.append("description", descriptionInput.trim());

      // If Supabase Storage is configured, upload directly to Supabase
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
            }
          }
        } catch (sErr) {
          console.warn("Upload Supabase tidak aktif, menggunakan penyimpanan lokal:", sErr);
        }
      }

      if (file) {
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
    p.id.toLowerCase().includes(search.toLowerCase()) ||
    (p.shop?.name && p.shop.name.toLowerCase().includes(search.toLowerCase())) ||
    (p.order?.customer?.name && p.order.customer.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#f8fafc]">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full px-6 h-16 bg-white border-b border-slate-200 z-30 sticky top-0 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-blue-700 tracking-tight">Katalog Inventaris Produk Tas</h1>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors active:scale-95 shadow-sm"
        >
          Tambah Produk Baru
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 bg-[#f8fafc] w-full pb-8 space-y-6">

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {[
              { label: "Semua Produk", value: "ALL" },
              { label: "Tersedia", value: "Tersedia" },
              { label: "Dibooking", value: "Dibooking" },
              { label: "Terjual", value: "Terjual" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  statusFilter === tab.value
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Cari ID produk, toko, pembeli..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 bg-slate-50 text-slate-800 text-xs px-3.5 py-2 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-mono"
          />
        </div>

        {/* Products Table View */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">Loading produk...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              Tidak ada produk yang ditemukan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
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
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredProducts.map((p) => {
                    const profit = p.price - (p.capitalPrice || 0);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => setViewingPhotoProduct(p)}
                            className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden relative flex items-center justify-center mx-auto hover:opacity-85 transition-all shadow-sm"
                            title="Klik untuk lihat foto detail"
                          >
                            {p.photoUrl && p.photoUrl !== "/uploads/placeholder.jpg" ? (
                              <Image src={p.photoUrl} alt={p.id} fill sizes="48px" className="object-cover" />
                            ) : (
                              <span className="text-slate-400 font-bold text-xs">Tas</span>
                            )}
                          </button>
                        </td>
                        <td className="p-4 text-center font-mono font-extrabold text-blue-600">
                          <button
                            type="button"
                            onClick={() => setViewingPhotoProduct(p)}
                            className="hover:underline"
                          >
                            #{p.id}
                          </button>
                        </td>
                        <td className="p-4 text-center max-w-[150px] truncate text-slate-600 font-medium" title={p.description || "-"}>
                          {p.description || "-"}
                        </td>
                        <td className="p-4 text-center font-bold text-slate-900">
                          {p.shop?.name || "-"}
                        </td>
                        <td className="p-4 text-center font-mono text-slate-600">
                          Rp {(p.capitalPrice || 0).toLocaleString("id-ID")}
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-slate-900">
                          Rp {p.price.toLocaleString("id-ID")}
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-blue-700">
                          +Rp {profit.toLocaleString("id-ID")}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase shadow-sm inline-block ${
                              p.status === "Tersedia" || p.status === "Available"
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {p.status === "Available" ? "Tersedia" : p.status === "Booked" ? "Dibooking" : p.status === "Sold" ? "Terjual" : p.status}
                          </span>
                        </td>
                        
                        {/* Keterangan Pembeli / Pembook */}
                        <td className="p-4 text-center">
                          {p.status === "Tersedia" || p.status === "Available" || !p.order?.customer ? (
                            <span className="text-slate-400 font-normal">-</span>
                          ) : p.status === "Dibooking" || p.status === "Booked" || p.status === "DP" || p.status === "Menunggu" ? (
                            <div>
                              <span className="text-[10px] text-blue-700 font-bold block uppercase">Dibooking oleh:</span>
                              <span className="font-bold text-slate-900">{p.order.customer.name}</span>
                              <span className="text-[11px] text-slate-500 block font-mono">{p.order.customer.whatsapp}</span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-[10px] text-blue-800 font-bold block uppercase">Dibeli oleh:</span>
                              <span className="font-bold text-slate-900">{p.order.customer.name}</span>
                              <span className="text-[11px] text-slate-500 block font-mono">{p.order.customer.whatsapp}</span>
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
          )}
        </div>
      </div>

      {/* Modal Detail Foto Product Lightbox */}
      {viewingPhotoProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-blue-700 font-mono">
                  Detail Foto Produk #{viewingPhotoProduct.id}
                </h3>
                <p className="text-xs text-slate-500 font-medium">Supplier Toko: {viewingPhotoProduct.shop?.name || "-"}</p>
              </div>
              <button
                onClick={() => setViewingPhotoProduct(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm px-2 py-1"
              >
                Tutup
              </button>
            </div>

            {/* High-res Image Preview */}
            <div className="w-full h-72 bg-slate-100 rounded-xl overflow-hidden relative border border-slate-200 flex items-center justify-center">
              {viewingPhotoProduct.photoUrl && viewingPhotoProduct.photoUrl !== "/uploads/placeholder.jpg" ? (
                <Image src={viewingPhotoProduct.photoUrl} alt={viewingPhotoProduct.id} fill sizes="600px" className="object-contain" />
              ) : (
                <span className="text-slate-400 font-bold text-sm">Tidak ada foto produk</span>
              )}
            </div>

            {/* Customer Buyer Notice in Lightbox */}
            {viewingPhotoProduct.order?.customer && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs flex justify-between items-center">
                <span className="text-blue-700 font-bold uppercase">
                  {viewingPhotoProduct.status === "Terjual" ? "Dibeli Oleh:" : "Dibooking Oleh:"}
                </span>
                <span className="font-bold text-slate-900">
                  {viewingPhotoProduct.order.customer.name} ({viewingPhotoProduct.order.customer.whatsapp})
                </span>
              </div>
            )}

            {/* Price Details Grid */}
            <div className="grid grid-cols-3 gap-3 text-xs font-mono text-center pt-2">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Harga Modal</span>
                <span className="font-bold text-slate-700">Rp {(viewingPhotoProduct.capitalPrice || 0).toLocaleString("id-ID")}</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Harga Jual</span>
                <span className="font-extrabold text-slate-900">Rp {viewingPhotoProduct.price.toLocaleString("id-ID")}</span>
              </div>
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-[10px] text-blue-700 font-bold block uppercase">Profit Margin</span>
                <span className="font-extrabold text-blue-700">+Rp {(viewingPhotoProduct.price - (viewingPhotoProduct.capitalPrice || 0)).toLocaleString("id-ID")}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const target = viewingPhotoProduct;
                  setViewingPhotoProduct(null);
                  openEditModal(target);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors"
              >
                Edit Produk Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Tambah/Edit Produk */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingProduct ? `Edit Produk [${editingProduct.id}]` : "Tambah Produk Tas Baru"}
              </h3>
            </div>

            {errorMessage && (
              <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl text-blue-900 text-xs font-bold">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              {/* Product ID Notice */}
              {editingProduct ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-blue-700 flex justify-between items-center">
                  <span>ID TAS (CUSTOM):</span>
                  <span>#{editingProduct.id}</span>
                </div>
              ) : (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-medium text-blue-800">
                  ID Tas akan di-generate otomatis berdasarkan Toko Asal & tanggal input (misal: SKR-260811-01)
                </div>
              )}

              {/* Row 1: Toko Asal (Supplier) */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Toko Asal / Supplier *</label>
                {shops.length > 0 ? (
                  <select
                    value={shopOrigin}
                    onChange={(e) => setShopOrigin(e.target.value)}
                    required
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-bold"
                  >
                    <option value="">-- Pilih Toko Asal / Supplier --</option>
                    {shops.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={shopOrigin}
                    onChange={(e) => setShopOrigin(e.target.value)}
                    placeholder="Contoh: Sukaraja Store, Supplier Batam"
                    required
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-bold"
                  />
                )}
              </div>

              {/* Row 2: Harga Modal & Harga Jual */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Harga Modal (Rp)</label>
                  <input
                    type="number"
                    value={capitalPriceInput}
                    onChange={(e) => setCapitalPriceInput(e.target.value)}
                    placeholder="Contoh: 70000"
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Harga Jual (Rp) *</label>
                  <input
                    type="number"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    placeholder="Contoh: 95000"
                    required
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-mono font-bold"
                  />
                </div>
              </div>

              {/* Debounced Profit Margin Badge */}
              {debouncedProfit !== null && (
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-mono font-bold text-blue-700 flex justify-between items-center">
                  <span>Estimasi Profit Margin:</span>
                  <span>+Rp {debouncedProfit.toLocaleString("id-ID")}</span>
                </div>
              )}

              {/* Row 3: Deskripsi Produk */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Deskripsi Produk Tas</label>
                <textarea
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  placeholder="Contoh: Bahan kulit sintetis, warna hitam, kondisi mulus 95%"
                  rows={2}
                  className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none text-xs font-medium"
                />
              </div>

              {/* Row 4: Upload Foto Tas */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Foto Produk Tas</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={compressing}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                />
                {compressing && (
                  <p className="text-xs text-blue-600 font-bold mt-1.5 animate-pulse">
                    ⚡ Mengompresi foto di browser (target &lt; 300 KB)...
                  </p>
                )}
                {compressedInfo && !compressing && (
                  <p className="text-[11px] text-blue-700 font-mono font-bold mt-1.5 bg-blue-50 p-2 rounded-lg border border-blue-200">
                    ✅ {compressedInfo}
                  </p>
                )}
              </div>

              {/* Preview Foto */}
              {previewUrl && (
                <div className="w-24 h-24 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative mx-auto">
                  <Image src={previewUrl} alt="Preview" fill sizes="96px" className="object-cover" />
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors border border-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all disabled:opacity-50"
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
