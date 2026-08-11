"use client";

import { useState, useEffect } from "react";
import { INDONESIA_LOCATIONS } from "@/lib/indonesia-locations";

interface ApiLocationItem {
  id: number;
  name: string;
  zip_code?: string;
}

export default function AdminOriginPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [shopName, setShopName] = useState("Mbokdhe Fashion");
  const [senderName, setSenderName] = useState("Admin Mbokdhe");
  const [senderPhone, setSenderPhone] = useState("081234567890");

  // Live RajaOngkir Step-by-Step State
  const [provinces, setProvinces] = useState<ApiLocationItem[]>([]);
  const [cities, setCities] = useState<ApiLocationItem[]>([]);
  const [districts, setDistricts] = useState<ApiLocationItem[]>([]);
  const [subdistricts, setSubdistricts] = useState<ApiLocationItem[]>([]);

  const [selectedProvinceId, setSelectedProvinceId] = useState<number | "">(6); // Default 6 = Jawa Barat
  const [selectedProvinceName, setSelectedProvinceName] = useState("JAWA BARAT");
  const [selectedCityId, setSelectedCityId] = useState<number>(54); // Default 54 = Kab. Bogor
  const [selectedCityName, setSelectedCityName] = useState("KABUPATEN BOGOR");
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | "">("");
  const [selectedDistrictName, setSelectedDistrictName] = useState("Sukaraja");
  const [selectedSubdistrictId, setSelectedSubdistrictId] = useState<number | "">("");
  const [selectedSubdistrictName, setSelectedSubdistrictName] = useState("Cijujung");
  const [postalCode, setPostalCode] = useState("16710");
  const [addressDetail, setAddressDetail] = useState("Perum Kostrad Cijujung Permai Blok D.1");

  const [loadingLoc, setLoadingLoc] = useState(false);

  // Load existing config & Provinces on Mount
  useEffect(() => {
    async function initPage() {
      setLoading(true);
      try {
        const resConfig = await fetch("/api/config");
        const dataCfg = await resConfig.json();
        if (dataCfg.success && dataCfg.data) {
          const cfg = dataCfg.data;
          setShopName(cfg.shopName || "Mbokdhe Fashion");
          setSenderName(cfg.senderName || "Admin Mbokdhe");
          setSenderPhone(cfg.senderPhone || "081234567890");
          if (cfg.province) setSelectedProvinceName(cfg.province);
          if (cfg.cityName) setSelectedCityName(cfg.cityName);
          if (cfg.originCityId) setSelectedCityId(cfg.originCityId);
          if (cfg.district) setSelectedDistrictName(cfg.district);
          if (cfg.subdistrict) setSelectedSubdistrictName(cfg.subdistrict);
          if (cfg.postalCode) setPostalCode(cfg.postalCode);
          if (cfg.addressDetail) setAddressDetail(cfg.addressDetail);
        }
        await loadProvinces();
      } catch {
        // Ignore
      } finally {
        setLoading(false);
      }
    }
    initPage();
  }, []);

  const loadProvinces = async () => {
    setLoadingLoc(true);
    try {
      const res = await fetch("/api/shipping/location/provinces");
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setProvinces(data.data);
        const jabar = data.data.find((p: ApiLocationItem) => p.name.includes("JAWA BARAT")) || data.data[0];
        setSelectedProvinceId(jabar.id);
        setSelectedProvinceName(jabar.name);
        loadCities(jabar.id);
      } else {
        useLocalFallback();
      }
    } catch {
      useLocalFallback();
    } fontally: {
      setLoadingLoc(false);
    }
  };

  const loadCities = async (provId: number) => {
    try {
      const res = await fetch(`/api/shipping/location/cities?provinceId=${provId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setCities(data.data);
        const bogor = data.data.find((c: ApiLocationItem) => c.name.includes("BOGOR")) || data.data[0];
        setSelectedCityId(bogor.id);
        setSelectedCityName(bogor.name);
        if (bogor.zip_code && bogor.zip_code !== "0") setPostalCode(bogor.zip_code);
        loadDistricts(bogor.id);
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
        const sukaraja = data.data.find((d: ApiLocationItem) => d.name.includes("SUKARAJA")) || data.data[0];
        setSelectedDistrictId(sukaraja.id);
        setSelectedDistrictName(sukaraja.name);
        if (sukaraja.zip_code && sukaraja.zip_code !== "0") setPostalCode(sukaraja.zip_code);
        loadSubdistricts(sukaraja.id);
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
        const cijujung = data.data.find((s: ApiLocationItem) => s.name.includes("CIJUJUNG")) || data.data[0];
        setSelectedSubdistrictId(cijujung.id);
        setSelectedSubdistrictName(cijujung.name);
        if (cijujung.zip_code && cijujung.zip_code !== "0") setPostalCode(cijujung.zip_code);
      }
    } catch {
      // Ignore
    }
  };

  const useLocalFallback = () => {
    const provs = INDONESIA_LOCATIONS.map((l, i) => ({ id: i + 1, name: l.province }));
    setProvinces(provs);
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
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName,
          senderName,
          senderPhone,
          province: selectedProvinceName,
          cityName: selectedCityName,
          originCityId: selectedCityId,
          district: selectedDistrictName,
          subdistrict: selectedSubdistrictName,
          postalCode,
          addressDetail,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Gagal menyimpan alamat asal toko.");
      } else {
        setSuccessMessage("Alamat asal toko admin berhasil disimpan & tersinkronisasi ke RajaOngkir!");
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch {
      setErrorMessage("Terjadi kesalahan koneksi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen w-full overflow-hidden bg-[#f7f9fb]">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center w-full px-6 h-16 bg-white border-b border-slate-200 z-30 sticky top-0 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-blue-700 tracking-tight">Alamat Asal Toko (Admin Origin)</h1>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 bg-[#f7f9fb] w-full pb-8">
        <div className="max-w-3xl mx-auto space-y-6">
          
          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold">
              ✅ {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
              ⚠️ {errorMessage}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">Loading alamat asal toko...</div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm text-xs">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <span className="material-symbols-outlined text-blue-600">storefront</span>
                  Pengaturan Alamat Pengirim Toko (RajaOngkir V2 Step-by-Step)
                </h2>
                <p className="text-slate-500 text-[11px] mt-1">
                  Alamat ini digunakan sebagai lokasi awal pengiriman (*Origin ID*) saat menghitung tarif ongkir RajaOngkir ke pelanggan.
                </p>
              </div>

              {/* Identity Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nama Toko *</label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    required
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nama Pengirim (Admin) *</label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    required
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">No. Telp / WA Pengirim *</label>
                  <input
                    type="text"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    required
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Live Step-by-Step Location Selection */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-blue-600">location_on</span>
                  Lokasi Mengerucut (RajaOngkir V2 Live Step-by-Step)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Step 1: Province Dropdown */}
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">1. Pilih Provinsi *</label>
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

                  {/* Step 2: City Dropdown */}
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">2. Pilih Kota / Kabupaten (RajaOngkir) *</label>
                    <select
                      value={selectedCityId}
                      onChange={(e) => handleCityChange(Number(e.target.value))}
                      disabled={cities.length === 0}
                      className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-medium uppercase"
                    >
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (City ID: {c.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Step 3: District Dropdown */}
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

                  {/* Step 4: Subdistrict Dropdown */}
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

                  {/* Step 5: Postal Code */}
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">5. Kode Pos</label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Street Detail */}
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">6. Detail Jalan, RT/RW, Patokan Toko *</label>
                  <textarea
                    rows={2}
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                    required
                    className="w-full bg-slate-50 text-slate-900 p-2.5 rounded-lg border border-slate-300 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1 text-slate-700">
                <span className="font-bold text-blue-700 block">📌 Ringkasan Alamat Asal Pengiriman:</span>
                <p className="font-semibold text-slate-900">
                  {shopName} — {senderName} ({senderPhone})
                </p>
                <p className="text-slate-600">
                  {addressDetail}, Kel. {selectedSubdistrictName}, Kec. {selectedDistrictName}, {selectedCityName}, Prov. {selectedProvinceName} ({postalCode})
                </p>
                <p className="font-mono text-blue-700 font-bold pt-1">
                  RajaOngkir Origin City ID: {selectedCityId}
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-all text-sm disabled:opacity-50"
              >
                {saving ? "Menyimpan Alamat Asal..." : "💾 SIMPAN PENGATURAN ALAMAT ASAL"}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
