# Mbokdhe Fashion 👜

Admin dashboard internal untuk bisnis fashion tas — mengelola katalog produk, pelanggan, pesanan, pengiriman (ongkir), pembekuan dana DP, dan rekap laporan keuangan.

Built with **Next.js 16 (App Router)**, **Prisma ORM**, **Supabase (PostgreSQL & Storage)**, **Supabase SSR Auth**, **Tailwind CSS 4**, dan **Browser Image Compression**.

---

## ✨ Fitur Utama

| Modul | Halaman | Deskripsi |
| --- | --- | --- |
| **Portal Autentikasi** | `/login` | Login terproteksi untuk Admin & Staff dengan HTTP-Only Cookie Session. |
| **Dashboard** | `/` | Ringkasan statistik bisnis (total produk, pesanan, pelanggan, omzet) |
| **Katalog Produk** | `/products` | CRUD produk tas dengan foto (auto-compress <300KB), deskripsi, harga modal, harga jual, dan profit margin |
| **Kelola Toko** | `/shops` | Manajemen daftar supplier/toko asal produk |
| **CRM Pelanggan** | `/customers` | Database pelanggan dengan alamat lengkap (provinsi, kota, kecamatan, kelurahan, kode pos) |
| **Pipeline Pesanan** | `/orders` | Tabel & Card View pesanan dengan filter status, diskon individual per tas, dan penandaan resi |
| **Checkout Admin** | `/orders/new` | Buat pesanan baru — pilih pelanggan, pilih tas (dengan zoom photo lightbox & diskon per tas), hitung ongkir |
| **Perlu Dikirim** | `/ready-to-ship` | Rekap khusus pesanan siap kirim — generator template label pengiriman otomatis & kirim WA direct |
| **Laporan Keuntungan** | `/pembekuan` | Monitor dana DP yang dibekukan, aging warning >3 hari, pelunasan, dan laporan laba bersih |
| **Alamat Asal Toko** | `/origin` | Konfigurasi alamat pengirim toko untuk kalkulasi ongkir |

---

## 🔒 Keamanan & Kerahasiaan Kredensial (Anti-Bocor)

Aplikasi ini menerapkan standar keamanan **Zero Leakage**:
1. **Strict `.gitignore`**:
   File `.env`, `.env.local`, `.env*.local`, `node_modules`, `.next`, `dev.db`, dan folder `public/uploads/*` secara otomatis **dilarang masuk (ignored)** dari Git.
2. **Admin Credentials via Environment Variables**:
   Email dan password akun Admin disimpan di dalam file `.env.local` / `.env` (TIDAK PERNAH di-hardcode pada source code repository).

---

## 🛠️ Tech Stack & Integrasi

- **Framework**: [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- **Language**: TypeScript
- **Database & Auth**: Supabase PostgreSQL via [Prisma ORM](https://www.prisma.io) & `@supabase/ssr`
- **Storage & Compression**: Supabase Storage + `browser-image-compression` (<300 KB WebWorker)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com)
- **Icons**: [Google Material Symbols](https://fonts.google.com/icons)

---

## 🚀 Langkah-Langkah Setup & Menjalankan Aplikasi

### Prasyarat

Pastikan sudah terinstall di komputer/server Anda:
- **Node.js** ≥ 18.x — [download](https://nodejs.org)
- **npm** ≥ 9.x (bundled with Node.js)
- **Git** — [download](https://git-scm.com)

---

### 1. Clone Repository

```bash
git clone https://github.com/gluehearted/mbokdhe-fashion.git
cd mbokdhe-fashion
```

---

### 2. Install Dependencies

```bash
npm install
```

---

### 3. Setup Kredensial & Akun Admin (`.env.local` / `.env`)

Buat file `.env.local` atau `.env` di root folder proyek Anda:

```bash
cp .env.example .env.local
```

Buka `.env.local` dan isi Kredensial Akun Admin & Supabase Anda:

```env
# =============================================================================
# KREDENSIAL AKUN ADMIN (BEBAS DIUBAH - RAHASIA & TIDAK BOCOR KE GITHUB)
# =============================================================================
ADMIN_EMAIL="admin@mbokdhe.com"
ADMIN_PASSWORD="KataSandiRahasiaAdmin2026!"

# =============================================================================
# SUPABASE & DATABASE CONFIGURATION (POSTGRESQL)
# =============================================================================
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# SUPABASE CLIENT API KEYS
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_p_..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_p_..."
```

> ⚠️ **PENTING**: File `.env.local` dan `.env` sudah terdaftar di `.gitignore`. Akun Admin (`ADMIN_EMAIL` & `ADMIN_PASSWORD`) Anda aman dan tidak akan pernah ter-push ke GitHub!

---

### 4. Setup Database & Prisma

Sinkronkan skema database ke PostgreSQL Supabase Anda:

```bash
npx prisma generate
npx prisma db push
```

---

### 5. Jalankan Aplikasi

```bash
npm run dev
```

1. Buka browser di **`http://localhost:3000`**.
2. Anda akan otomatis di-redirect ke halaman login **`http://localhost:3000/login`**.
3. Masukkan `ADMIN_EMAIL` dan `ADMIN_PASSWORD` yang Anda daftarkan di file `.env.local`.
4. Selamat! Anda telah berhasil masuk ke Dashboard Admin Mbokdhe Fashion.

---

## 📜 NPM Scripts

```bash
npm run dev          # Jalankan development server (http://localhost:3000)
npm run build        # Build production bundle
npm run start        # Jalankan production server
npm run lint         # Jalankan ESLint
```

---

## 📝 License

Private project — Mbokdhe Fashion © 2026
