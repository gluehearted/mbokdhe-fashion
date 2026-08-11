# Mbokdhe Fashion 👜

Admin dashboard internal untuk bisnis fashion tas — mengelola katalog produk, pelanggan, pesanan, pengiriman (ongkir), dan pembekuan dana DP.

Built with **Next.js 16**, **Prisma** (SQLite), **Tailwind CSS 4**, dan integrasi **RajaOngkir Komerce API** untuk kalkulasi ongkos kirim domestik.

---

## ✨ Fitur Utama

| Modul | Halaman | Deskripsi |
|---|---|---|
| **Dashboard** | `/` | Ringkasan statistik bisnis (total produk, pesanan, pelanggan, omzet) |
| **Katalog Produk** | `/products` | CRUD produk tas dengan foto, harga modal, harga jual, toko asal, dan estimasi profit margin |
| **Kelola Toko** | `/shops` | Manajemen daftar supplier/toko asal produk |
| **CRM Pelanggan** | `/customers` | Database pelanggan dengan alamat lengkap (provinsi, kota, kecamatan, kelurahan, kode pos) |
| **Pipeline Pesanan** | `/orders` | Tabel pesanan dengan filter status, input resi pengiriman, dan perubahan status pipeline |
| **Checkout Admin** | `/orders/new` | Buat pesanan baru — pilih pelanggan, pilih produk, hitung ongkir RajaOngkir, input DP |
| **Pembekuan DP** | `/pembekuan` | Monitor dana DP yang dibekukan, aging warning >3 hari, pelunasan, dan hanguskan (forfeit) DP |
| **Alamat Asal Toko** | `/origin` | Konfigurasi alamat pengirim toko untuk kalkulasi ongkir |

### 🚚 Integrasi Pengiriman (12 Kurir Domestik)

Kalkulasi ongkos kirim real-time via **RajaOngkir Komerce API** mendukung:

JNE · SiCepat · J&T Express · TIKI · POS Indonesia · IDExpress · Ninja Express · SAP Express · Wahana · Sentral Cargo · Lion Parcel · REX Asia

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- **Language**: TypeScript
- **Database**: SQLite via [Prisma ORM](https://www.prisma.io)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com)
- **Icons**: [Google Material Symbols](https://fonts.google.com/icons)
- **Shipping API**: [RajaOngkir Komerce](https://rajaongkir.komerce.id)

---

## 🚀 Setup Project (untuk Developer Baru)

### Prasyarat

Pastikan sudah terinstall di mesin lokal:

- **Node.js** ≥ 18.x — [download](https://nodejs.org)
- **npm** ≥ 9.x (bundled with Node.js)
- **Git** — [download](https://git-scm.com)

### 1. Clone Repository

```bash
git clone https://github.com/gluehearted/mbokdhe-fashion.git
cd mbokdhe-fashion
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Salin file `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Lalu buka file `.env` dan isi API key yang diperlukan:

```env
# API Key RajaOngkir (WAJIB — untuk fitur ongkir)
# Daftar gratis di: https://rajaongkir.komerce.id
RAJAONGKIR_API_KEY=isi_api_key_rajaongkir_kamu

# Jika pakai client-side juga (opsional, biasanya cukup yang atas saja)
NEXT_PUBLIC_RAJAONGKIR_API_KEY=isi_api_key_rajaongkir_kamu

# SQLite Database Path (default, tidak perlu diubah)
DATABASE_URL="file:./dev.db"
```

> **Catatan:** Minimal yang **wajib diisi** hanya `RAJAONGKIR_API_KEY`. Tanpa ini, fitur hitung ongkir tidak akan berfungsi. Key lainnya (`QRISLY_API_KEY`, `PAYMENT_API_KEY`) untuk fitur masa depan dan boleh dikosongkan.

### 4. Setup Database (Prisma + SQLite)

Generate Prisma Client dan buat database SQLite:

```bash
npx prisma generate
npx prisma db push
```

Perintah `db push` akan membuat file `prisma/dev.db` secara otomatis beserta semua tabel yang diperlukan.

> **Opsional:** Jika ingin melihat/mengelola data secara visual:
> ```bash
> npx prisma studio
> ```
> Prisma Studio akan terbuka di `http://localhost:5555`.

### 5. Jalankan Development Server

```bash
npm run dev
```

Buka **[http://localhost:3000](http://localhost:3000)** di browser.

---

## 📁 Struktur Project

```
mbokdhe-fashion/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Dashboard utama
│   ├── products/page.tsx         # Katalog produk
│   ├── shops/page.tsx            # Kelola toko/supplier
│   ├── customers/page.tsx        # CRM pelanggan
│   ├── orders/
│   │   ├── page.tsx              # Tabel pipeline pesanan
│   │   └── new/page.tsx          # Checkout admin (buat pesanan baru)
│   ├── pembekuan/page.tsx        # Monitor pembekuan dana DP
│   ├── origin/page.tsx           # Konfigurasi alamat asal toko
│   ├── layout.tsx                # Root layout (sidebar + main)
│   ├── globals.css               # Global styles
│   └── api/                      # API Routes (Backend)
│       ├── config/route.ts       # GET/PATCH shop config
│       ├── customers/            # CRUD pelanggan
│       ├── orders/               # CRUD pesanan + DP/settle/forfeit
│       ├── products/             # CRUD produk
│       ├── shipping/             # Kalkulasi ongkir RajaOngkir
│       └── shops/                # CRUD toko/supplier
├── components/                   # Reusable UI components
│   ├── Sidebar.tsx               # Navigasi sidebar
│   ├── TableActionsMenu.tsx      # Hamburger dropdown menu (Portal)
│   └── LocationSearchCombobox.tsx # Autocomplete lokasi Indonesia
├── lib/                          # Utility & helper modules
│   ├── prisma.ts                 # Prisma client singleton
│   └── indonesia-locations.ts    # Data lokasi Indonesia (offline)
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── dev.db                    # SQLite database (auto-generated)
├── public/
│   └── uploads/                  # Foto produk yang di-upload
├── .env.example                  # Template environment variables
├── package.json
└── tsconfig.json
```

---

## 🗄️ Database Schema

Aplikasi menggunakan **SQLite** dengan 5 model utama:

| Model | Deskripsi | Field Kunci |
|---|---|---|
| **ShopConfig** | Konfigurasi alamat asal toko pengirim | `shopName`, `originCityId`, `province`, `cityName`, `district` |
| **Shop** | Daftar toko/supplier asal produk | `name` (unique) |
| **Customer** | Database pelanggan | `name`, `whatsapp` (unique), `cityId`, `province`, `district`, `addressDetail` |
| **Order** | Pesanan / transaksi | `status`, `shippingCourier`, `shippingCost`, `totalWeightGram`, `dpAmount`, `trackingNo`, `totalPrice` |
| **Product** | Katalog produk tas | `id` (manual), `shopOrigin`, `capitalPrice`, `price`, `status`, `photoUrl` |

### Status Flow Pesanan

```
Keep (Menunggu) → DP (Dana Dibekukan) → Siap_Packing (Lunas) → Shipped (Dikirim)
                                      ↘ Cancelled (Dibatalkan)
```

### Status Produk

```
Available → Booked (terikat order) → Sold (order shipped)
                                   ↘ Available (order cancelled)
```

---

## 🔌 API Endpoints

### Products
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/products` | List semua produk (filter: `?status=Available`) |
| `POST` | `/api/products` | Tambah produk baru (multipart/form-data + foto) |
| `PATCH` | `/api/products/[id]` | Update produk |
| `DELETE` | `/api/products/[id]` | Hapus produk |

### Customers
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/customers` | List semua pelanggan |
| `POST` | `/api/customers` | Tambah pelanggan baru |
| `PATCH` | `/api/customers/[id]` | Update pelanggan |
| `DELETE` | `/api/customers/[id]` | Hapus pelanggan |

### Orders
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/orders` | List semua pesanan (include customer & products) |
| `POST` | `/api/orders` | Buat pesanan baru |
| `PATCH` | `/api/orders/[id]` | Update status, resi, ongkir, DP |
| `DELETE` | `/api/orders/[id]` | Hapus pesanan |
| `POST` | `/api/orders/[id]/dp` | Catat pembayaran DP |
| `POST` | `/api/orders/[id]/settle` | Pelunasan order |
| `POST` | `/api/orders/[id]/forfeit` | Hanguskan DP |

### Shops
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/shops` | List semua toko/supplier |
| `POST` | `/api/shops` | Tambah toko baru |
| `PATCH` | `/api/shops/[id]` | Update nama toko |
| `DELETE` | `/api/shops/[id]` | Hapus toko |

### Shipping (RajaOngkir)
| Method | Endpoint | Deskripsi |
|---|---|---|
| `POST` | `/api/shipping/cost` | Hitung ongkos kirim domestik |
| `GET` | `/api/shipping/location/provinces` | List provinsi |
| `GET` | `/api/shipping/location/cities` | List kota/kabupaten |
| `GET` | `/api/shipping/location/districts` | List kecamatan |
| `GET` | `/api/shipping/location/subdistricts` | List kelurahan |

### Config
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/config` | Ambil konfigurasi toko |
| `PATCH` | `/api/config` | Update konfigurasi toko |

---

## 📜 NPM Scripts

```bash
npm run dev          # Jalankan development server (http://localhost:3000)
npm run build        # Build production bundle
npm run start        # Jalankan production server
npm run lint         # Jalankan ESLint
```

---

## ⚠️ Troubleshooting

### Error: "The column X does not exist in the current database"
Database schema belum sinkron. Jalankan:
```bash
npx prisma db push
```
Lalu restart dev server (`Ctrl+C` → `npm run dev`).

### Error: "API Key RajaOngkir belum diisi"
Pastikan file `.env` sudah dibuat dan `RAJAONGKIR_API_KEY` terisi dengan key valid dari [rajaongkir.komerce.id](https://rajaongkir.komerce.id).

### Ongkir terlalu mahal / tidak sesuai
Pastikan `originCityId` di halaman **Alamat Asal Toko** (`/origin`) sudah benar. Default: `54` (Kab. Bogor). Sistem memprioritaskan endpoint city-level (`/api/v1/calculate/domestic-cost`) yang lebih akurat untuk paket kecil.

### Foto produk tidak muncul
Pastikan folder `public/uploads/` ada dan file gambar sudah ter-upload. Next.js menyajikan file statis dari folder `public/`.

---

## 📝 License

Private project — Mbokdhe Fashion © 2026
