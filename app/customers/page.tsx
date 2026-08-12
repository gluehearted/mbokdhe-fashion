"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TableActionsMenu } from "@/components/TableActionsMenu";
import { useToast } from "@/components/ToastProvider";

interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  domisili?: string | null;
  shippingCost: number;
  courier?: string | null;
  addressDetail: string;
  behavioral?: string | null;
  consumerType?: string | null;
  relationshipStatus?: string | null;
  totalSpending: number;
  totalTransactions: number;
  crisisStatus?: string | null;
  createdAt: string;
}

const COURIER_OPTIONS = [
  "JNE",
  "SiCepat",
  "J&T Express",
  "TIKI",
  "POS Indonesia",
  "IDExpress",
  "Ninja Express",
  "Wahana",
  "Lion Parcel",
];

const BEHAVIORAL_OPTIONS = [
  "Value Seeker",
  "Price Sensitive",
  "Design Oriented",
  "Convenience Seeker",
];

const CONSUMER_TYPE_OPTIONS = [
  "Orang Tua",
  "Orang Aring",
  "GENZI",
  "ANJING",
];

const RELATIONSHIP_STATUS_OPTIONS = [
  "New Customer",
  "Repeat Buyer",
];

function CustomersPageContent() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Initial values set to empty ("") / null by default
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [domisili, setDomisili] = useState("");
  const [shippingCostInput, setShippingCostInput] = useState<string>("");
  const [courier, setCourier] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [behavioral, setBehavioral] = useState("");
  const [consumerType, setConsumerType] = useState("");
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [crisisStatus, setCrisisStatus] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchCustomers = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const url = q ? `/api/customers?search=${encodeURIComponent(q)}` : "/api/customers";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers(search);
  }, [search, fetchCustomers]);

  const openCreateModal = useCallback(() => {
    setEditingCustomer(null);
    setName("");
    setWhatsapp("");
    setDomisili("");
    setShippingCostInput("");
    setCourier("");
    setAddressDetail("");
    setBehavioral("");
    setConsumerType("");
    setRelationshipStatus("");
    setCrisisStatus("");
    setErrorMessage(null);
    setIsModalOpen(true);
  }, []);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      (window.location.search.includes("action=new") ||
        window.location.search.includes("new=true") ||
        searchParams.get("action") === "new" ||
        searchParams.get("new") === "true")
    ) {
      openCreateModal();
    }
  }, [searchParams, openCreateModal]);

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setWhatsapp(c.whatsapp);
    setDomisili(c.domisili || "");
    setShippingCostInput(c.shippingCost !== undefined && c.shippingCost !== null ? String(c.shippingCost) : "");
    setCourier(c.courier || "");
    setAddressDetail(c.addressDetail);
    setBehavioral(c.behavioral || "");
    setConsumerType(c.consumerType || "");
    setRelationshipStatus(c.relationshipStatus || "");
    setCrisisStatus(c.crisisStatus || "");
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    try {
      const payload = {
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        domisili: domisili.trim(),
        shippingCost: parseInt(shippingCostInput, 10) || 0,
        courier: courier.trim(),
        addressDetail: addressDetail.trim(),
        behavioral: behavioral.trim(),
        consumerType: consumerType.trim(),
        relationshipStatus: relationshipStatus.trim(),
        crisisStatus: crisisStatus.trim(),
      };

      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : "/api/customers";
      const method = editingCustomer ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Gagal menyimpan data pelanggan.");
        showToast(data.error || "Gagal menyimpan data pelanggan.", "error");
      } else {
        const msg = editingCustomer ? `Data pelanggan ${name} berhasil diperbarui.` : `Pelanggan baru ${name} berhasil ditambahkan.`;
        showToast(msg, "success");
        setIsModalOpen(false);
        fetchCustomers(search);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setErrorMessage(msg);
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Customer) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus pelanggan '${c.name}'? Seluruh pesanan terkait akan ikut terhapus, tetapi produk akan kembali ke etalase Tersedia.`)) return;

    try {
      const res = await fetch(`/api/customers/${c.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "Gagal menghapus pelanggan.", "error");
      } else {
        showToast(`Pelanggan '${c.name}' berhasil dihapus.`, "success");
        fetchCustomers(search);
      }
    } catch {
      showToast("Terjadi kesalahan koneksi saat menghapus pelanggan.", "error");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#f8fafc]">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full px-6 h-16 bg-white border-b border-slate-200 z-30 sticky top-0 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-blue-700 tracking-tight">CRM Database Pelanggan</h1>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors active:scale-95 shadow-sm"
        >
          Tambah Pelanggan Baru
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 bg-[#f8fafc] w-full pb-8 space-y-6">

        {/* Search Bar */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <input
            type="text"
            placeholder="Cari CUST ID, nama pelanggan, WhatsApp, domisili, ekspedisi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
          />
        </div>

        {/* Customers Data Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">Loading database pelanggan...</div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              Tidak ada data pelanggan yang ditemukan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-center">CUST ID</th>
                    <th className="p-4 text-center">Nama Pelanggan</th>
                    <th className="p-4 text-center">No. WA</th>
                    <th className="p-4 text-center">Domisili & Detail Alamat</th>
                    <th className="p-4 text-center">Ongkir & Ekspedisi</th>
                    <th className="p-4 text-center">Tipe & Behavioral</th>
                    <th className="p-4 text-center">Status & Catatan Krisis</th>
                    <th className="p-4 text-center">Spending & Transaksi</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-center font-mono font-extrabold text-blue-600">#{c.id}</td>
                      
                      <td className="p-4 text-center font-bold text-slate-900 text-sm">{c.name}</td>
                      
                      <td className="p-4 text-center font-mono text-blue-600">
                        <a
                          href={`https://wa.me/${c.whatsapp}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline font-bold"
                        >
                          {c.whatsapp}
                        </a>
                      </td>

                      <td className="p-4 text-center max-w-xs">
                        <span className="font-bold text-slate-800 block truncate">{c.domisili || "-"}</span>
                        <span className="text-[11px] text-slate-500 block truncate mt-0.5">{c.addressDetail}</span>
                      </td>

                      <td className="p-4 text-center font-mono">
                        <span className="font-bold text-slate-900 block">Rp {(c.shippingCost || 0).toLocaleString("id-ID")}</span>
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-bold inline-block mt-0.5">
                          {c.courier || "JNE"}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 text-[10px] font-bold block mb-1">
                          {c.consumerType || "Value Seeker"}
                        </span>
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 text-[10px] font-bold block">
                          {c.behavioral || "Pelanggan Setia"}
                        </span>
                      </td>

                      <td className="p-4 text-center max-w-xs">
                        <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-bold block mb-1">
                          {c.relationshipStatus || "New Customer"}
                        </span>
                        {c.crisisStatus ? (
                          <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200 text-[10px] font-medium block truncate" title={c.crisisStatus}>
                            Catatan: {c.crisisStatus}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 block font-normal">-</span>
                        )}
                      </td>

                      <td className="p-4 text-center font-mono">
                        <span className="font-bold text-slate-900 block">Rp {(c.totalSpending || 0).toLocaleString("id-ID")}</span>
                        <span className="text-[10px] text-slate-500 font-bold block mt-0.5">
                          {c.totalTransactions || 0} Transaksi
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <TableActionsMenu
                          items={[
                            {
                              label: "Edit Pelanggan",
                              icon: "edit",
                              onClick: () => openEditModal(c),
                            },
                            {
                              label: "Hapus Pelanggan",
                              icon: "delete",
                              danger: true,
                              onClick: () => handleDelete(c),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Modal Form Tambah/Edit Pelanggan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingCustomer ? `Edit Pelanggan [${editingCustomer.id}]` : "Tambah Pelanggan Baru"}
              </h3>
            </div>

            {errorMessage && (
              <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl text-blue-900 text-xs font-bold">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              {/* CUST ID Badge */}
              {editingCustomer ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-blue-700 flex justify-between items-center">
                  <span>CUST ID:</span>
                  <span>#{editingCustomer.id}</span>
                </div>
              ) : (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-medium text-blue-800">
                  CUST ID akan dibuat otomatis (Format: CST-YYMMDD-XX)
                </div>
              )}

              {/* Row 1: Nama & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nama Pelanggan *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Siti Rahma"
                    required
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">No. WhatsApp *</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    required
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Row 2: Domisili, Ongkir, Ekspedisi */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Domisili *</label>
                  <input
                    type="text"
                    value={domisili}
                    onChange={(e) => setDomisili(e.target.value)}
                    placeholder="Contoh: Kab. Bogor, Jawa Barat"
                    required
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Ongkir Default (Rp)</label>
                  <input
                    type="number"
                    value={shippingCostInput}
                    onChange={(e) => setShippingCostInput(e.target.value)}
                    placeholder="Contoh: 15000"
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Ekspedisi Preferred</label>
                  <select
                    value={courier}
                    onChange={(e) => setCourier(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-medium"
                  >
                    <option value="">-- Pilih Ekspedisi --</option>
                    {COURIER_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Detail Alamat */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Detail Alamat Jalan & Patokan *</label>
                <textarea
                  rows={2}
                  value={addressDetail}
                  onChange={(e) => setAddressDetail(e.target.value)}
                  placeholder="Contoh: Jl. Jendral Sudirman No. 45, RT 02/RW 05..."
                  required
                  className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Row 4: Behavioral & Tipe Konsumen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Behavioral</label>
                  <select
                    value={behavioral}
                    onChange={(e) => setBehavioral(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-medium"
                  >
                    <option value="">-- Pilih Behavioral --</option>
                    {BEHAVIORAL_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Tipe Konsumen</label>
                  <input
                    type="text"
                    value={consumerType}
                    onChange={(e) => setConsumerType(e.target.value)}
                    placeholder="Contoh: Value Seeker, Price Sensitive, Design Oriented, Convenience Seeker, Eceran"
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 5: Status Hubungan & Catatan Status Krisis (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Status Hubungan</label>
                  <select
                    value={relationshipStatus}
                    onChange={(e) => setRelationshipStatus(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-medium"
                  >
                    <option value="">-- Pilih Status Hubungan --</option>
                    {RELATIONSHIP_STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Status Krisis (Catatan Opsional)</label>
                  <input
                    type="text"
                    value={crisisStatus}
                    onChange={(e) => setCrisisStatus(e.target.value)}
                    placeholder="Contoh: Sering komplain, Pernah cancel DP"
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

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
                  {saving ? "Menyimpan..." : "Simpan Data Pelanggan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500 text-sm">Loading pelanggan...</div>}>
      <CustomersPageContent />
    </Suspense>
  );
}
