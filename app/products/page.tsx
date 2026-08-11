"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { TableActionsMenu } from "@/components/TableActionsMenu";

interface Product {
  id: string;
  shopOrigin: string;
  capitalPrice: number;
  price: number;
  status: string;
  photoUrl: string;
  orderId?: string | null;
  createdAt: string;
}

interface Shop {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Detail Photo Lightbox Modal State
  const [viewingPhotoProduct, setViewingPhotoProduct] = useState<Product | null>(null);

  // Form Fields (Initial state empty / null)
  const [id, setId] = useState("");
  const [shopOrigin, setShopOrigin] = useState("");
  const [capitalPriceInput, setCapitalPriceInput] = useState<string>("");
  const [priceInput, setPriceInput] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Debounced Profit State
  const [debouncedProfit, setDebouncedProfit] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusFilter !== "ALL" ? `/api/products?status=${statusFilter}` : "/api/products";
      // API Call: GET /api/products (mengambil daftar produk tas)
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
      // API Call: GET /api/shops (mengambil daftar toko terdaftar)
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

  // Debounce Profit Calculation Effect (Calculates after typing stops)
  useEffect(() => {
    const handler = setTimeout(() => {
      const capital = parseInt(capitalPriceInput, 10);
      const sell = parseInt(priceInput, 10);
      if (!isNaN(capital) && !isNaN(sell)) {
        setDebouncedProfit(sell - capital);
      } else {
        setDebouncedProfit(null);
      }
    }, 400); // 400ms debounce delay

    return () => clearTimeout(handler);
  }, [capitalPriceInput, priceInput]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setId("");
    const defaultShop = shops.length > 0 ? shops[0].name : "Sukaraja (Kab. Bogor)";
    setShopOrigin(defaultShop);
    setCapitalPriceInput("");
    setPriceInput("");
    setDebouncedProfit(null);
    setFile(null);
    setPreviewUrl(null);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setId(p.id);
    setShopOrigin(p.shopOrigin);
    setCapitalPriceInput(p.capitalPrice ? String(p.capitalPrice) : "");
    setPriceInput(p.price ? String(p.price) : "");
    setDebouncedProfit(p.price - (p.capitalPrice || 0));
    setFile(null);
    setPreviewUrl(p.photoUrl);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    const capitalVal = parseInt(capitalPriceInput, 10) || 0;
    const priceVal = parseInt(priceInput, 10);

    if (!shopOrigin.trim()) {
      setErrorMessage("Toko Asal wajib dipilih/diisi.");
      setSaving(false);
      return;
    }

    if (isNaN(priceVal) || priceVal <= 0) {
      setErrorMessage("Harga Jual wajib diisi dengan nominal angka valid.");
      setSaving(false);
      return;
    }

    try {
      const formData = new FormData();
      if (editingProduct) {
        formData.append("id", id);
      }
      formData.append("shopOrigin", shopOrigin.trim());
      formData.append("capitalPrice", String(capitalVal));
      formData.append("price", String(priceVal));
      if (file) {
        formData.append("file", file);
      }

      const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = editingProduct ? "PATCH" : "POST";

      // API Call: POST /api/products atau PATCH /api/products/[id] (simpan/update data produk)
      const res = await fetch(url, {
        method,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Gagal menyimpan produk.");
      } else {
        setSuccessMessage(editingProduct ? "Produk berhasil diperbarui." : "Produk baru berhasil ditambahkan.");
        setIsModalOpen(false);
        fetchProducts();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus produk '${p.id}' secara permanen?`)) return;

    try {
      // API Call: DELETE /api/products/[id] (hapus produk dari database)
      const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Gagal menghapus produk.");
      } else {
        setSuccessMessage(`Produk ${p.id} berhasil dihapus.`);
        fetchProducts();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch {
      alert("Terjadi kesalahan koneksi.");
    }
  };

  const filteredProducts = products.filter((p) =>
    p.id.toLowerCase().includes(search.toLowerCase()) ||
    p.shopOrigin.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#f7f9fb]">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full px-6 h-16 bg-white border-b border-slate-200 z-30 sticky top-0 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-blue-700 tracking-tight">Katalog Produk Tas</h1>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors active:scale-95 shadow-sm"
        >
          <span className="material-symbols-outlined text-sm font-bold">add</span>
          <span>Tambah Produk Tas</span>
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 bg-[#f7f9fb] w-full pb-8 space-y-6">

        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold text-center">
            ✅ {successMessage}
          </div>
        )}

        {/* Filter Tabs & Search */}
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
            placeholder="Cari ID produk tas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 bg-slate-50 text-slate-800 text-xs px-3.5 py-2 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-mono"
          />
        </div>

        {/* Products Table View (All Centered) */}
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
                    <th className="p-4 text-center">Toko Asal</th>
                    <th className="p-4 text-center">Harga Modal</th>
                    <th className="p-4 text-center">Harga Jual</th>
                    <th className="p-4 text-center">Profit (Margin)</th>
                    <th className="p-4 text-center">Status</th>
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
                            className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden relative flex items-center justify-center mx-auto hover:opacity-85 transition-all active:scale-95 group shadow-sm"
                            title="Klik untuk lihat detail foto produk"
                          >
                            {p.photoUrl && p.photoUrl !== "/uploads/placeholder.jpg" ? (
                              <Image src={p.photoUrl} alt={p.id} fill sizes="48px" className="object-cover" />
                            ) : (
                              <span className="material-symbols-outlined text-slate-400 text-base">local_mall</span>
                            )}
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <span className="material-symbols-outlined text-sm">visibility</span>
                            </div>
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
                        <td className="p-4 text-center font-bold text-slate-900">
                          <span className="inline-flex items-center gap-1.5 justify-center">
                            <span className="material-symbols-outlined text-blue-600 text-sm">storefront</span>
                            <span>{p.shopOrigin}</span>
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono text-slate-600">
                          Rp {(p.capitalPrice || 0).toLocaleString("id-ID")}
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-slate-900">
                          Rp {p.price.toLocaleString("id-ID")}
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-emerald-600">
                          +Rp {profit.toLocaleString("id-ID")}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase shadow-sm inline-block ${
                              p.status === "Tersedia" || p.status === "Available"
                                ? "bg-blue-600 text-white"
                                : p.status === "Dibooking" || p.status === "Booked"
                                ? "bg-amber-500 text-white"
                                : "bg-slate-600 text-white"
                            }`}
                          >
                            {p.status === "Available" ? "Tersedia" : p.status === "Booked" ? "Dibooking" : p.status === "Sold" ? "Terjual" : p.status}
                          </span>
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
                                disabled: p.status === "Sold",
                              },
                              {
                                label: "Hapus Produk",
                                icon: "delete",
                                danger: true,
                                onClick: () => handleDelete(p),
                                disabled: p.status === "Sold",
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

      {/* Modal Detail Foto Produk (Lightbox) */}
      {viewingPhotoProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setViewingPhotoProduct(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Detail Foto Tas</span>
                  <span className="font-mono text-blue-600 text-sm">#{viewingPhotoProduct.id}</span>
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-sm text-blue-600">storefront</span>
                  <span>{viewingPhotoProduct.shopOrigin}</span>
                </p>
              </div>
              <button
                onClick={() => setViewingPhotoProduct(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center font-bold text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Product Photo Lightbox Box */}
            <div className="w-full h-72 sm:h-80 bg-slate-900 rounded-xl overflow-hidden relative border border-slate-200 flex items-center justify-center shadow-inner">
              {viewingPhotoProduct.photoUrl && viewingPhotoProduct.photoUrl !== "/uploads/placeholder.jpg" ? (
                <Image
                  src={viewingPhotoProduct.photoUrl}
                  alt={viewingPhotoProduct.id}
                  fill
                  sizes="(max-width: 768px) 100vw, 500px"
                  className="object-contain"
                  priority
                />
              ) : (
                <div className="text-center space-y-2 text-slate-400">
                  <span className="material-symbols-outlined text-5xl">hide_image</span>
                  <p className="text-xs">Foto produk belum di-upload</p>
                </div>
              )}
            </div>

            {/* Financial & Status Summary Cards */}
            <div className="grid grid-cols-3 gap-2.5 text-xs text-center">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">Harga Modal</span>
                <span className="font-mono font-bold text-slate-700">
                  Rp {(viewingPhotoProduct.capitalPrice || 0).toLocaleString("id-ID")}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-0.5">Harga Jual</span>
                <span className="font-mono font-bold text-slate-900">
                  Rp {viewingPhotoProduct.price.toLocaleString("id-ID")}
                </span>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                <span className="text-[10px] text-emerald-700 uppercase font-semibold block mb-0.5">Profit Margin</span>
                <span className="font-mono font-bold text-emerald-700">
                  +Rp {(viewingPhotoProduct.price - (viewingPhotoProduct.capitalPrice || 0)).toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingPhotoProduct(null)}
                className="w-1/2 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 text-xs transition-colors"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={viewingPhotoProduct.status === "Sold"}
                onClick={() => {
                  const p = viewingPhotoProduct;
                  setViewingPhotoProduct(null);
                  openEditModal(p);
                }}
                className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-all disabled:opacity-40"
              >
                ✏️ Edit Produk Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit Produk Tas */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
              {editingProduct ? `Edit Produk Tas [${editingProduct.id}]` : "Tambah Produk Tas Baru"}
            </h3>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                ⚠️ {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {editingProduct ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-blue-700 flex justify-between items-center">
                  <span>ID Tas:</span>
                  <span>#{editingProduct.id}</span>
                </div>
              ) : (
                <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-lg text-xs font-medium text-blue-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-blue-600">auto_awesome</span>
                  <span>ID Tas akan dibuat otomatis (Inisial Toko + Tanggal + Urutan)</span>
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-slate-600 font-semibold">Toko Asal / Supplier *</label>
                  <Link href="/shops" className="text-[11px] text-blue-600 font-bold hover:underline">
                    + Kelola Toko
                  </Link>
                </div>

                {shops.length > 0 ? (
                  <select
                    value={shopOrigin}
                    onChange={(e) => setShopOrigin(e.target.value)}
                    required
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-semibold"
                  >
                    <option value="">-- Pilih Toko Terdaftar --</option>
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
                    placeholder="Sukaraja (Kab. Bogor)"
                    required
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Harga Modal (Rp)</label>
                  <input
                    type="number"
                    value={capitalPriceInput}
                    onChange={(e) => setCapitalPriceInput(e.target.value)}
                    placeholder="Misal: 150000"
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Harga Jual (Rp) *</label>
                  <input
                    type="number"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    placeholder="Misal: 250000"
                    required
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Debounced Profit Margin Display */}
              {debouncedProfit !== null && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex justify-between items-center transition-all">
                  <span>Estimasi Profit Margin:</span>
                  <span className="font-mono font-bold text-sm text-emerald-700">
                    {debouncedProfit >= 0 ? `+Rp ${debouncedProfit.toLocaleString("id-ID")}` : `-Rp ${Math.abs(debouncedProfit).toLocaleString("id-ID")}`}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Upload Foto Produk Tas (Lokal)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              {previewUrl && (
                <div className="w-full h-32 bg-slate-100 rounded-lg overflow-hidden relative flex items-center justify-center border border-slate-200">
                  <Image src={previewUrl} alt="Preview" fill sizes="300px" className="object-contain" />
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan Produk Tas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
