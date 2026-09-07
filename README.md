# Mbokdhe Fashion - Internal Retail Management System

Sistem ERP (Enterprise Resource Planning) dan CRM internal yang dikembangkan khusus untuk operasional bisnis retail fashion. Aplikasi ini mengotomatisasi siklus pemesanan, manajemen inventaris, pelacakan pengiriman, hingga rekonsiliasi keuangan (Down Payment & Laba Bersih).

---

## Arsitektur & Modul Sistem

Sistem ini membagi operasional bisnis ke dalam beberapa modul utama:

### Manajemen Inventaris & Katalog (`/products`, `/shops`)

* **Katalog Terpusat:** Manajemen SKU, harga modal (COGS), harga jual, dan kalkulasi profit margin secara otomatis.
* **Optimasi Penyimpanan:** Kompresi gambar berjalan di sisi klien (WebWorker) otomatis mengonversi unggahan ke format WebP (<300KB) sebelum dikirim ke Supabase Storage.
* **Manajemen Supplier:** Pendataan toko asal barang untuk mempermudah restock dan audit modal.

### Pipeline Transaksi (`/orders`, `/orders/new`)

* **Lifecycle Pesanan:** Pelacakan status berjenjang (`Keep`, `DP`, `Siap Kirim`, `Dikirim`, `Dibatalkan`).
* **Point of Sale (Admin):** Antarmuka checkout terintegrasi dengan pemotongan stok *real-time*, penyesuaian diskon individual per item, dan input ongkos kirim.
* **Manajemen Keuangan:** Sistem pencatatan DP (Down Payment) dengan *aging warning* (peringatan tunggakan >3 hari) dan rekalkulasi pelunasan. (`/pembekuan`)

### Customer Relationship Management (`/customers`)

* **Database Terstruktur:** Pencatatan domisili lengkap (provinsi hingga kode pos) untuk integrasi logistik.
* **Behavioral Data:** Pelacakan tipe konsumen, status relasi, dan riwayat belanja (total transaksi & *lifetime value*).

### Operasional & Pemenuhan (`/ready-to-ship`, `/origin`)

* **Fulfillment Hub:** Rekapitulasi pesanan siap kirim.
* **Generator Resi & Label:** Pembuatan *shipping label* otomatis dan integrasi pengiriman pesan faktur/rekap langsung ke WhatsApp pelanggan.

---

## Tech Stack

* **Core:** Next.js 16 (App Router, Turbopack), React
* **Language:** TypeScript
* **Database:** PostgreSQL (via Supabase)
* **ORM / Query Builder:** Prisma ORM & Supabase JS Client
* **Authentication:** Supabase SSR Auth (HTTP-Only Cookies)
* **Styling:** Tailwind CSS 4
* **Assets Handling:** `browser-image-compression`

---

## Standar Keamanan

Repositori ini menerapkan standar *Secure by Default*:

* **Environment Isolation:** Kredensial database dan API keys diinjeksi via `.env.local` yang tidak dilacak oleh Git.
* **Protected Routes:** Seluruh modul operasional di-*intercept* oleh Next.js Middleware untuk memvalidasi sesi *HTTP-Only cookie*. Akses tanpa autentikasi otomatis diarahkan ke `/login`.
* **Cron Security:** Endpoints untuk pemeliharaan otomatis (seperti *storage cleanup*) dilindungi menggunakan validasi *header* `CRON_SECRET`.

---

## Panduan Instalasi Lokal

### Prasyarat Sistem

* Node.js (v18.x atau lebih baru)
* Akun dan Project Supabase (PostgreSQL)

### Setup Lingkungan

1. **Kloning repositori & instalasi dependensi:**

```bash
git clone https://github.com/gluehearted/mbokdhe-fashion.git
cd mbokdhe-fashion
npm install
```

2. **Konfigurasi Environment Variables:**
   Salin *template* environment dan isi dengan kredensial dari dashboard Supabase Anda.

```bash
cp .env.example .env.local
```

*Contoh struktur `.env.local`:*

```env
# Admin Auth Initializer
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="SecurePasswordHere"

# Database URLs (Prisma)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@[REGION].pooler.supabase.com:5432/postgres"

# Supabase Client Keys
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

3. **Sinkronisasi Skema Database:**
   Dorong skema Prisma ke dalam instance PostgreSQL Supabase Anda.

```bash
npx prisma generate
npx prisma db push
```

4. **Jalankan Development Server:**

```bash
npm run dev
```

Akses `http://localhost:3000` di browser. Sistem akan mengarahkan Anda ke portal login.

---

## Lisensi

Copyright © 2026 Mbokdhe Fashion. All rights reserved.
Sistem ini bersifat *proprietary* dan digunakan secara internal.
