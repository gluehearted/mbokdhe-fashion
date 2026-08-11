"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TableActionsMenu } from "@/components/TableActionsMenu";

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
  "Loyal",
  "Repeat Buyer",
  "Impulse Buyer",
  "Bargain Hunter",
  "High Value",
  "Hesitant",
];

const CONSUMER_TYPE_OPTIONS = [
  "Retail",
  "Reseller",
  "Dropshipper",
  "VIP",
  "Wholesale",
];

const RELATIONSHIP_STATUS_OPTIONS = [
  "Active",
  "Warm",
  "Cold",
  "New Lead",
  "Churned",
];

const CRISIS_STATUS_OPTIONS = [
  "Normal",
  "Low Risk",
  "Medium Risk",
  "High Risk",
  "Blacklisted",
];

function CustomersPageContent() {
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [domisili, setDomisili] = useState("");
  const [shippingCostInput, setShippingCostInput] = useState<string>("");
  const [courier, setCourier] = useState("JNE");
  const [addressDetail, setAddressDetail] = useState("");
  const [behavioral, setBehavioral] = useState("Loyal");
  const [consumerType, setConsumerType] = useState("Retail");
  const [relationshipStatus, setRelationshipStatus] = useState("Active");
  const [crisisStatus, setCrisisStatus] = useState("Normal");

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchCustomers = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const url = q ? `/api/customers?search=${encodeURIComponent(q)}` : "/api/customers";
      // API Call: GET /api/customers (mengambil database pelanggan)
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
    setDomisili("Kabupaten Bogor, Jawa Barat");
    setShippingCostInput("15000");
    setCourier("JNE");
    setAddressDetail("");
    setBehavioral("Loyal");
    setConsumerType("Retail");
    setRelationshipStatus("Active");
    setCrisisStatus("Normal");
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
    setShippingCostInput(c.shippingCost ? String(c.shippingCost) : "0");
    setCourier(c.courier || "JNE");
    setAddressDetail(c.addressDetail);
    setBehavioral(c.behavioral || "Loyal");
    setConsumerType(c.consumerType || "Retail");
    setRelationshipStatus(c.relationshipStatus || "Active");
    setCrisisStatus(c.crisisStatus || "Normal");
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
        courier,
        addressDetail: addressDetail.trim(),
        behavioral,
        consumerType,
        relationshipStatus,
        crisisStatus,
      };

      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : "/api/customers";
      const method = editingCustomer ? "PATCH" : "POST";

      // API Call: POST /api/customers atau PATCH /api/customers/[id]
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Gagal menyimpan data pelanggan.");
      } else {
        setSuccessMessage(editingCustomer ? "Data pelanggan diperbarui." : "Pelanggan baru berhasil ditambahkan.");
        setIsModalOpen(false);
        fetchCustomers(search);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Customer) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus pelanggan '${c.name}'?`)) return;

    try {
      // API Call: DELETE /api/customers/[id]
      const res = await fetch(`/api/customers/${c.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Gagal menghapus pelanggan.");
      } else {
        setSuccessMessage(`Pelanggan '${c.name}' berhasil dihapus.`);
        fetchCustomers(search);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch {
      alert("Terjadi kesalahan koneksi.");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#f7f9fb]">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full px-6 h-16 bg-white border-b border-slate-200 z-30 sticky top-0 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-blue-700 tracking-tight">CRM Database Pelanggan</h1>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors active:scale-95 shadow-sm"
        >
          <span className="material-symbols-outlined text-sm font-bold">add</span>
          <span>Tambah Pelanggan Baru</span>
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 bg-[#f7f9fb] w-full pb-8 space-y-6">

        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold text-center">
            ✅ {successMessage}
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center gap-3">
          <span className="material-symbols-outlined text-slate-400">search</span>
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
                    <th className="p-4 text-center">Status & Krisis</th>
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
                          className="hover:underline inline-flex items-center gap-1 font-bold justify-center"
                        >
                          💬 {c.whatsapp}
                        </a>
                      </td>

                      <td className="p-4 text-center max-w-xs">
                        <span className="font-bold text-slate-800 block truncate">{c.domisili || "-"}</span>
                        <span className="text-[11px] text-slate-500 block truncate mt-0.5">{c.addressDetail}</span>
                      </td>

                      <td className="p-4 text-center font-mono">
                        <span className="font-bold text-slate-900 block">Rp {(c.shippingCost || 0).toLocaleString("id-ID")}</span>
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-bold inline-block mt-0.5">
                          🚚 {c.courier || "JNE"}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px] font-bold block mb-1">
                          {c.consumerType || "Retail"}
                        </span>
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold block">
                          {c.behavioral || "Loyal"}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold block mb-1 ${
                            c.relationshipStatus === "Active"
                              ? "bg-blue-600 text-white"
                              : c.relationshipStatus === "Warm"
                              ? "bg-amber-500 text-white"
                              : "bg-slate-600 text-white"
                          }`}
                        >
                          {c.relationshipStatus || "Active"}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold block ${
                            c.crisisStatus === "High Risk" || c.crisisStatus === "Blacklisted"
                              ? "bg-rose-600 text-white"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {c.crisisStatus || "Normal"}
                        </span>
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
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-lg">person</span>
                {editingCustomer ? `Edit Pelanggan [${editingCustomer.id}]` : "Tambah Pelanggan Baru"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                ⚠️ {errorMessage}
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
                <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-lg text-xs font-medium text-blue-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-blue-600">auto_awesome</span>
                  <span>CUST ID akan dibuat otomatis (Format: CST-YYMMDD-XX)</span>
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
                    placeholder="Kab. Bogor, Jawa Barat"
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
                    placeholder="15000"
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Ekspedisi Preferred</label>
                  <select
                    value={courier}
                    onChange={(e) => setCourier(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-bold"
                  >
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
                  placeholder="Jl. Jendral Sudirman No. 45, RT 02/RW 05, Patokan Pagar Biru..."
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
                    {BEHAVIORAL_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Tipe Konsumen</label>
                  <select
                    value={consumerType}
                    onChange={(e) => setConsumerType(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-medium"
                  >
                    {CONSUMER_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 5: Status Hubungan & Status Krisis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Status Hubungan</label>
                  <select
                    value={relationshipStatus}
                    onChange={(e) => setRelationshipStatus(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-medium"
                  >
                    {RELATIONSHIP_STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Status Krisis</label>
                  <select
                    value={crisisStatus}
                    onChange={(e) => setCrisisStatus(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-medium"
                  >
                    {CRISIS_STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
