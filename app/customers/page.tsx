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

const RELATIONSHIP_STATUS_OPTIONS = [
  "New Customer",
  "Repeat Buyer",
];

function CustomersPageContent() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

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

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    fetchCustomers(debouncedSearch);
  }, [debouncedSearch, fetchCustomers]);

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
    if (searchParams.get("action") === "new" || searchParams.get("new") === "true") {
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
      let cleanWa = whatsapp.trim().replace(/[^0-9]/g, "");
      
      if (cleanWa.startsWith("0")) {
        cleanWa = "62" + cleanWa.substring(1);
      }

      const payload = {
        name: name.trim(),
        whatsapp: cleanWa,
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
        fetchCustomers(debouncedSearch);
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
        fetchCustomers(debouncedSearch);
      }
    } catch {
      showToast("Terjadi kesalahan koneksi saat menghapus pelanggan.", "error");
    }
  };

  const totalPages = Math.ceil(customers.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTableData = customers.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#fbfbfa] dark:bg-[#0c0d0f] text-[#111111] dark:text-[#f3f3f3] font-ui transition-colors duration-200">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full px-6 h-16 bg-white dark:bg-[#141517] border-b border-[#eaeaea] dark:border-slate-800/80 z-30 sticky top-0 shrink-0 transition-colors">
        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-[#111111] dark:text-[#f3f3f3] tracking-tight uppercase font-technical">
            CRM Database Pelanggan
          </h1>
          <span className="text-[10px] text-[#787774] dark:text-slate-400 font-technical uppercase mt-0.5 tracking-wider">
            [ Customer Records ]
          </span>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] px-4 py-2 rounded-[6px] font-semibold text-xs uppercase tracking-wider transition-colors active:scale-95 shadow-sm cursor-pointer"
        >
          Tambah Pelanggan Baru
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 bg-[#fbfbfa] dark:bg-[#0c0d0f] w-full pb-8 space-y-6">

        {/* Search Bar */}
        <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 p-5 rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <input
            type="text"
            placeholder="Cari CUST ID, nama pelanggan, WhatsApp, domisili, ekspedisi..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white text-xs px-3.5 py-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium transition-colors"
          />
        </div>

        {/* Customers Data Table */}
        <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-colors">
          {loading ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs font-technical uppercase">[ Loading database pelanggan... ]</div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs font-technical uppercase">
              Tidak ada data pelanggan yang ditemukan.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full text-center text-xs text-slate-700 dark:text-slate-300 border-collapse">
                <thead className="bg-[#F9F9F8] dark:bg-slate-900/60 border-b border-[#eaeaea] dark:border-slate-800 text-[10px] text-[#787774] dark:text-slate-400 font-bold uppercase tracking-wider">
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
                <tbody className="divide-y divide-[#f1f1f1] dark:divide-slate-800 font-technical text-xs text-slate-800 dark:text-slate-200">
                  {currentTableData.map((c) => (
                    <tr key={c.id} className="hover:bg-[#F9F9F8] dark:hover:bg-slate-900/20 transition-colors">
                      <td className="p-4 text-center font-bold text-[#111111] dark:text-[#f3f3f3]">#{c.id.toUpperCase()}</td>
                      
                      <td className="p-4 text-center font-semibold text-[#111111] dark:text-[#f3f3f3] text-xs">{c.name}</td>
                      
                      <td className="p-4 text-center font-bold text-slate-900 dark:text-slate-100">
                        <a
                          href={`https://wa.me/${c.whatsapp}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                        >
                          {c.whatsapp}
                        </a>
                      </td>

                      <td className="p-4 text-center max-w-xs font-ui">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">{c.domisili || "-"}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate mt-0.5">{c.addressDetail}</span>
                      </td>

                      <td className="p-4 text-center">
                        <span className="font-semibold text-[#111111] dark:text-[#f3f3f3] block">Rp {(c.shippingCost || 0).toLocaleString("id-ID")}</span>
                        <span className="text-[9px] bg-[#E1F3FE] text-[#1F6C9F] dark:bg-[#1c2c35] dark:text-[#6cb6e4] px-2 py-0.5 rounded-full font-bold inline-block mt-0.5 uppercase tracking-wider">
                          {c.courier || "JNE"}
                        </span>
                      </td>

                      <td className="p-4 text-center space-y-1">
                        <span className="bg-[#EDF3EC] text-[#346538] dark:bg-[#182319] dark:text-[#a2e8aa] px-2.5 py-0.5 rounded-full text-[9px] font-bold inline-block uppercase tracking-wider">
                          {c.consumerType || "Value Seeker"}
                        </span>
                        <span className="bg-[#E1F3FE] text-[#1F6C9F] dark:bg-[#1c2c35] dark:text-[#6cb6e4] px-2.5 py-0.5 rounded-full text-[9px] font-bold block mx-auto max-w-[120px] truncate uppercase tracking-wider">
                          {c.behavioral || "Pelanggan Setia"}
                        </span>
                      </td>

                      <td className="p-4 text-center max-w-xs space-y-1">
                        <span className="bg-[#FBF3DB] text-[#956400] dark:bg-[#282115] dark:text-[#f8d484] px-2.5 py-0.5 rounded-full text-[9px] font-bold inline-block uppercase tracking-wider">
                          {c.relationshipStatus || "New Customer"}
                        </span>
                        {c.crisisStatus ? (
                          <span className="bg-[#FDEBEC] text-[#9F2F2D] border border-[#f5c2c2] dark:bg-[#2c1c1d] dark:text-[#fca5a5] dark:border-red-955/40 px-2 py-0.5 rounded-[4px] text-[9px] font-medium block truncate max-w-[140px] mx-auto uppercase tracking-wide" title={c.crisisStatus}>
                            Catatan: {c.crisisStatus}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-normal">-</span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <span className="font-semibold text-slate-900 dark:text-slate-200 block">Rp {(c.totalSpending || 0).toLocaleString("id-ID")}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">
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

            {/* Navigasi Pagination */}
            {customers.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#fbfbfa] dark:bg-slate-900/60 p-4 border-t border-[#eaeaea] dark:border-slate-800 font-technical uppercase">
                <span className="text-[10px] text-slate-500 dark:text-slate-450">
                  Menampilkan <span className="font-bold text-[#111111] dark:text-white">{startIndex + 1}</span> -{" "}
                  <span className="font-bold text-[#111111] dark:text-white">
                    {Math.min(startIndex + itemsPerPage, customers.length)}
                  </span>{" "}
                  dari total <span className="font-bold text-[#111111] dark:text-white">{customers.length}</span> pelanggan
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
          </>
          )}
        </div>

      </div>

      {/* Modal Form Tambah/Edit Pelanggan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] max-w-xl w-full p-6 space-y-4 shadow-[0_12px_40px_rgba(0,0,0,0.04)] overflow-y-auto max-h-[90vh] transition-colors animate-fade-in-up">
            <div className="flex justify-between items-center border-b border-[#eaeaea] dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-[#111111] dark:text-[#f3f3f3] uppercase font-technical">
                {editingCustomer ? `Edit Pelanggan [${editingCustomer.id}]` : "Tambah Pelanggan Baru"}
              </h3>
            </div>

            {errorMessage && (
              <div className="p-3 bg-[#FDEBEC] text-[#9F2F2D] border border-[#f5c2c2] rounded-[6px] text-xs font-semibold text-center font-technical">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-ui">
              
              {/* CUST ID Badge */}
              {editingCustomer ? (
                <div className="p-2.5 bg-white dark:bg-[#1c1d1f] border border-[#eaeaea] dark:border-slate-800 rounded-[6px] text-xs font-technical font-bold text-[#111111] dark:text-[#f3f3f3] flex justify-between items-center">
                  <span>CUST ID:</span>
                  <span>#{editingCustomer.id}</span>
                </div>
              ) : (
                <div className="p-2.5 bg-[#E1F3FE] text-[#1F6C9F] rounded-[6px] text-[10px] font-technical uppercase">
                  CUST ID akan dibuat otomatis (Format: CST-YYMMDD-XX)
                </div>
              )}

              {/* Row 1: Nama & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Nama Pelanggan *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Siti Rahma"
                    required
                    className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">No. WhatsApp</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="Contoh: 081234567890 (Opsional)"
                    className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-technical"
                  />
                </div>
              </div>

              {/* Row 2: Domisili, Ongkir, Ekspedisi */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Domisili</label>
                  <input
                    type="text"
                    value={domisili}
                    onChange={(e) => setDomisili(e.target.value)}
                    placeholder="Contoh: Kab. Bogor, Jawa Barat (Opsional)"
                    className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Ongkir Default (Rp)</label>
                  <input
                    type="number"
                    value={shippingCostInput}
                    onChange={(e) => setShippingCostInput(e.target.value)}
                    placeholder="Contoh: 15000"
                    className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-technical"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Ekspedisi Preferred</label>
                  <select
                    value={courier}
                    onChange={(e) => setCourier(e.target.value)}
                    className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium cursor-pointer"
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
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Detail Alamat Jalan & Patokan</label>
                <textarea
                  rows={2}
                  value={addressDetail}
                  onChange={(e) => setAddressDetail(e.target.value)}
                  placeholder="Contoh: Jl. Jendral Sudirman No. 45, RT 02/RW 05... (Opsional)"
                  className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none"
                />
              </div>

              {/* Row 4: Behavioral & Tipe Konsumen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Behavioral</label>
                  <select
                    value={behavioral}
                    onChange={(e) => setBehavioral(e.target.value)}
                    className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium cursor-pointer"
                  >
                    <option value="">-- Pilih Behavioral --</option>
                    {BEHAVIORAL_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Tipe Konsumen (Teks)</label>
                  <input
                    type="text"
                    value={consumerType}
                    onChange={(e) => setConsumerType(e.target.value)}
                    placeholder="Contoh: Value Seeker, Price Sensitive"
                    className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium"
                  />
                </div>
              </div>

              {/* Row 5: Status Hubungan & Catatan Status Krisis (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Status Hubungan</label>
                  <select
                    value={relationshipStatus}
                    onChange={(e) => setRelationshipStatus(e.target.value)}
                    className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium cursor-pointer"
                  >
                    <option value="">-- Pilih Status Hubungan --</option>
                    {RELATIONSHIP_STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">Status Krisis (Catatan Opsional)</label>
                  <input
                    type="text"
                    value={crisisStatus}
                    onChange={(e) => setCrisisStatus(e.target.value)}
                    placeholder="Contoh: Sering komplain, Pernah cancel DP"
                    className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium"
                  />
                </div>
              </div>

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
    <Suspense fallback={<div className="p-12 text-center text-slate-400 font-technical text-xs uppercase">[ Loading pelanggan... ]</div>}>
      <CustomersPageContent />
    </Suspense>
  );
}
