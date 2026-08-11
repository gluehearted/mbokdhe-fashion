"use client";

import { useState, useEffect, useCallback } from "react";
import { TableActionsMenu } from "@/components/TableActionsMenu";

interface Shop {
  id: string;
  name: string;
  createdAt: string;
}

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [shopNameInput, setShopNameInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      } else {
        setSuccessMessage(
          editingShop ? "Nama toko berhasil diperbarui." : "Toko baru berhasil ditambahkan."
        );
        setIsModalOpen(false);
        fetchShops();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch {
      setErrorMessage("Terjadi kesalahan koneksi.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (shop: Shop) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus toko '${shop.name}'?`)) return;

    try {
      const res = await fetch(`/api/shops/${shop.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Gagal menghapus toko.");
      } else {
        setSuccessMessage(`Toko ${shop.name} berhasil dihapus.`);
        fetchShops();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch {
      alert("Terjadi kesalahan koneksi.");
    }
  };

  const filteredShops = shops.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#f7f9fb]">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full px-6 h-16 bg-white border-b border-slate-200 z-30 sticky top-0 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-blue-700 tracking-tight">Kelola Toko & Supplier</h1>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors active:scale-95 shadow-sm"
        >
          <span className="material-symbols-outlined text-sm font-bold">add</span>
          <span>Tambah Toko Baru</span>
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 bg-[#f7f9fb] w-full pb-8 space-y-6">
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold text-center">
            ✅ {successMessage}
          </div>
        )}

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
          <h2 className="text-sm font-bold text-slate-800">
            Daftar Nama Toko Terdaftar ({filteredShops.length})
          </h2>
          <input
            type="text"
            placeholder="Cari nama toko..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 bg-slate-50 text-slate-800 text-xs px-3.5 py-2 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
          />
        </div>

        {/* Shops Table (Centered) */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">Loading toko...</div>
          ) : filteredShops.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              Belum ada toko yang terdaftar. Klik &quot;Tambah Toko Baru&quot; untuk menambahkan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-center">No</th>
                    <th className="p-4 text-center">Nama Toko / Supplier</th>
                    <th className="p-4 text-center">Tanggal Didaftarkan</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredShops.map((shop, idx) => (
                    <tr key={shop.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                      <td className="p-4 text-center font-bold text-slate-900">
                        <span className="inline-flex items-center gap-1.5 justify-center">
                          <span className="material-symbols-outlined text-blue-600 text-base">storefront</span>
                          <span>{shop.name}</span>
                        </span>
                      </td>
                      <td className="p-4 text-center text-slate-500 font-mono">
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
              {editingShop ? "Edit Nama Toko" : "Tambah Toko Baru"}
            </h3>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                ⚠️ {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nama Toko / Supplier *</label>
                <input
                  type="text"
                  value={shopNameInput}
                  onChange={(e) => setShopNameInput(e.target.value)}
                  placeholder="Misal: Sukaraja Store, Supplier Batam"
                  required
                  autoFocus
                  className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
                />
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
                  {saving ? "Menyimpan..." : "Simpan Toko"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
