"use client";

import { useState, useEffect } from "react";
import imageCompression from "browser-image-compression";

export interface Product {
  id: string;
  price: number;
  capitalPrice?: number | null;
  status: string;
  photoUrl?: string | null;
  description?: string | null;
  shop?: { id?: string; name: string } | null;
  customPrice?: number | null;
  discount?: number | null;
}

interface ProductFormProps {
  initialData?: Partial<Product> | null;
  shops?: { id: string; name: string }[];
  onSubmitSuccess?: (product: Product) => void;
  onSaveAndAddAnother?: (product: Product) => void;
  onCancel?: () => void;
  isModal?: boolean;
  showAddAnotherOption?: boolean;
}

export default function ProductForm({
  initialData,
  shops: passedShops,
  onSubmitSuccess,
  onSaveAndAddAnother,
  onCancel,
  isModal = true,
  showAddAnotherOption = true,
}: ProductFormProps) {
  const isEditing = Boolean(initialData?.id);

  const [shops, setShops] = useState<{ id: string; name: string }[]>(passedShops || []);
  const [shopOrigin, setShopOrigin] = useState(initialData?.shop?.name || "");
  const [customId, setCustomId] = useState(isEditing ? initialData?.id || "" : "");
  const [capitalPrice, setCapitalPrice] = useState(
    initialData?.capitalPrice !== undefined && initialData?.capitalPrice !== null
      ? String(initialData.capitalPrice)
      : ""
  );
  const [price, setPrice] = useState(initialData?.price !== undefined ? String(initialData.price) : "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initialData?.photoUrl || null);

  const [compressing, setCompressing] = useState(false);
  const [compressedInfo, setCompressedInfo] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!passedShops) {
      async function loadShops() {
        try {
          const res = await fetch("/api/shops");
          const data = await res.json();
          if (data.success) setShops(data.data);
        } catch {
          // Ignore
        }
      }
      loadShops();
    }
  }, [passedShops]);

  const processSelectedImage = async (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      setError("Hanya file gambar (JPEG, PNG, WebP) yang diperbolehkan.");
      return;
    }

    setCompressing(true);
    setCompressedInfo(null);
    setError(null);

    try {
      const options = {
        maxSizeMB: 0.15, // Target ukuran < 150 KB
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

      setCompressedInfo(`Ukuran: ${origSizeKB} KB → ${compSizeKB} KB (WebP)`);
      setFile(webpFile);
      if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(webpFile));
    } catch (err) {
      console.error("Gagal mengompresi foto:", err);
      setFile(selectedFile);
      if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(selectedFile));
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, keepFormOpen: boolean = false) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!shopOrigin.trim()) {
      setError("Nama Toko / Supplier wajib diisi.");
      return;
    }

    const parsedPrice = parseInt(price, 10);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError("Harga Jual harus berupa angka positif.");
      return;
    }

    setSubmitting(true);

    try {
      const endpoint = isEditing ? `/api/products/${initialData!.id}` : "/api/products";
      const method = isEditing ? "PATCH" : "POST";

      let res: Response;

      if (file || !isEditing) {
        const formData = new FormData();
        if (customId.trim()) formData.append("id", customId.trim());
        formData.append("shopOrigin", shopOrigin.trim());
        formData.append("capitalPrice", capitalPrice.trim() || "0");
        formData.append("price", String(parsedPrice));
        formData.append("description", description.trim());
        if (file) formData.append("file", file);

        res = await fetch(endpoint, {
          method,
          body: formData,
        });
      } else {
        res = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shopOrigin: shopOrigin.trim(),
            capitalPrice: parseInt(capitalPrice, 10) || 0,
            price: parsedPrice,
            description: description.trim(),
          }),
        });
      }

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal menyimpan produk.");
      }

      if (keepFormOpen) {
        setSuccessMsg(`Produk #${result.data.id} berhasil ditambahkan! Silakan isi produk berikutnya dari toko '${shopOrigin}'.`);
        setCustomId("");
        setCapitalPrice("");
        setPrice("");
        setDescription("");
        setFile(null);
        setPreview(null);
        setCompressedInfo(null);
        if (onSaveAndAddAnother) {
          onSaveAndAddAnother(result.data);
        }
      } else {
        if (onSubmitSuccess) {
          onSubmitSuccess(result.data);
        }
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan sistem saat menyimpan produk.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`space-y-4 font-ui ${isModal ? "" : "bg-white dark:bg-[#141517] p-6 border border-[#eaeaea] dark:border-slate-800 rounded-[8px]"}`}>
      <div className="flex justify-between items-center border-b border-[#eaeaea] dark:border-slate-800 pb-3">
        <h3 className="text-xs font-bold text-[#111111] dark:text-[#f3f3f3] uppercase font-technical">
          {isEditing ? `Edit Produk #${initialData?.id}` : "Tambah Produk Baru"}
        </h3>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-xs cursor-pointer font-technical uppercase"
          >
            ✕
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-[#FDEBEC] text-[#9F2F2D] border border-[#f5c2c2] rounded-[6px] text-xs font-semibold font-technical">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-[#EDF3EC] text-[#346538] border border-[#cbe1cc] rounded-[6px] text-xs font-semibold font-technical">
          {successMsg}
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-3 text-xs">
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
            Toko Supplier / Toko Asal *
          </label>
          <input
            type="text"
            required
            list="product-form-shop-options"
            value={shopOrigin}
            onChange={(e) => setShopOrigin(e.target.value)}
            placeholder="Ketik atau pilih nama toko..."
            className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium transition-colors"
          />
          <datalist id="product-form-shop-options">
            {shops.map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>
        </div>

        {!isEditing && (
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
              ID / Kode Tas (Opsional)
            </label>
            <input
              type="text"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              placeholder="Kosongkan untuk Auto-Generate ID"
              className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium font-technical transition-colors"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
              Harga Modal (Rp)
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={capitalPrice}
              onChange={(e) => setCapitalPrice(e.target.value)}
              placeholder="0"
              className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white px-2.5 py-2 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium font-technical transition-colors text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
              Harga Jual (Rp) *
            </label>
            <input
              type="number"
              inputMode="numeric"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Contoh: 150000"
              className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white px-2.5 py-2 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium font-technical transition-colors text-xs font-semibold"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
            Deskripsi Produk
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Warna, ukuran, tipe bahan..."
            className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white px-2.5 py-2 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium transition-colors text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
            Foto Produk (Kompres Otomatis &lt; 150 KB, WebP)
          </label>

          {/* Input Galeri */}
          <input
            type="file"
            id="product-form-file-input"
            accept="image/*"
            disabled={compressing || submitting}
            onChange={async (e) => {
              const selected = e.target.files?.[0];
              if (selected) await processSelectedImage(selected);
              e.target.value = "";
            }}
            className="hidden"
          />

          {/* Input Kamera */}
          <input
            type="file"
            id="product-form-camera-input"
            accept="image/*"
            capture="environment"
            disabled={compressing || submitting}
            onChange={async (e) => {
              const selected = e.target.files?.[0];
              if (selected) await processSelectedImage(selected);
              e.target.value = "";
            }}
            className="hidden"
          />

          <div className="flex gap-2">
            <label
              htmlFor="product-form-camera-input"
              className={`flex-1 py-2 px-3 bg-[#1F6C9F] hover:bg-[#195781] text-white font-bold rounded-[6px] text-[10px] uppercase font-technical cursor-pointer flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 min-h-[38px] ${compressing || submitting ? "opacity-50 pointer-events-none" : ""}`}
            >
              📷 Buka Kamera HP
            </label>
            <label
              htmlFor="product-form-file-input"
              className={`flex-1 py-2 px-3 bg-[#f5f5f5] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-[6px] text-[10px] uppercase font-technical cursor-pointer border border-[#eaeaea] dark:border-slate-700 flex items-center justify-center gap-1.5 transition-all active:scale-95 min-h-[38px] ${compressing || submitting ? "opacity-50 pointer-events-none" : ""}`}
            >
              🖼️ Pilih Galeri
            </label>
          </div>

          {compressing && (
            <p className="text-[10px] text-[#1F6C9F] dark:text-[#6cb6e4] font-bold animate-pulse font-technical uppercase">
              ⚡ MENGOMPRESI FOTO (&lt; 150 KB)...
            </p>
          )}

          {compressedInfo && !compressing && (
            <span className="inline-block text-[9px] font-bold text-[#1F6C9F] dark:text-[#6cb6e4] bg-[#E1F3FE] dark:bg-[#18232c] px-2 py-0.5 rounded font-technical uppercase">
              {compressedInfo}
            </span>
          )}

          {file && !compressing && (
            <span className="text-[10px] text-[#1F6C9F] font-bold font-technical block truncate">
              File Siap: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </span>
          )}

          {preview && (
            <div className="mt-2 w-16 h-16 rounded-[4px] border border-[#eaeaea] dark:border-slate-800 overflow-hidden relative shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2 text-xs">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="sm:w-1/4 py-2.5 bg-[#f5f5f5] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-[6px] transition-colors border border-[#eaeaea] dark:border-slate-700 cursor-pointer font-technical uppercase"
            >
              Batal
            </button>
          )}

          {!isEditing && showAddAnotherOption && (
            <button
              type="button"
              disabled={submitting || compressing}
              onClick={(e) => handleSubmit(e, true)}
              className="flex-1 py-2.5 bg-[#E1F3FE] hover:bg-[#d2ecfc] dark:bg-[#18232c] dark:hover:bg-[#1f303d] text-[#1F6C9F] dark:text-[#a2d8fa] font-bold rounded-[6px] transition-all disabled:opacity-50 border border-[#c5e6fb] dark:border-slate-700 cursor-pointer font-technical uppercase text-[11px] flex items-center justify-center gap-1"
            >
              <span>Tambah 1 Lagi di Toko Ini</span>
            </button>
          )}

          <button
            type="submit"
            disabled={submitting || compressing}
            className="flex-1 py-2.5 bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] font-bold rounded-[6px] transition-all disabled:opacity-50 cursor-pointer font-technical uppercase text-[11px]"
          >
            {submitting ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Simpan & Selesai"}
          </button>
        </div>
      </form>
    </div>
  );
}
