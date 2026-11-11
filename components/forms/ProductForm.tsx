"use client";

import { useState, useEffect, useRef } from "react";
import ProductCamera, { ProductCameraHandle } from "./ProductCamera";
import imageCompression from "browser-image-compression";
import { ConfirmModal } from "@/components/ConfirmModal";
import { MAX_BATCH_ITEMS, MAX_PHOTO_BYTES, MAX_BATCH_BYTES, money } from "@/lib/crm/contracts";

interface ProductDraft { draftId: string; description: string; capitalPrice: number; price: number; file: File | null; preview: string | null }


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
  defaultShopOrigin?: string;
  maxItems?: number;
  shops?: { id: string; name: string }[];
  onSubmitSuccess?: (products: Product[]) => void | Promise<void>;
  onCancel?: () => void;
  isModal?: boolean;
  showAddAnotherOption?: boolean;
}

export default function ProductForm({
  initialData,
  defaultShopOrigin = "",
  maxItems = MAX_BATCH_ITEMS,
  shops: passedShops,
  onSubmitSuccess,
  onCancel,
  isModal = true,
  showAddAnotherOption = true,
}: ProductFormProps) {
  const isEditing = Boolean(initialData?.id);

  const [shops, setShops] = useState<{ id: string; name: string }[]>(passedShops || []);
  const [shopOrigin, setShopOrigin] = useState(initialData?.shop?.name || defaultShopOrigin);
  const [drafts, setDrafts] = useState<ProductDraft[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editorDirty, setEditorDirty] = useState(false);
  const [capitalMode, setCapitalMode] = useState([25000,38000,50000].includes(initialData?.capitalPrice || 0) ? String(initialData?.capitalPrice) : "custom");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [outcomeUnknown, setOutcomeUnknown] = useState(false);
  const submitLock = useRef(false);
  const attempt = useRef<{ key: string; signature: string; body: FormData } | null>(null);
  const urls = useRef(new Set<string>());
  const mounted = useRef(true);

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
  const [isDragging, setIsDragging] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const busy = submitting || outcomeUnknown;
  const draftSnapshot = useRef({ drafts, editorDirty });
  useEffect(() => { draftSnapshot.current = { drafts, editorDirty }; }, [drafts, editorDirty]);

  useEffect(() => {
    mounted.current = true;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (draftSnapshot.current.drafts.length || draftSnapshot.current.editorDirty || submitLock.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    const ownedUrls = urls.current;
    return () => {
      mounted.current = false;
      window.removeEventListener("beforeunload", beforeUnload);
      ownedUrls.forEach(url => URL.revokeObjectURL(url));
      ownedUrls.clear();
    };
  }, []);

  const requestCancel = () => {
    if (submitting) return;
    if (outcomeUnknown || (!isEditing && (drafts.length || editorDirty))) setConfirmCancel(true);
    else onCancel?.();
  };

  const releasePreview = (url: string | null) => {
    if (url?.startsWith("blob:")) { URL.revokeObjectURL(url); urls.current.delete(url); }
  };

  const cameraRef = useRef<ProductCameraHandle>(null);
  const stopWebcam = () => cameraRef.current?.close();

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
    if (!["image/jpeg", "image/png", "image/webp"].includes(selectedFile.type)) {
      setError("Hanya file gambar (JPEG, PNG, WebP) yang diperbolehkan.");
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) { setError("Foto sumber maksimal 20 MB."); return; }
    setCompressing(true);
    setCompressedInfo(null);
    setError(null);

    try {
      const options = {
        maxSizeMB: 0.14, // Target ukuran < 150 KB
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

      if (!mounted.current) return;
      if (webpFile.size > MAX_PHOTO_BYTES) throw new Error("Foto masih terlalu besar.");
      setEditorDirty(true);
      setCompressedInfo(`Ukuran: ${origSizeKB} KB → ${compSizeKB} KB (WebP)`);
      setFile(webpFile);
      if (!drafts.some(d => d.preview === preview)) releasePreview(preview);
      const url = URL.createObjectURL(webpFile);
      urls.current.add(url);
      setPreview(url);
    } catch {
      if (mounted.current) setError("Foto gagal dikompresi. Pilih gambar JPEG, PNG, atau WebP lain.");
    } finally {
      if (mounted.current) setCompressing(false);
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!compressing && !submitting) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (compressing || submitting) return;

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      await processSelectedImage(droppedFile);
    }
  };

  const validateShared = () => {
    if (!shopOrigin.trim() || shopOrigin.trim().length > 120) throw new Error("Supplier wajib diisi, maksimal 120 karakter.");
    return { shopOrigin: shopOrigin.trim(), capitalPrice: money(Number(capitalPrice || 0), "Harga modal"), price: money(Number(price), "Harga jual", 1) };
  };

  const currentDraft = (): ProductDraft => ({ draftId: editingDraftId || crypto.randomUUID(), description: description.trim(), capitalPrice: money(Number(capitalPrice || 0), "Harga modal"), price: money(Number(price), "Harga jual", 1), file, preview });
  const resetEditor = () => {
    setEditingDraftId(null); setEditorDirty(false); setDescription(""); setFile(null); setPreview(null); setCompressedInfo(null); stopWebcam();
  };
  const withEditor = () => {
    if (editingDraftId) return drafts.map(d => d.draftId === editingDraftId ? currentDraft() : d);
    return editorDirty || drafts.length === 0 ? [...drafts, currentDraft()] : drafts;
  };
  const queueDraft = () => {
    if (busy || compressing) return;
    try {
      validateShared();
      const next = editingDraftId ? withEditor() : [...drafts, currentDraft()];
      if (next.length > maxItems) throw new Error(`Maksimal ${maxItems} tas untuk batch ini.`);
      const replaced = drafts.find(d => d.draftId === editingDraftId);
      if (replaced && replaced.preview !== preview) releasePreview(replaced.preview);
      setDrafts(next); resetEditor(); setError(null);
      setSuccessMsg(`${next.length} tas dalam antrean. Belum disimpan; klik Simpan & Selesai untuk menyimpan semuanya.`);
    } catch (err) { setError((err as Error).message); }
  };
  const editDraft = (draft: ProductDraft) => {
    if (busy || compressing) return;
    if (editorDirty && !window.confirm("Ganti editor? Perubahan tas yang belum masuk antrean akan dibuang.")) return;
    if (!editingDraftId) releasePreview(preview);
    stopWebcam();
    setCapitalPrice(String(draft.capitalPrice)); setPrice(String(draft.price));
    setCapitalMode([25000, 38000, 50000].includes(draft.capitalPrice) ? String(draft.capitalPrice) : "custom");
    setEditingDraftId(draft.draftId); setDescription(draft.description); setFile(draft.file); setPreview(draft.preview); setEditorDirty(false); setCompressedInfo(null);
  };
  const removeDraft = (draft: ProductDraft) => {
    releasePreview(draft.preview);
    setDrafts(prev => prev.filter(d => d.draftId !== draft.draftId));
    if (editingDraftId === draft.draftId) resetEditor();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLock.current || compressing) return;
    setError(null); setSuccessMsg(null);
    let res: Response;
    let saved: Product[];
    try {
      const shared = validateShared();
      if (!isEditing && !outcomeUnknown) {
        const items = withEditor();
        if (items.length > maxItems) throw new Error(`Maksimal ${maxItems} tas untuk batch ini.`);
        if (items.reduce((n, d) => n + (d.file?.size || 0), 0) > MAX_BATCH_BYTES - 128 * 1024) throw new Error("Foto dalam satu batch terlalu besar. Kurangi jumlah tas.");
        setDrafts(items); resetEditor();
        const manifest = { version: 2, shopOrigin: shared.shopOrigin, items: items.map(d => ({ draftId: d.draftId, description: d.description, hasPhoto: Boolean(d.file), capitalPrice: d.capitalPrice, price: d.price })) };
        const signature = JSON.stringify(manifest);
        if (attempt.current?.signature !== signature) {
          const body = new FormData(); body.set("manifest", signature);
          items.forEach(d => { if (d.file) body.set(`photo:${d.draftId}`, d.file); });
          attempt.current = { key: crypto.randomUUID(), signature, body };
        }
      }
      stopWebcam();
      submitLock.current = true; setSubmitting(true);
      if (isEditing) {
        const body = new FormData();
        Object.entries(shared).forEach(([key, value]) => body.set(key, String(value)));
        body.set("description", description.trim()); if (file) body.set("file", file);
        if (!attempt.current) attempt.current = { key: crypto.randomUUID(), signature: "edit", body };
        res = await fetch(`/api/products/${initialData!.id}`, { method: "PATCH", headers: { "Idempotency-Key": attempt.current.key }, body: attempt.current.body });
      } else {
        const pending = attempt.current!;
        res = await fetch("/api/products/batch", { method: "POST", headers: { "Idempotency-Key": pending.key }, body: pending.body });
      }
      const result = await res.json();
      if (!res.ok || !result.success) {
        setOutcomeUnknown(Boolean(result.outcomeUnknown));
        if (!result.outcomeUnknown) attempt.current = null;
        throw new Error(result.error || "Gagal menyimpan produk.");
      }
      saved = isEditing ? [result.data] : result.data;
      attempt.current = null; setOutcomeUnknown(false); setDrafts([]); resetEditor();
    } catch (err) {
      // Network failure may follow a successful commit: retry exactly the same request/key.
      if (attempt.current) setOutcomeUnknown(true);
      setError((err as Error).message || "Koneksi terputus. Coba kembali dengan draft yang sama.");
      return;
    } finally { submitLock.current = false; setSubmitting(false); }
    try { await onSubmitSuccess?.(saved); }
    catch { setSuccessMsg("Produk sudah tersimpan. Muat ulang daftar untuk melihat hasilnya."); }
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
            onClick={requestCancel}
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

      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        {outcomeUnknown && <p role="status" className="text-amber-700">Status penyimpanan belum pasti. Klik Coba Lagi untuk memeriksa batch yang sama. Draft dikunci sementara agar tidak tersimpan ganda.</p>}
        <fieldset disabled={busy} className="space-y-3 disabled:opacity-70">
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
            Toko Supplier / Toko Asal *
          </label>
          <input
            type="text"
            required
            aria-label="Toko supplier"
            maxLength={120}
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

        {!isEditing && <p className="text-[11px] text-slate-500">Supplier berlaku untuk seluruh antrean. Harga disimpan per tas; tas berikutnya mewarisi harga terakhir dan dapat diubah. ID tas dibuat otomatis.</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
              Harga Modal (Rp)
            </label>
            <select aria-label="Pilihan harga modal" value={capitalMode} onChange={e => { setCapitalMode(e.target.value); setEditorDirty(true); if (e.target.value !== "custom") setCapitalPrice(e.target.value); }} className="w-full border border-slate-300 dark:border-slate-700 rounded p-2 bg-white dark:bg-[#1c1d1f]">
              <option value="25000">Rp25.000</option><option value="38000">Rp38.000</option><option value="50000">Rp50.000</option><option value="custom">Nominal custom</option>
            </select>
            {capitalMode === "custom" && <input
              aria-label="Harga modal custom"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={capitalPrice}
              onChange={(e) => { setCapitalPrice(e.target.value); setEditorDirty(true); }}
              placeholder="0"
              className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white px-2.5 py-2 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium font-technical transition-colors text-xs"
            />}
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
              Harga Jual (Rp) *
            </label>
            <input
              type="number"
              inputMode="numeric"
              required
              aria-label="Harga jual"
              min="1"
              step="1"
              value={price}
              onChange={(e) => { setPrice(e.target.value); setEditorDirty(true); }}
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
            aria-label="Deskripsi produk"
            value={description}
            onChange={(e) => { setDescription(e.target.value); setEditorDirty(true); }}
            maxLength={2000}
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

          {/* Container Drag & Drop */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`p-3 border-2 border-dashed rounded-[8px] text-center transition-all ${
              isDragging
                ? "border-[#111111] dark:border-white bg-[#f0f0f0] dark:bg-[#252629] scale-[1.01]"
                : "border-[#eaeaea] dark:border-slate-800 bg-[#fafafa] dark:bg-[#18191c]"
            } ${compressing || submitting ? "opacity-50 pointer-events-none" : ""}`}
          >
            <p className="text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase font-technical mb-2 tracking-wider">
              {isDragging ? "Lepaskan Gambar Di Sini..." : "Tarik & Lepas Gambar Ke Sini, Atau Pilih:"}
            </p>

            <div className="grid grid-cols-2 gap-2">
              <ProductCamera ref={cameraRef} disabled={busy || compressing} hasPhoto={Boolean(preview)} onCapture={processSelectedImage} onError={setError} />

              <label
                htmlFor="product-form-file-input"
                className={`py-2 px-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-[6px] text-[9px] sm:text-[10px] uppercase font-technical cursor-pointer border border-[#eaeaea] dark:border-slate-700 flex items-center justify-center gap-1 transition-all active:scale-95 min-h-[38px] ${compressing || submitting ? "opacity-50 pointer-events-none" : ""}`}
              >
                Galeri
              </label>
            </div>
          </div>

          {compressing && (
            <p className="text-[10px] text-[#1F6C9F] dark:text-[#6cb6e4] font-bold animate-pulse font-technical uppercase">
              MENGOMPRESI FOTO (&lt; 150 KB)...
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

        {preview && !isEditing && <button type="button" onClick={() => { if (!drafts.some(d => d.preview === preview)) releasePreview(preview); setFile(null); setPreview(null); setEditorDirty(true); }} className="underline text-xs">Hapus foto tas ini</button>}
        {!isEditing && <div className="space-y-2 border-t pt-3">
          <p className="font-semibold">Antrean ({drafts.length}/{maxItems}) · {editingDraftId ? "Mengedit tas dalam antrean" : "Tas berikutnya"}</p>
          {drafts.map((d, index) => <div key={d.draftId} className="flex items-center gap-3 border rounded p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {d.preview && <img src={d.preview} alt={`Draft tas ${index + 1}`} className="w-10 h-10 object-cover rounded" />}
            <span className="min-w-0 flex-1 truncate">Tas {index + 1} · {d.description || "Tanpa deskripsi"}<small className="block">Modal Rp{d.capitalPrice.toLocaleString("id-ID")} · Jual Rp{d.price.toLocaleString("id-ID")}</small></span>
            <button type="button" onClick={() => editDraft(d)} className="underline" disabled={compressing}>Edit</button>
            <button type="button" onClick={() => removeDraft(d)} className="underline text-rose-600" disabled={compressing}>Hapus</button>
          </div>)}
          <p className="text-slate-500">Deskripsi dan foto opsional untuk setiap tas. Antrean tersimpan sementara sampai modal ditutup.</p>
        </div>}
        </fieldset>
        <div className="sticky bottom-0 z-10 flex flex-col sm:flex-row gap-2 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-[#141517] text-xs">
          {onCancel && (
            <button
              type="button"
              onClick={requestCancel}
              className="sm:w-1/4 py-2.5 bg-[#f5f5f5] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-[6px] transition-colors border border-[#eaeaea] dark:border-slate-700 cursor-pointer font-technical uppercase"
            >
              Batal
            </button>
          )}

          {!isEditing && showAddAnotherOption && (
            <button
              type="button"
              disabled={busy || compressing}
              onClick={queueDraft}
              className="flex-1 py-2.5 bg-white hover:bg-[#f5f5f5] dark:bg-[#141517] dark:hover:bg-slate-800 text-[#111111] dark:text-[#f3f3f3] font-bold rounded-[6px] transition-all disabled:opacity-50 border border-[#eaeaea] dark:border-slate-800 cursor-pointer font-technical uppercase text-[11px] flex items-center justify-center gap-1"
            >
              <span>{editingDraftId ? "Perbarui Draft" : "Tambah ke Antrean"}</span>
            </button>
          )}

          <button
            type="submit"
            disabled={submitting || compressing}
            className="flex-1 py-2.5 bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] font-bold rounded-[6px] transition-all disabled:opacity-50 cursor-pointer font-technical uppercase text-[11px]"
          >
            {submitting ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : outcomeUnknown ? "Coba Lagi" : "Simpan & Selesai"}
          </button>
        </div>
      </form>
      <ConfirmModal isOpen={confirmCancel} onClose={() => setConfirmCancel(false)} onConfirm={() => { stopWebcam(); onCancel?.(); }} title="Tutup antrean?" message={outcomeUnknown ? "Status batch belum pasti. Menutup modal tidak membatalkan produk yang mungkin sudah tersimpan. Periksa katalog sebelum membuat batch baru." : "Draft yang belum disimpan akan dibuang."} confirmText="Tutup antrean" cancelText="Kembali" />
    </div>
  );
}
