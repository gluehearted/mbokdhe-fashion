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
* **Query Builder:** Supabase JS Client (tanpa Prisma pada kode saat ini)
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

* Node.js ≥20.9 (disarankan Node.js 22)
* Akun dan Project Supabase (PostgreSQL)

### Setup Lingkungan

1. **Kloning repositori & instalasi dependensi:**

```bash
git clone https://github.com/gluehearted/mbokdhe-fashion.git
cd mbokdhe-fashion
npm ci
```

2. **Konfigurasi Environment Variables:**
   Salin *template* environment dan isi dengan kredensial dari dashboard Supabase Anda.

```bash
cp .env.example .env.local
```

Runtime membutuhkan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Login memakai akun yang dibuat di Supabase Auth; password tidak disimpan di kode. `.env.example` memuat daftar variabel tanpa nilai rahasia. Jangan menimpa `.env.local` yang sudah ada.

3. **Skema dan migrasi database:**

Proyek ini memakai schema Supabase yang sudah ada (`users`, `customers`, `shops`, `products`, `orders`). Tidak ada schema Prisma atau bootstrap schema produksi lengkap di repository. Untuk proyek Supabase baru, siapkan schema bisnis yang telah direview terlebih dahulu; fixture pada `tests/` hanya untuk database uji lokal.

Migrasi `supabase/migrations/20261110165507_crm_product_batches_atomic_orders.sql` menambahkan batch, transaksi order, indeks, dan kontrol akses CRM. Untuk memasangnya pada schema yang ada, siapkan `psql` serta `.env` lokal berisi `DIRECT_URL`, `ADMIN_EMAIL`, dan `STAFF_EMAIL` yang cocok dengan akun Supabase Auth. Tool tidak menampilkan kredensial dan menjalankan seluruh migrasi dalam satu transaksi.

```bash
node tooling/database.mjs audit tooling/audit.sql
node tooling/database.mjs apply supabase/migrations/20261110165507_crm_product_batches_atomic_orders.sql
node tooling/database.mjs audit tooling/verify-crm.sql
```

Tool mencatat version/checksum di `crm_private.schema_migrations`; pengulangan migrasi yang sama menjadi no-op setelah verifikasi checksum. Pencatatan ini terpisah dari history Supabase CLI. Jangan menjalankan ulang SQL mentah pada database yang sudah dimigrasikan. Akun baru tidak otomatis memperoleh akses CRM: pengelola database harus menambahkan UUID akun tersebut ke `crm_private.staff` melalui jalur administrasi yang berwenang. Jangan memakai `user_metadata.role` sebagai izin akses.

4. **Jalankan Development Server:**

```bash
npm run dev
```

Akses `http://localhost:3000/login` untuk admin; halaman `/` adalah landing page publik.

---

## Batch produk

- Isi supplier, modal, dan harga jual sekali; ketiganya berlaku untuk seluruh antrean.
- Modal menyediakan Rp25.000, Rp38.000, Rp50.000, dan nominal custom.
- **Tambah ke Antrean** hanya menambahkan draft di memori browser. Deskripsi/foto tas berikutnya kosong dan tetap opsional. Draft dapat diedit/dihapus; ID final dibuat otomatis di server dengan tanggal WIB.
- **Simpan & Selesai** mengirim seluruh antrean sekaligus, termasuk editor aktif jika ada perubahan yang belum diantrekan. Tas kosong tanpa deskripsi/foto tetap dapat ditambahkan secara eksplisit. Batas: 20 tas, 160 KB per foto setelah kompresi, dan 4 MB per request.
- Produk hasil batch dari form order tersedia untuk dipilih, tanpa otomatis menjadi item order. Pilihan order sebelumnya dipertahankan.
- Satu foto gagal berarti tidak ada produk dari batch yang dimasukkan. Transaksi database bersifat atomik; Storage memakai staging privat dan cleanup kompensasi. Cleanup yang tertunda tercatat dan dapat diulang.
- Foto baru, termasuk penggantian foto melalui form edit, disimpan privat dan dilayani melalui endpoint berautentikasi dengan `Cache-Control: private, no-store`. Next Image melewati optimizer bersama untuk URL ini. Foto lama pada bucket publik tidak dipindahkan otomatis.
- Decoder server memvalidasi gambar serta menghapus EXIF/lokasi. Draft belum tersimpan akan hilang bila browser ditutup; aplikasi memberikan konfirmasi saat membatalkan modal.
- Jika koneksi terputus dan hasil commit belum diketahui, draft dikunci sementara. **Coba Lagi** memakai identitas request yang sama dan mengembalikan hasil awal, bukan membuat duplikat. Periksa katalog sebelum membuat batch pengganti setelah menutup modal dalam keadaan tersebut.
- Endpoint lama `POST /api/products` mengembalikan 410. Gunakan form baru atau `POST /api/products/batch` dengan header UUID `Idempotency-Key`, manifest multipart, dan file `photo:<draftId>`.

## Order, keamanan, dan pengukuran latency

`POST /api/orders` memakai satu RPC `crm_create_order`: validasi staff/customer/produk, penguncian tas dengan urutan konsisten, perhitungan total di server, insert order, dan update harga/status secara set-based berada dalam satu transaksi. Dua admin tidak dapat mengambil tas yang sama. Request UUID dan fingerprint mencegah order ganda saat retry. Respons hanya berisi ID dan total yang dibutuhkan caller; pembacaan order lengkap setelah insert dihilangkan.

Respons sukses menyediakan `Server-Timing` (`auth`, `db`) dan correlation ID. Log baru hanya memuat durasi, jumlah tas, dan ID request acak; tidak memuat nama, nomor WhatsApp, alamat, payload, atau token. Bandingkan pengukuran browser dari klik submit sampai daftar tampil, serta p50/p95 pada jumlah tas dan region yang sama. Pengurangan request database tidak dengan sendirinya membuktikan angka latency produksi tertentu.

## Maintenance Storage

Untuk cron, set `SUPABASE_SERVICE_ROLE_KEY` dan `CRON_SECRET` pada environment server/hosting melalui pengelolaan secret. Jangan masukkan keduanya ke frontend atau commit. Endpoint `/api/cron/cleanup-storage` hanya menerima `Authorization: Bearer <CRON_SECRET>`; user-agent bukan bukti otorisasi. `vercel.json` menjadwalkan maintenance setiap hari, 00:00 UTC.

Maintenance mengklaim staging kedaluwarsa sebelum menghapusnya, mencoba ulang cleanup gagal, membersihkan foto terjual sesuai retensi tiga bulan, dan mengumpulkan foto privat yang diganti/dihapus setelah grace period 24 jam. Tanpa konfigurasi cron, recovery milik actor tetap dicoba saat submit batch berikutnya; staff juga dapat memanggil `POST /api/products/batch/recover` dari origin aplikasi. File staging tidak menjadi publik ketika cleanup tertunda.

## Verifikasi

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run start
```

Tes unit mencakup validasi nominal/ID, kegagalan upload paralel, respons commit hilang, cleanup gagal, dan validasi/metadata gambar. `npm run test:db` khusus PostgreSQL disposable pada `127.0.0.1:55439`, database `crm_verification`; tidak membaca `.env` atau memakai kredensial Supabase. Siapkan fixture lalu migrasi pada database tersebut sebelum menjalankan tes. Jangan memuat `tests/database-fixture.sql` di produksi.

Contoh setelah PostgreSQL uji tersebut berjalan dan database kosong telah dibuat:

```bash
psql -X -h 127.0.0.1 -p 55439 -d crm_verification -v ON_ERROR_STOP=1 -f tests/database-fixture.sql
psql -X -h 127.0.0.1 -p 55439 -d crm_verification -v ON_ERROR_STOP=1 --single-transaction -c "SELECT set_config('crm.bootstrap_emails', '[\"staff@example.test\",\"staff2@example.test\"]', false)" -f supabase/migrations/20261110165507_crm_product_batches_atomic_orders.sql
npm run test:db
```

Tes database memeriksa rollback batch/order, foto belum lengkap, edit tunggal, retry, izin akses, staging kedaluwarsa, dan concurrency. Browser smoke check memakai data API sintetis; screenshot lokal ada di `output/playwright/` (diabaikan Git). Jika Turbopack tidak dapat membuka port internal pada sandbox, verifikasi alternatif: `npm run build -- --webpack`. Error lint yang sudah ada pada modul di luar perubahan harus dipisahkan dari lint file baru.

## Rollout

Pasang dan verifikasi migrasi lebih dahulu, lalu deploy aplikasi dari source ini. Migrasi aditif mempertahankan produk/order lama. Rollback aplikasi dapat menggunakan versi sebelumnya sementara struktur database baru dipertahankan; jangan drop tabel atau file media untuk rollback. Perubahan kebijakan staff tetap berlaku dan akun yang sudah diprovisikan tetap bisa memakai alur lama. Setelah deployment, ukur submit dari kedua akun dan pastikan cron terkonfigurasi; akses kamera fisik perlu smoke check pada perangkat admin.

---

## Lisensi

Copyright © 2026 Mbokdhe Fashion. All rights reserved.
Sistem ini bersifat *proprietary* dan digunakan secara internal.
