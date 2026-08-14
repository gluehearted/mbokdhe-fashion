"use client";

import { useState, useEffect, useCallback } from "react";
import { TableActionsMenu } from "@/components/TableActionsMenu";
import { useToast } from "@/components/ToastProvider";
import { ConfirmModal } from "@/components/ConfirmModal";

interface Shop {
  id: string;
  name: string;
  createdAt: string;
  totalProducts?: number;
  availableProducts?: number;
}

export default function ShopsPage() {
  const { showToast } = useToast();

  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [shopNameInput, setShopNameInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [shopToDelete, setShopToDelete] = useState<Shop | null>(null);
  const [isDeletingShop, setIsDeletingShop] = useState(false);

  const fetchShops = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shops");
      const data = await res.json();
      if (data.success) {
        setShops(data.data);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (isMounted) {
        await fetchShops();
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [fetchShops]);

  const openCreateModal = () => {
    setEditingShop(null);
    setShopNameInput("");
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (shop: Shop) => {
    setEditingShop(shop);
    setShopNameInput(shop.name);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopNameInput.trim()) {
      setErrorMessage("Nama toko wajib diisi.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const url = editingShop ? `/api/shops/${editingShop.id}` : "/api/shops";
      const method = editingShop ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: shopNameInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Gagal menyimpan toko.");
        showToast(data.error || "Gagal menyimpan toko.", "error");
      } else {
        const msg = editingShop ? "Nama toko berhasil diperbarui." : "Toko baru berhasil ditambahkan.";
        showToast(msg, "success");
        setIsModalOpen(false);
        fetchShops();
      }
    } catch {
      setErrorMessage("Terjadi kesalahan koneksi.");
      showToast("Terjadi kesalahan koneksi.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (shop: Shop) => {
    setShopToDelete(shop);
  };

  const confirmDeleteShop = async () => {
    if (!shopToDelete) return;
    setIsDeletingShop(true);
    try {
      const res = await fetch(`/api/shops/${shopToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "Gagal menghapus toko.", "error");
      } else {
        showToast(`Toko '${shopToDelete.name}' berhasil dihapus.`, "success");
        setShopToDelete(null);
        fetchShops();
      }
    } catch {
      showToast("Terjadi kesalahan koneksi saat menghapus toko.", "error");
    } finally {
      setIsDeletingShop(false);
    }
  };

  const filteredShops = shops.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#fbfbfa] dark:bg-[#0c0d0f] text-[#111111] dark:text-[#f3f3f3] font-ui transition-colors duration-200">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full pl-14 pr-4 md:px-6 h-16 bg-white dark:bg-[#141517] border-b border-[#eaeaea] dark:border-slate-800/80 z-30 sticky top-0 shrink-0 transition-colors">
        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-[#111111] dark:text-[#f3f3f3] tracking-tight uppercase font-technical">
            Kelola Toko & Supplier
          </h1>
          <span className="text-[10px] text-[#787774] dark:text-slate-400 font-technical uppercase mt-0.5 tracking-wider">
            [ Shops Directory ]
          </span>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] px-4 py-2 rounded-[6px] font-semibold text-xs uppercase tracking-wider transition-colors active:scale-95 shadow-sm cursor-pointer"
        >
          Tambah Toko
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 bg-[#fbfbfa] dark:bg-[#0c0d0f] w-full pb-8 space-y-6">

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 p-5 rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <h2 className="text-xs font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
            Daftar Nama Toko Terdaftar ({filteredShops.length})
          </h2>
          <input
            type="text"
            placeholder="Cari nama toko..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white text-xs px-3.5 py-2 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none font-medium transition-colors"
          />
        </div>

        {/* Shops Table */}
        <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-colors">
          {loading ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs font-technical uppercase">[ Loading toko... ]</div>
          ) : filteredShops.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-xs font-technical uppercase">
              Belum ada toko yang terdaftar. Klik &quot;Tambah Toko&quot; untuk menambahkan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs text-slate-700 dark:text-slate-300 border-collapse">
                <thead className="bg-[#F9F9F8] dark:bg-slate-900/60 border-b border-[#eaeaea] dark:border-slate-800 text-[10px] text-[#787774] dark:text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4 text-center">No</th>
                    <th className="p-4 text-center">Nama Toko / Supplier</th>
                    <th className="p-4 text-center">Jumlah Produk</th>
                    <th className="p-4 text-center">Tanggal Didaftarkan</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f1f1] dark:divide-slate-800 font-technical text-xs text-slate-800 dark:text-slate-200">
                  {filteredShops.map((shop, idx) => (
                    <tr key={shop.id} className="hover:bg-[#F9F9F8] dark:hover:bg-slate-900/20 transition-colors">
                      <td className="p-4 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-4 text-center font-semibold text-[#111111] dark:text-[#f3f3f3]">
                        {shop.name}
                      </td>
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-2 font-technical text-xs justify-center">
                          <span className="font-bold text-[#111111] dark:text-white px-2.5 py-1 rounded-[6px] bg-[#f5f5f5] dark:bg-slate-800 border border-[#eaeaea] dark:border-slate-700 shadow-sm">
                            {shop.totalProducts || 0} Total
                          </span>
                          <span className="font-bold text-[#1F6C9F] dark:text-[#6cb6e4] px-2.5 py-1 rounded-[6px] bg-[#E1F3FE] dark:bg-[#18232c] border border-[#c5e6fb] dark:border-[#1F6C9F]/40 shadow-sm">
                            {shop.availableProducts || 0} Tersedia
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center text-slate-400 dark:text-slate-500">
                        {new Date(shop.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="p-4 text-center">
                        <TableActionsMenu
                          items={[
                            {
                              label: "Edit Nama Toko",
                              icon: "edit",
                              onClick: () => openEditModal(shop),
                            },
                            {
                              label: "Hapus Toko",
                              icon: "delete",
                              danger: true,
                              onClick: () => handleDelete(shop),
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

      {/* Modal Tambah/Edit Toko */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] max-w-md w-full p-6 space-y-5 shadow-[0_12px_40px_rgba(0,0,0,0.04)] animate-fade-in-up">
            <h3 className="text-sm font-bold text-[#111111] dark:text-[#f3f3f3] border-b border-[#eaeaea] dark:border-slate-800 pb-3 uppercase font-technical">
              {editingShop ? "Edit Nama Toko" : "Tambah Toko"}
            </h3>

            {errorMessage && (
              <div className="p-3 bg-[#FDEBEC] text-[#9F2F2D] border border-[#f5c2c2] rounded-[6px] text-xs font-semibold text-center font-technical">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-ui">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
                  Nama Toko / Supplier *
                </label>
                <input
                  type="text"
                  value={shopNameInput}
                  onChange={(e) => setShopNameInput(e.target.value)}
                  placeholder="Contoh: Sukaraja Store, Supplier Batam"
                  required
                  autoFocus
                  className="w-full bg-white dark:bg-[#1c1d1f] text-[#111111] dark:text-white p-2.5 rounded-[6px] border border-[#eaeaea] dark:border-slate-800 focus:border-[#111111] dark:focus:border-slate-500 focus:outline-none"
                />
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
                  {saving ? "Menyimpan..." : "Simpan Toko"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal Hapus Toko */}
      <ConfirmModal
        isOpen={Boolean(shopToDelete)}
        onClose={() => setShopToDelete(null)}
        onConfirm={confirmDeleteShop}
        title="Hapus Toko / Supplier"
        message={
          shopToDelete ? (
            <div className="space-y-2">
              <p>
                Apakah Anda yakin ingin menghapus data toko{" "}
                <span className="font-bold text-[#111111] dark:text-white font-technical">
                  &quot;{shopToDelete.name}&quot;
                </span>
                ?
              </p>
              <p className="text-[11px] text-[#9F2F2D] dark:text-red-400 font-semibold">
                Toko ini akan dihapus dari daftar supplier. Seluruh produk terkait akan kehilangan asosiasi nama toko ini.
              </p>
            </div>
          ) : ""
        }
        confirmText="Ya, Hapus Toko"
        cancelText="Batal"
        isLoading={isDeletingShop}
      />
    </div>
  );
}
