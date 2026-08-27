"use client";

import { useState } from "react";

export interface Shop {
  id?: string;
  name: string;
}

interface ShopFormProps {
  initialData?: Shop | null;
  onSubmitSuccess?: (shop: Shop) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

export default function ShopForm({
  initialData,
  onSubmitSuccess,
  onCancel,
  isModal = true,
}: ShopFormProps) {
  const isEditing = Boolean(initialData?.id);
  const [name, setName] = useState(initialData?.name || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Nama Toko / Supplier wajib diisi.");
      return;
    }

    setSubmitting(true);

    try {
      const endpoint = isEditing ? `/api/shops/${initialData!.id}` : "/api/shops";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menyimpan toko.");
      }

      if (onSubmitSuccess) {
        onSubmitSuccess(data.data);
      }
    } catch (err: unknown) {
        const errorObj = err as Error;
      setError(errorObj.message || "Terjadi kesalahan sistem saat menyimpan toko.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`space-y-4 font-ui ${isModal ? "" : "bg-white dark:bg-[#141517] p-6 border border-[#eaeaea] dark:border-slate-800 rounded-[8px]"}`}>
      <div className="flex justify-between items-center border-b border-[#eaeaea] dark:border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-[#111111] dark:text-[#f3f3f3] uppercase font-technical tracking-tight">
          {isEditing ? "Edit Nama Toko" : "Tambah Toko Baru"}
        </h3>
      </div>

      {error && (
        <div className="p-3 bg-[#FDEBEC] text-[#9F2F2D] border border-[#f5c2c2] rounded-[6px] text-xs font-semibold font-technical">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-ui">
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
            Nama Toko / Supplier *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Sukaraja Store, Supplier Batam"
            required
            autoFocus
            className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium"
          />
        </div>

        <div className="flex gap-3 pt-3 border-t border-[#eaeaea] dark:border-slate-800/80 text-xs">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-1/2 py-2.5 bg-[#f5f5f5] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-[6px] transition-colors border border-[#eaeaea] dark:border-slate-700 cursor-pointer font-technical uppercase"
            >
              Batal
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2.5 bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] font-bold rounded-[6px] transition-all disabled:opacity-50 cursor-pointer font-technical uppercase"
          >
            {submitting ? "Menyimpan..." : "Simpan Toko"}
          </button>
        </div>
      </form>
    </div>
  );
}
