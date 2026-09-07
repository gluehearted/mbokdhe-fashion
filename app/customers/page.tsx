"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TableActionsMenu } from "@/components/TableActionsMenu";
import { useToast } from "@/components/ToastProvider";
import { ConfirmModal } from "@/components/ConfirmModal";
import CustomerForm from "@/components/forms/CustomerForm";

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

function CustomersPageContent() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State Modal & Data
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // State Hapus Customer
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);

  // State Paginasi & Pencarian
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  const fetchCustomers = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", String(itemsPerPage));
      if (q.trim()) params.set("search", q.trim());

      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data || []);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch {
      showToast("Gagal memuat data pelanggan.", "error");
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, showToast]);

  // Handle Search Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Trigger Fetching
  useEffect(() => {
    fetchCustomers(debouncedSearch);
  }, [debouncedSearch, fetchCustomers]);

  // Simple handler untuk membuka modal form (jauh lebih bersih karena state form ada di CustomerForm)
  const openCreateModal = useCallback(() => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  }, []);

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setIsModalOpen(true);
  };

  // Cek parameter URL untuk auto-open modal create
  useEffect(() => {
    if (searchParams.get("action") === "new" || searchParams.get("new") === "true") {
      openCreateModal();
    }
  }, [searchParams, openCreateModal]);

  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsDeletingCustomer(true);
    try {
      const res = await fetch(`/api/customers/${customerToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "Gagal menghapus pelanggan.", "error");
      } else {
        showToast(`Pelanggan '${customerToDelete.name}' berhasil dihapus.`, "success");
        setCustomerToDelete(null);
        fetchCustomers(debouncedSearch);
      }
    } catch {
      showToast("Terjadi kesalahan koneksi saat menghapus pelanggan.", "error");
    } finally {
      setIsDeletingCustomer(false);
    }
  };

  const currentTableData = customers;

  return (
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#fbfbfa] dark:bg-[#0c0d0f] text-[#111111] dark:text-[#f3f3f3] font-ui transition-colors duration-200">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full pl-14 pr-4 md:px-6 h-16 bg-white dark:bg-[#141517] border-b border-[#eaeaea] dark:border-slate-800/80 z-30 sticky top-0 shrink-0 transition-colors">
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
          Tambah Pelanggan
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-3.5 sm:p-6 bg-[#fbfbfa] dark:bg-[#0c0d0f] w-full pb-8 space-y-4 sm:space-y-6">

        {/* Search Bar */}
        <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 p-3.5 sm:p-5 rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
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
                        <span className="text-[9px] bg-white dark:bg-[#141517] text-[#111111] dark:text-[#f3f3f3] border border-[#eaeaea] dark:border-slate-800 px-2 py-0.5 rounded-full font-bold inline-block mt-0.5 uppercase tracking-wider">
                          {c.courier || "JNE"}
                        </span>
                      </td>

                      <td className="p-4 text-center space-y-1">
                        <span className="bg-[#111111] text-white dark:bg-white dark:text-[#111111] px-2.5 py-0.5 rounded-full text-[9px] font-bold inline-block uppercase tracking-wider">
                          {c.consumerType || "Value Seeker"}
                        </span>
                        <span className="bg-white dark:bg-[#141517] text-[#111111] dark:text-[#f3f3f3] border border-[#eaeaea] dark:border-slate-800 px-2.5 py-0.5 rounded-full text-[9px] font-bold block mx-auto max-w-[120px] truncate uppercase tracking-wider">
                          {c.behavioral || "Pelanggan Setia"}
                        </span>
                      </td>

                      <td className="p-4 text-center max-w-xs space-y-1">
                        <span className="bg-[#787774] text-white dark:bg-slate-700 dark:text-slate-200 px-2.5 py-0.5 rounded-full text-[9px] font-bold inline-block uppercase tracking-wider">
                          {c.relationshipStatus || "New Customer"}
                        </span>
                        {c.crisisStatus ? (
                          <span className="bg-white dark:bg-[#141517] text-[#111111] dark:text-[#f3f3f3] border border-[#eaeaea] dark:border-slate-800 px-2 py-0.5 rounded-[4px] text-[9px] font-medium block truncate max-w-[140px] mx-auto uppercase tracking-wide" title={c.crisisStatus}>
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
                              onClick: () => setCustomerToDelete(c),
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
                  Menampilkan <span className="font-bold text-[#111111] dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> -{" "}
                  <span className="font-bold text-[#111111] dark:text-white">
                    {Math.min(currentPage * itemsPerPage, totalCount)}
                  </span>{" "}
                  dari total <span className="font-bold text-[#111111] dark:text-white">{totalCount}</span> pelanggan
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] max-w-xl w-full p-4 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.04)] overflow-y-auto max-h-[90vh] transition-colors animate-fade-in-up">
            <CustomerForm
              initialData={editingCustomer}
              showExtendedFields={true}
              onCancel={() => setIsModalOpen(false)}
              onSubmitSuccess={() => {
                const msg = editingCustomer ? "Data pelanggan berhasil diperbarui." : "Pelanggan baru berhasil ditambahkan.";
                showToast(msg, "success");
                setIsModalOpen(false);
                fetchCustomers();
              }}
            />
          </div>
        </div>
      )}

      {/* Confirm Modal Hapus Pelanggan */}
      <ConfirmModal
        isOpen={Boolean(customerToDelete)}
        onClose={() => setCustomerToDelete(null)}
        onConfirm={confirmDeleteCustomer}
        title="Hapus Data Pelanggan"
        message={
          customerToDelete ? (
            <div className="space-y-2">
              <p>
                Apakah Anda yakin ingin menghapus data pelanggan{" "}
                <span className="font-bold text-[#111111] dark:text-white font-technical">
                  &quot;{customerToDelete.name}&quot;
                </span>{" "}
                (#{customerToDelete.id.toUpperCase()})?
              </p>
              <p className="text-[11px] text-[#9F2F2D] dark:text-red-400 font-semibold">
                Seluruh pesanan terkait pelanggan ini akan ikut terhapus, namun tas/produk yang belum terjual akan otomatis kembali ke etalase Tersedia.
              </p>
            </div>
          ) : ""
        }
        confirmText="Ya, Hapus Pelanggan"
        cancelText="Batal"
        isLoading={isDeletingCustomer}
      />
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
