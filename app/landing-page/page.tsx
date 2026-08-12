import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeProvider";

export const revalidate = 0;

export default async function LandingPage() {
  let availableProducts: Array<{
    id: string;
    description?: string | null;
    price: number;
    discount?: number | null;
    photoUrl: string;
    status: string;
    shop?: { name: string } | null;
  }> = [];

  try {
    availableProducts = await prisma.product.findMany({
      where: {
        OR: [{ status: "Tersedia" }, { status: "Available" }],
      },
      include: {
        shop: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
  } catch (err) {
    console.warn("Koneksi database belum terhubung atau kata sandi database pada .env belum diisi:", err);
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors">
      
      {/* 1. Header Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div>
            <span className="text-xl font-extrabold tracking-tight text-blue-700 dark:text-blue-400 block">
              Mbokdhe Fashion
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-widest uppercase block -mt-1">
              Koleksi Tas Fashion
            </span>
          </div>

          <div className="flex items-center gap-6">
            <nav className="hidden sm:flex items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <a href="#katalog" className="hover:text-blue-700 dark:hover:text-blue-400 transition-colors">Katalog Tas</a>
              <a href="#keunggulan" className="hover:text-blue-700 dark:hover:text-blue-400 transition-colors">Keunggulan</a>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-6">

          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Koleksi Tas Elegant & <br />
            <span className="text-blue-700 dark:text-blue-400">Kualitas Terjamin</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-2xl mx-auto">
            Temukan pilihan tas fashion berkualitas tinggi dengan desain modern, harga transparan, dan jaminan pengiriman langsung ke seluruh wilayah Indonesia.
          </p>

          <div className="pt-2">
            <a
              href="#katalog"
              className="inline-block px-8 py-3.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 active:scale-95 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all text-center"
            >
              Lihat Katalog Tas
            </a>
          </div>
        </div>
      </section>

      {/* 3. Catalog Section */}
      <section id="katalog" className="py-16 bg-slate-50 dark:bg-slate-900 border-y border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 lg:px-8 transition-colors">
        <div className="max-w-7xl mx-auto space-y-10">
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Katalog Tas Terbaru
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
              Pilihan stok tas favorit yang siap untuk dikirimkan hari ini.
            </p>
          </div>

          {availableProducts.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
              Belum ada koleksi tas yang ditampilkan saat ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {availableProducts.map((p) => {
                const finalPrice = p.price - (p.discount || 0);
                return (
                  <div
                    key={p.id}
                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all duration-300 flex flex-col group"
                  >
                    {/* Image Box */}
                    <div className="w-full h-56 bg-slate-100 dark:bg-slate-900 relative overflow-hidden flex items-center justify-center">
                      {p.photoUrl && !p.photoUrl.includes("placeholder") ? (
                        <Image
                          src={p.photoUrl}
                          alt={p.id}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 font-bold text-xs">
                          Foto Tas #{p.id}
                        </span>
                      )}

                      <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">
                        #{p.id}
                      </div>

                      <div className="absolute top-3 right-3 bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase">
                        Tersedia
                      </div>
                    </div>

                    {/* Info Body */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          Supplier: {p.shop?.name || "-"}
                        </p>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 mt-0.5">
                          {p.description || `Tas Fashion #${p.id}`}
                        </h3>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        {p.discount && p.discount > 0 ? (
                          <div>
                            <span className="text-xs text-slate-400 dark:text-slate-500 line-through block font-mono">
                              Rp {p.price.toLocaleString("id-ID")}
                            </span>
                            <span className="text-base font-extrabold text-blue-700 dark:text-blue-400 font-mono">
                              Rp {finalPrice.toLocaleString("id-ID")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-base font-extrabold text-blue-700 dark:text-blue-400 font-mono">
                            Rp {p.price.toLocaleString("id-ID")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 4. Keunggulan Section */}
      <section id="keunggulan" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Keunggulan Mbokdhe Fashion
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            Komitmen layanan terbaik untuk kepuasan belanja Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-sm">
            <h3 className="text-base font-extrabold text-blue-700 dark:text-blue-400">Kualitas Terjamin</h3>
            <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed font-medium">
              Setiap produk tas diperiksa secara fisik sebelum dikirimkan untuk memastikan kualitas kondisi barang.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-sm">
            <h3 className="text-base font-extrabold text-blue-700 dark:text-blue-400">Pengiriman Cepat</h3>
            <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed font-medium">
              Didukung pengiriman ekspres terintegrasi dengan kurir terpercaya ke seluruh kota di Indonesia.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-sm">
            <h3 className="text-base font-extrabold text-blue-700 dark:text-blue-400">Pelayanan Ramah</h3>
            <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed font-medium">
              Respon cepat dan ramah untuk memberikan kemudahan informasi produk serta update pemesanan.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Footer */}
      <footer id="kontak" className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-10 px-4 sm:px-6 lg:px-8 text-center space-y-2 transition-colors">
        <p className="text-base font-extrabold text-blue-700 dark:text-blue-400">Mbokdhe Fashion</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          © 2026 Mbokdhe Fashion. Seluruh Hak Cipta Dilindungi.
        </p>
      </footer>
    </div>
  );
}
