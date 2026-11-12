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
node tooling/database.mjs apply supabase/migrations/20261111112528_product_batch_item_prices.sql
node tooling/database.mjs apply supabase/migrations/20261112080922_customer_inline_text.sql
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

- Supplier berlaku untuk seluruh antrean. Modal dan harga jual disimpan **per tas**. Setelah Tambah ke Antrean, editor berikutnya mewarisi kedua harga terakhir; harga tersebut tetap dapat diubah tanpa mengubah draft sebelumnya. Edit draft memulihkan kedua harganya.
- Modal menyediakan Rp25.000, Rp38.000, Rp50.000, dan nominal custom.
- **Tambah ke Antrean** hanya menambahkan draft di memori browser. Deskripsi/foto tas berikutnya kosong dan tetap opsional. Draft dapat diedit/dihapus; ID final dibuat otomatis di server dengan tanggal WIB.
- **Simpan & Selesai** mengirim seluruh antrean sekaligus, termasuk editor aktif jika ada perubahan yang belum diantrekan. Tas kosong tanpa deskripsi/foto tetap dapat ditambahkan secara eksplisit. Batas: 20 tas, 160 KB per foto setelah kompresi, dan 4 MB per request.
- Pada `/orders/new`, Tambah Produk Baru memakai supplier awal `b` (dapat diubah). Semua produk dari batch yang berhasil disimpan otomatis dipilih dengan harga respons server dan diskon awal nol. Pilihan, harga khusus, diskon, pelanggan, ongkir, dan status sebelumnya tetap dipertahankan. Batch dibatasi sisa kapasitas order (maksimal 100 tas). Katalog dan edit order tidak memakai default/auto-select ini.
- Satu foto gagal berarti tidak ada produk dari batch yang dimasukkan. Transaksi database bersifat atomik; Storage memakai staging privat dan cleanup kompensasi. Cleanup yang tertunda tercatat dan dapat diulang.
- Foto baru, termasuk penggantian foto melalui form edit, disimpan privat dan dilayani melalui endpoint berautentikasi dengan `Cache-Control: private, no-store`. Next Image melewati optimizer bersama untuk URL ini. Foto lama pada bucket publik tidak dipindahkan otomatis.
- Decoder server memvalidasi gambar serta menghapus EXIF/lokasi. Draft belum tersimpan akan hilang bila browser ditutup; aplikasi memberikan konfirmasi saat membatalkan modal.
- Jika koneksi terputus dan hasil commit belum diketahui, draft dikunci sementara. **Coba Lagi** memakai identitas request yang sama dan mengembalikan hasil awal, bukan membuat duplikat. Periksa katalog sebelum membuat batch pengganti setelah menutup modal dalam keadaan tersebut.
- Endpoint lama `POST /api/products` mengembalikan 410. Gunakan form baru atau `POST /api/products/batch` dengan header UUID `Idempotency-Key`, manifest multipart, dan file `photo:<draftId>`.

### Kamera produk

**Buka Kamera** membuka live preview di web; laptop memakai satu webcam default, sedangkan HP memakai kamera belakang dan menampilkan **Ganti Kamera** jika browser melaporkan lebih dari satu kamera. **Jepret Foto** menghasilkan preview terkompresi; **Ambil Ulang Foto** mempertahankan foto lama sampai pengambilan/pemrosesan baru berhasil. Galeri tetap tersedia. Tidak ada input `capture` yang mengarahkan admin ke aplikasi kamera bawaan.

Izin kamera memerlukan HTTPS (atau localhost/loopback untuk pengembangan). Stream dihentikan ketika ditutup, difoto, berpindah editor, meninggalkan halaman, atau modal dilepas; respons izin yang datang terlambat juga dihentikan. Audio tidak diminta, device ID tidak disimpan/dicatat, dan foto hanya dikirim saat submit. Browser tanpa API/izin/perangkat kamera diberi pesan untuk mencoba lagi atau memakai Galeri.

Verifikasi otomatis memakai video sintetis di Chromium untuk laptop/HP, depan-belakang, penolakan izin, kamera sibuk/tunggal, API tidak tersedia, `pagehide`, dan stream terlambat. Kamera fisik Safari iPhone, Chrome Android, dan webcam laptop **belum diverifikasi**; pengujian browser tiruan tidak membuktikan kompatibilitas hardware tersebut.

### Kontrak batch

UI baru mengirim manifest multipart versi 2. Harga setiap item wajib berupa rupiah bulat (modal >= 0, jual >= 1). Contoh dua tas tanpa foto:

```json
{"version":2,"shopOrigin":"b","items":[{"draftId":"11111111-1111-4111-8111-111111111111","description":"Tas A","hasPhoto":false,"capitalPrice":35000,"price":50000},{"draftId":"22222222-2222-4222-8222-222222222222","description":"","hasPhoto":false,"capitalPrice":40000,"price":60000}]}
```

Payload lama tanpa `version`, dengan `capitalPrice`/`price` di tingkat batch, tetap didukung. Bentuk canonical dan fingerprint lama tidak diubah agar batch pending/committed sebelum rilis masih bisa di-retry. PATCH edit produk tunggal tetap menggunakan adapter kompatibel ini. Pasang migrasi `20261111112528_product_batch_item_prices.sql` setelah migrasi awal dan sebelum UI/API baru.

## Edit klasifikasi pelanggan di tabel

Di `/customers`, Behavioral dan Status Hubungan dapat diganti langsung melalui dropdown. Tipe Konsumen dan Status Krisis juga dapat diubah lewat tombol **Ubah** di sel tabel, kemudian **Simpan/Batal**. Tipe Konsumen dibatasi 120 karakter dalam satu baris, sedangkan catatan krisis menerima hingga 2.000 karakter dan baris baru. Teks kosong disimpan sebagai null; teks ditampilkan sebagai teks biasa, bukan HTML. Pilihan mengikuti form pelanggan; nilai lama yang belum termasuk opsi tetap ditampilkan sampai admin memilih penggantinya. Pilihan **Belum ditentukan** menyimpan `null`.

Setiap perubahan dikirim ke `PATCH /api/customers/:id/classification` sebagai `{field, value, expectedValue}`. Endpoint memeriksa origin/staff, whitelist field dan opsi, lalu melakukan conditional update terhadap satu kolom. Jika admin lain telah mengubah nilai awal, respons 409 memuat klasifikasi terbaru sehingga perubahan tidak menimpa data tersebut diam-diam. Respons dropdown tetap memuat ID dan dua kolom klasifikasi. Respons edit teks hanya memuat ID dan kolom yang diubah; catatan krisis tidak ikut respons pembaruan kolom lain. Semua memakai `no-store`. Update teks memakai RPC `crm_update_customer_text` melalui POST sehingga isi/snapshot catatan tidak masuk parameter URL. RPC bersifat SECURITY INVOKER, memeriksa staff, dan tetap mengikuti RLS.

Selama menyimpan, kedua dropdown pada baris tersebut dikunci. Form edit untuk pelanggan yang sama juga mengunci dropdown agar snapshot form tidak menimpa perubahan lokal. Kegagalan mempertahankan nilai sebelumnya dan memuat ulang data; respons jaringan yang hilang direkonsiliasi melalui pembacaan terbaru. Search/page tetap dipertahankan. Draf teks hanya berada di memori browser, dipertahankan saat gagal, dan menyimpan snapshot nilai awal saat editor dibuka. Konflik mempertahankan draf dan memerlukan **Muat nilai terbaru** atau pembatalan sebelum menyimpan lagi. Pencarian/paginasi dikunci sementara selama editor teks terbuka. Terapkan migrasi `20261112080922_customer_inline_text.sql` sebelum deploy versi ini; tidak ada kolom atau izin tabel yang diperluas.

## Order, keamanan, dan pengukuran latency

`POST /api/orders` memakai satu RPC `crm_create_order`: validasi staff/customer/produk, penguncian tas dengan urutan konsisten, perhitungan total di server, insert order, dan update harga/status secara set-based berada dalam satu transaksi. Dua admin tidak dapat mengambil tas yang sama. Request UUID dan fingerprint mencegah order ganda saat retry. Respons hanya berisi ID dan total yang dibutuhkan caller; pembacaan order lengkap setelah insert dihilangkan.

Respons sukses menyediakan `Server-Timing` (`auth`, `db`) dan correlation ID. Log baru hanya memuat durasi, jumlah tas, dan ID request acak; tidak memuat nama, nomor WhatsApp, alamat, payload, atau token. Bandingkan pengukuran browser dari klik submit sampai daftar tampil, serta p50/p95 pada jumlah tas dan region yang sama. Pengurangan request database tidak dengan sendirinya membuktikan angka latency produksi tertentu.

Vercel Functions dijalankan di `syd1` agar dekat dengan Supabase di Sydney. `POST /api/orders` memeriksa origin dan sesi di handler serta kewenangan staff di RPC; `proxy.ts` melewati panggilan Auth yang duplikat untuk metode/rute itu saja. GET dan rute lain tetap memakai pemeriksaan sebelumnya.

## Maintenance Storage

Untuk cron, set `SUPABASE_SERVICE_ROLE_KEY` dan `CRON_SECRET` pada environment server/hosting melalui pengelolaan secret. Jangan masukkan keduanya ke frontend atau commit. Endpoint `/api/cron/cleanup-storage` hanya menerima `Authorization: Bearer <CRON_SECRET>`; user-agent bukan bukti otorisasi. `vercel.json` menjadwalkan maintenance setiap hari, 00:00 UTC.

Maintenance mengklaim staging kedaluwarsa sebelum menghapusnya, mencoba ulang cleanup gagal, membersihkan foto terjual sesuai retensi tiga bulan, dan mengumpulkan foto privat yang diganti/dihapus setelah grace period 24 jam. Tanpa konfigurasi cron, recovery milik actor tetap dicoba saat submit batch berikutnya; staff juga dapat memanggil `POST /api/products/batch/recover` dari origin aplikasi. File staging tidak menjadi publik ketika cleanup tertunda.

## Verifikasi

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run start -- --hostname 127.0.0.1 --port 3301
```

Tes unit mencakup validasi nominal/ID, kegagalan upload paralel, respons commit hilang, cleanup gagal, dan validasi/metadata gambar. `npm run test:db` khusus PostgreSQL disposable pada `127.0.0.1:55439`, database `crm_verification`; tidak membaca `.env` atau memakai kredensial Supabase. Siapkan fixture lalu migrasi pada database tersebut sebelum menjalankan tes. Jangan memuat `tests/database-fixture.sql` di produksi.

Contoh setelah PostgreSQL uji tersebut berjalan dan database kosong telah dibuat:

```bash
psql -X -h 127.0.0.1 -p 55439 -d crm_verification -v ON_ERROR_STOP=1 -f tests/database-fixture.sql
psql -X -h 127.0.0.1 -p 55439 -d crm_verification -v ON_ERROR_STOP=1 --single-transaction -c "SELECT set_config('crm.bootstrap_emails', '[\"staff@example.test\",\"staff2@example.test\"]', false)" -f supabase/migrations/20261110165507_crm_product_batches_atomic_orders.sql
psql -X -h 127.0.0.1 -p 55439 -d crm_verification -v ON_ERROR_STOP=1 --single-transaction -f supabase/migrations/20261111112528_product_batch_item_prices.sql
npm run test:db
```

Tes database memeriksa upgrade/replay batch versi lama, harga per tas versi 2, rollback batch/order, foto belum lengkap, edit tunggal, retry, izin akses, staging kedaluwarsa, dan concurrency. Browser smoke check memakai data API sintetis; screenshot lokal ada di `output/playwright/` (diabaikan Git). Jika Turbopack tidak dapat membuka port internal pada sandbox, verifikasi alternatif: `npm run build -- --webpack`. Lint dijalankan untuk seluruh proyek. Font UI memakai `next/font` dan ikon Material Symbols dilayani dari aset lokal (lisensi di `public/fonts/`), sehingga browser tidak bergantung pada CSS font eksternal.

## Rollout

Pasang dan verifikasi migrasi lebih dahulu, lalu deploy aplikasi dari source ini. Migrasi aditif mempertahankan produk/order lama. Rollback aplikasi dapat menggunakan versi sebelumnya sementara struktur database baru dipertahankan; jangan drop tabel atau file media untuk rollback. Perubahan kebijakan staff tetap berlaku dan akun yang sudah diprovisikan tetap bisa memakai alur lama. Setelah deployment, ukur submit dari kedua akun dan pastikan cron terkonfigurasi; akses kamera fisik perlu smoke check pada perangkat admin.

---

## Lisensi

Copyright © 2026 Mbokdhe Fashion. All rights reserved.
Sistem ini bersifat *proprietary* dan digunakan secara internal.
