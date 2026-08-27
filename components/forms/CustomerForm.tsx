"use client";

import { useState } from "react";

export interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  domisili?: string | null;
  addressDetail: string;
  shippingCost?: number | null;
  courier?: string | null;
  behavioral?: string | null;
  consumerType?: string | null;
  relationshipStatus?: string | null;
  crisisStatus?: string | null;
}

export const COURIER_OPTIONS = [
  "SiCepat",
  "J&T Express",
  "TIKI",
  "Wahana",
  "Lion Parcel",
];

export const BEHAVIORAL_OPTIONS = [
  "Value Seeker",
  "Price Sensitive",
  "Design Oriented",
  "Convenience Seeker",
];

export const RELATIONSHIP_STATUS_OPTIONS = [
  "New Customer",
  "Repeat Buyer",
];

interface CustomerFormProps {
  initialData?: Partial<Customer> | null;
  onSubmitSuccess?: (customer: Customer) => void;
  onCancel?: () => void;
  isModal?: boolean;
  showExtendedFields?: boolean;
}

export default function CustomerForm({
  initialData,
  onSubmitSuccess,
  onCancel,
  isModal = true,
  showExtendedFields = false,
}: CustomerFormProps) {
  const isEditing = Boolean(initialData?.id);

  const [name, setName] = useState(initialData?.name || "");
  const [whatsapp, setWhatsapp] = useState(initialData?.whatsapp || "");
  const [domisili, setDomisili] = useState(initialData?.domisili || "");
  const [addressDetail, setAddressDetail] = useState(initialData?.addressDetail || "");
  const [courier, setCourier] = useState(initialData?.courier || "JNE");
  const [shippingCost, setShippingCost] = useState(
    initialData?.shippingCost !== undefined && initialData?.shippingCost !== null
      ? String(initialData.shippingCost)
      : ""
  );

  const [behavioral, setBehavioral] = useState(initialData?.behavioral || "");
  const [consumerType, setConsumerType] = useState(initialData?.consumerType || "");
  const [relationshipStatus, setRelationshipStatus] = useState(initialData?.relationshipStatus || "");
  const [crisisStatus, setCrisisStatus] = useState(initialData?.crisisStatus || "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Nama Pelanggan wajib diisi.");
      return;
    }

    setSubmitting(true);

    try {
      const endpoint = isEditing ? `/api/customers/${initialData!.id}` : "/api/customers";
      const method = isEditing ? "PATCH" : "POST";

      const payload: any = {
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        domisili: domisili.trim() || null,
        addressDetail: addressDetail.trim(),
        courier: courier || "JNE",
        shippingCost: parseInt(shippingCost, 10) || 0,
      };

      if (showExtendedFields || isEditing) {
        payload.behavioral = behavioral.trim() || null;
        payload.consumerType = consumerType.trim() || null;
        payload.relationshipStatus = relationshipStatus.trim() || null;
        payload.crisisStatus = crisisStatus.trim() || null;
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menyimpan data pelanggan.");
      }

      if (onSubmitSuccess) {
        onSubmitSuccess(data.data);
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan sistem saat menyimpan pelanggan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`space-y-3 font-ui ${isModal ? "" : "bg-white dark:bg-[#141517] p-5 border border-[#eaeaea] dark:border-slate-800 rounded-[8px]"}`}>
      <div className="flex justify-between items-center border-b border-[#eaeaea] dark:border-slate-800 pb-2">
        <h3 className="text-xs font-bold text-[#111111] dark:text-[#f3f3f3] uppercase font-technical tracking-tight">
          {isEditing ? `Edit Pelanggan #${initialData?.id}` : "Tambah Pelanggan"}
        </h3>
      </div>

      {error && (
        <div className="p-2.5 bg-[#FDEBEC] text-[#9F2F2D] border border-[#f5c2c2] rounded-[6px] text-xs font-semibold font-technical">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2.5 text-xs">
        {/* Row 1: Nama & WhatsApp */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
              Nama Pelanggan *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Siti Nurhaliza"
              className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white px-2.5 py-1.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
              No. WhatsApp
            </label>
            <input
              type="tel"
              inputMode="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="Contoh: 081234567890 (Opsional)"
              className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white px-2.5 py-2 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium transition-colors font-technical"
            />
          </div>
        </div>

        {/* Row 2: Domisili, Ekspedisi, Ongkir */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
              Kota / Domisili
            </label>
            <input
              type="text"
              value={domisili}
              onChange={(e) => setDomisili(e.target.value)}
              placeholder="Contoh: Bandung"
              className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white px-2.5 py-2 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
              Ekspedisi
            </label>
            <select
              value={courier}
              onChange={(e) => setCourier(e.target.value)}
              className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white px-2.5 py-2 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium transition-colors cursor-pointer"
            >
              <option value="">-- Pilih Ekspedisi --</option>
              {COURIER_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
              Ongkir Default (Rp)
            </label>
            <div className="flex items-center gap-1 bg-white dark:bg-[#1c1d1f] px-2.5 py-1.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800">
              <span className="font-technical text-xs font-bold text-slate-400">Rp</span>
              <input
                type="number"
                inputMode="numeric"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                placeholder="0"
                className="w-full text-right font-technical font-bold text-xs text-[#111111] dark:text-white focus:outline-none bg-transparent"
              />
            </div>
          </div>
        </div>

        {/* Row 3: Detail Alamat */}
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
            Detail Alamat Jalan & Patokan
          </label>
          <input
            type="text"
            value={addressDetail}
            onChange={(e) => setAddressDetail(e.target.value)}
            placeholder="Contoh: Jl. Mawar No.5, Kel. Sukamaju (Opsional)"
            className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white px-2.5 py-1.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium transition-colors"
          />
        </div>

        {showExtendedFields && (
          <div className="space-y-2.5 pt-2 border-t border-[#eaeaea] dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
                  Behavioral
                </label>
                <select
                  value={behavioral}
                  onChange={(e) => setBehavioral(e.target.value)}
                  className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white px-2.5 py-1.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:outline-none font-medium cursor-pointer"
                >
                  <option value="">-- Pilih Behavioral --</option>
                  {BEHAVIORAL_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
                  Tipe Konsumen
                </label>
                <input
                  type="text"
                  value={consumerType}
                  onChange={(e) => setConsumerType(e.target.value)}
                  placeholder="Contoh: Value Seeker, Price Sensitive"
                  className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white px-2.5 py-1.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:outline-none font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
                  Status Hubungan
                </label>
                <select
                  value={relationshipStatus}
                  onChange={(e) => setRelationshipStatus(e.target.value)}
                  className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white px-2.5 py-1.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:outline-none font-medium cursor-pointer"
                >
                  <option value="">-- Pilih Status --</option>
                  {RELATIONSHIP_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
                  Status Krisis (Catatan Teks)
                </label>
                <input
                  type="text"
                  value={crisisStatus}
                  onChange={(e) => setCrisisStatus(e.target.value)}
                  placeholder="Contoh: Sering komplain, Pernah cancel DP"
                  className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white px-2.5 py-1.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:outline-none font-medium"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2.5 pt-2 border-t border-[#eaeaea] dark:border-slate-800">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-1/3 py-2 bg-[#f5f5f5] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-[6px] transition-colors border border-[#eaeaea] dark:border-slate-700 cursor-pointer text-xs font-technical uppercase"
            >
              Batal
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2 bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] font-bold rounded-[6px] transition-all disabled:opacity-50 cursor-pointer text-xs font-technical uppercase"
          >
            {submitting ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Simpan Pelanggan"}
          </button>
        </div>
      </form>
    </div>
  );
}
