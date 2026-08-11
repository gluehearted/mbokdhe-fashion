"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { INDONESIA_LOCATIONS } from "@/lib/indonesia-locations";
import { TableActionsMenu } from "@/components/TableActionsMenu";

interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  province?: string | null;
  cityName?: string | null;
  cityId: number;
  district?: string | null;
  subdistrict?: string | null;
  postalCode?: string | null;
  addressDetail: string;
  createdAt: string;
  _count?: { orders: number };
}

interface ApiLocationItem {
  id: number;
  name: string;
  zip_code?: string;
}

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

  // Live RajaOngkir Step-by-Step State
  const [provinces, setProvinces] = useState<ApiLocationItem[]>([]);
  const [cities, setCities] = useState<ApiLocationItem[]>([]);
  const [districts, setDistricts] = useState<ApiLocationItem[]>([]);
  const [subdistricts, setSubdistricts] = useState<ApiLocationItem[]>([]);

  const [selectedProvinceId, setSelectedProvinceId] = useState<number | "">(11);
  const [selectedProvinceName, setSelectedProvinceName] = useState("RIAU");
  const [selectedCityId, setSelectedCityId] = useState<number>(338);
  const [selectedCityName, setSelectedCityName] = useState("Kota Pekanbaru");
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | "">("");
  const [selectedDistrictName, setSelectedDistrictName] = useState("Tampan");
  const [selectedSubdistrictId, setSelectedSubdistrictId] = useState<number | "">("");
  const [selectedSubdistrictName, setSelectedSubdistrictName] = useState("Delima");
  const [postalCode, setPostalCode] = useState("28289");
  const [addressDetail, setAddressDetail] = useState("");

  const [loadingLoc, setLoadingLoc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchCustomers = async (q = "") => {
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
  };

  useEffect(() => {
    fetchCustomers(search);
  }, [search]);

  // Load Provinces on Modal Open
  const loadProvinces = async () => {
    setLoadingLoc(true);
    try {
      const res = await fetch("/api/shipping/location/provinces");
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setProvinces(data.data);
        const first = data.data[0];
        setSelectedProvinceId(first.id);
        setSelectedProvinceName(first.name);
        loadCities(first.id);
      } else {
        useLocalFallback();
      }
    } catch {
      useLocalFallback();
    } finally {
      setLoadingLoc(false);
    }
  };

  const loadCities = async (provId: number) => {
    try {
      const res = await fetch(`/api/shipping/location/cities?provinceId=${provId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setCities(data.data);
        const first = data.data[0];
        setSelectedCityId(first.id);
        setSelectedCityName(first.name);
        if (first.zip_code && first.zip_code !== "0") setPostalCode(first.zip_code);
        loadDistricts(first.id);
      }
    } catch {
      // Ignore
    }
  };

  const loadDistricts = async (cId: number) => {
    try {
      const res = await fetch(`/api/shipping/location/districts?cityId=${cId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setDistricts(data.data);
        const first = data.data[0];
        setSelectedDistrictId(first.id);
        setSelectedDistrictName(first.name);
        if (first.zip_code && first.zip_code !== "0") setPostalCode(first.zip_code);
        loadSubdistricts(first.id);
      }
    } catch {
      // Ignore
    }
  };

  const loadSubdistricts = async (dId: number) => {
    try {
      const res = await fetch(`/api/shipping/location/subdistricts?districtId=${dId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setSubdistricts(data.data);
        const first = data.data[0];
        setSelectedSubdistrictId(first.id);
        setSelectedSubdistrictName(first.name);
        if (first.zip_code && first.zip_code !== "0") setPostalCode(first.zip_code);
      }
    } catch {
      // Ignore
    }
  };

  const useLocalFallback = () => {
    const provs = INDONESIA_LOCATIONS.map((l, i) => ({ id: i + 1, name: l.province }));
    setProvinces(provs);
  };

  const openCreateModal = useCallback(() => {
    setEditingCustomer(null);
    setName("");
    setWhatsapp("");
    setAddressDetail("");
    setErrorMessage(null);
    setIsModalOpen(true);
    loadProvinces();
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
    setSelectedProvinceName(c.province || "RIAU");
    setSelectedCityName(c.cityName || "Kota Pekanbaru");
    setSelectedCityId(c.cityId);
    setSelectedDistrictName(c.district || "Tampan");
    setSelectedSubdistrictName(c.subdistrict || "Delima");
    setPostalCode(c.postalCode || "28289");
    setAddressDetail(c.addressDetail);
    setErrorMessage(null);
    setIsModalOpen(true);
    loadProvinces();
  };

  const handleProvinceChange = (provId: number) => {
    setSelectedProvinceId(provId);
    const pObj = provinces.find((p) => p.id === provId);
    if (pObj) setSelectedProvinceName(pObj.name);
    loadCities(provId);
  };

  const handleCityChange = (cId: number) => {
    setSelectedCityId(cId);
    const cObj = cities.find((c) => c.id === cId);
    if (cObj) {
      setSelectedCityName(cObj.name);
      if (cObj.zip_code && cObj.zip_code !== "0") setPostalCode(cObj.zip_code);
    }
    loadDistricts(cId);
  };

  const handleDistrictChange = (dId: number) => {
    setSelectedDistrictId(dId);
    const dObj = districts.find((d) => d.id === dId);
    if (dObj) {
      setSelectedDistrictName(dObj.name);
      if (dObj.zip_code && dObj.zip_code !== "0") setPostalCode(dObj.zip_code);
    }
    loadSubdistricts(dId);
  };

  const handleSubdistrictChange = (subId: number) => {
    setSelectedSubdistrictId(subId);
    const subObj = subdistricts.find((s) => s.id === subId);
    if (subObj) {
      setSelectedSubdistrictName(subObj.name);
      if (subObj.zip_code && subObj.zip_code !== "0") setPostalCode(subObj.zip_code);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    try {
      const payload = {
        name,
        whatsapp,
        province: selectedProvinceName,
        cityName: selectedCityName,
        cityId: selectedCityId,
        district: selectedDistrictName,
        subdistrict: selectedSubdistrictName,
        postalCode,
        addressDetail,
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
      } else {
        setSuccessMessage(editingCustomer ? "Data pelanggan diperbarui." : "Pelanggan baru berhasil ditambahkan.");
        setIsModalOpen(false);
        fetchCustomers();
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
      const res = await fetch(`/api/customers/${c.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Gagal menghapus pelanggan.");
      } else {
        setSuccessMessage(`Pelanggan '${c.name}' berhasil dihapus.`);
        fetchCustomers();
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
          <h1 className="text-xl font-bold text-blue-700 tracking-tight">CRM Pelanggan</h1>
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
            placeholder="Cari nomor WhatsApp, nama, kota, atau kecamatan pelanggan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
          />
        </div>

        {/* Customers Table (Centered) */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">Loading pelanggan...</div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              Tidak ada data pelanggan yang ditemukan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-center">Nama Pelanggan</th>
                    <th className="p-4 text-center">No. WhatsApp</th>
                    <th className="p-4 text-center">Alamat Jalan</th>
                    <th className="p-4 text-center">Kecamatan / Kelurahan</th>
                    <th className="p-4 text-center">Kota / Provinsi</th>
                    <th className="p-4 text-center">Kode Pos & City ID</th>
                    <th className="p-4 text-center">Total Order</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-center font-bold text-slate-900 text-sm">{c.name}</td>
                      <td className="p-4 text-center font-mono text-blue-600">
                        <a
                          href={`https://wa.me/${c.whatsapp}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline inline-flex items-center gap-1 font-bold justify-center"
                        >
                          <span className="material-symbols-outlined text-sm text-emerald-600">chat</span>
                          {c.whatsapp}
                        </a>
                      </td>
                      <td className="p-4 text-center max-w-xs text-slate-700 font-medium truncate">{c.addressDetail}</td>
                      <td className="p-4 text-center text-slate-600">
                        {c.subdistrict || "-"} / {c.district || "-"}
                      </td>
                      <td className="p-4 text-center text-slate-800 font-semibold">
                        {c.cityName || "-"}, {c.province || "-"}
                      </td>
                      <td className="p-4 text-center font-mono">
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px] font-bold text-slate-700 inline-block">
                          Pos: {c.postalCode || "-"}
                        </span>
                        <span className="text-[10px] text-blue-700 font-bold block mt-0.5">
                          City ID: {c.cityId}
                        </span>
                      </td>
                      <td className="p-4 text-center font-bold text-slate-900">{c._count?.orders || 0} Order</td>
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

      {/* Modal Live RajaOngkir Step-by-Step Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-lg">travel_explore</span>
                {editingCustomer ? `Edit Pelanggan [${editingCustomer.name}]` : "Form Pelanggan (RajaOngkir V2 Live Step-by-Step)"}
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

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              
              {/* Row 1: Nama & WA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nama Lengkap *</label>
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
                  <label className="block text-slate-600 font-semibold mb-1">Nomor WhatsApp *</label>
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

              {/* Step 1: Province */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">1. Pilih Provinsi (RajaOngkir V2) *</label>
                  <select
                    value={selectedProvinceId}
                    onChange={(e) => handleProvinceChange(Number(e.target.value))}
                    disabled={loadingLoc}
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-medium uppercase"
                  >
                    {provinces.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Step 2: City */}
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">2. Pilih Kota / Kabupaten *</label>
                  <select
                    value={selectedCityId}
                    onChange={(e) => handleCityChange(Number(e.target.value))}
                    disabled={cities.length === 0}
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-medium uppercase"
                  >
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (ID: {c.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Step 3 & 4: District & Subdistrict */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">3. Pilih Kecamatan *</label>
                  <select
                    value={selectedDistrictId}
                    onChange={(e) => handleDistrictChange(Number(e.target.value))}
                    disabled={districts.length === 0}
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-medium uppercase"
                  >
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">4. Pilih Kelurahan / Desa *</label>
                  <select
                    value={selectedSubdistrictId}
                    onChange={(e) => handleSubdistrictChange(Number(e.target.value))}
                    disabled={subdistricts.length === 0}
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-medium uppercase"
                  >
                    {subdistricts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.zip_code ? `(${s.zip_code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Kode Pos & Detail Jalan */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Kode Pos</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Detail Alamat Jalan, RT/RW, & Patokan Rumah *</label>
                <textarea
                  rows={2}
                  value={addressDetail}
                  onChange={(e) => setAddressDetail(e.target.value)}
                  placeholder="Jl. Jendral Sudirman No. 45, RT 02/RW 05..."
                  required
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
                  {saving ? "Menyimpan..." : "Simpan Pelanggan Live V2"}
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
