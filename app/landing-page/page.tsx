import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
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
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
      .from("products")
      .select("*, shop:shops(*)")
      .or("status.eq.Tersedia,status.eq.Available")
      .order("createdAt", { ascending: false })
      .limit(8);

    if (error) throw error;

    availableProducts = (data || []).map((p: any) => ({
      ...p,
      shop: Array.isArray(p.shop) ? p.shop[0] : p.shop || null,
    }));
  } catch (err) {
    console.warn("Koneksi database belum terhubung atau kata sandi database pada .env belum diisi:", err);
  }

  return (
    <div className="min-h-screen bg-[#fbfbfa] dark:bg-[#0c0d0f] text-[#111111] dark:text-[#f3f3f3] font-ui transition-colors duration-300 relative overflow-hidden">
      
      {/* Background Ambient Spotlight */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(251,243,219,0.15)_0%,rgba(0,0,0,0)_70%)] dark:bg-[radial-gradient(circle,rgba(243,243,243,0.01)_0%,rgba(0,0,0,0)_70%)] pointer-events-none z-0" />

      {/* Main Content Wrap */}
      <div className="max-w-6xl mx-auto px-6 sm:px-8 relative z-10">
        
        {/* 1. Header Navbar */}
        <header className="py-8 flex items-center justify-between border-b border-[#eaeaea] dark:border-slate-800/80 mb-16 animate-fade-in-up">
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-[#111111] dark:text-[#f3f3f3] uppercase font-technical">
              Mbokdhe // Fashion
            </span>
            <span className="text-[10px] text-[#787774] dark:text-slate-400 font-technical uppercase mt-0.5 tracking-wider">
              Koleksi Tas Utilitarian
            </span>
          </div>

          <div className="flex items-center gap-8">
            <nav className="hidden sm:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-[#787774] dark:text-slate-400">
              <a href="#katalog" className="hover:text-[#111111] dark:hover:text-[#f3f3f3] transition-colors">Katalog Tas</a>
              <a href="#keunggulan" className="hover:text-[#111111] dark:hover:text-[#f3f3f3] transition-colors">Layanan</a>
            </nav>
            <ThemeToggle />
          </div>
        </header>

        {/* 2. Hero Section */}
        <section className="py-8 md:py-16 mb-20 animate-fade-in-up">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#EDF3EC] text-[#346538] font-technical">
              Status // Koleksi Aktif
            </div>
            
            <h1 className="text-5xl sm:text-7xl font-editorial text-[#111111] dark:text-[#f3f3f3] tracking-tight leading-[1.05] font-normal">
              Koleksi Tas Modern <br />
              <span className="italic text-slate-500 dark:text-slate-400 font-light">dengan Detail Utilitarian.</span>
            </h1>

            <p className="text-sm sm:text-base text-[#2F3437] dark:text-slate-300 font-normal leading-relaxed max-w-2xl pt-2">
              Temukan pilihan tas fashion berkualitas tinggi dengan desain minimalis terstruktur, harga transparan, dan jaminan pengiriman terintegrasi langsung ke seluruh wilayah Indonesia.
            </p>

            <div className="pt-6">
              <a
                href="#katalog"
                className="inline-block px-6 py-3 bg-[#111111] hover:bg-[#2c2c2c] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] font-semibold text-xs uppercase tracking-wider rounded-[6px] transition-all duration-200 active:scale-98"
              >
                Lihat Katalog Tas
              </a>
            </div>
          </div>
        </section>

        {/* 3. Catalog Section */}
        <section id="katalog" className="py-12 border-t border-[#eaeaea] dark:border-slate-800/80 mb-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical block">
                [ Katalog Produk ]
              </span>
              <h2 className="text-2xl font-editorial font-normal tracking-tight text-[#111111] dark:text-[#f3f3f3]">
                Katalog Tas Terbaru
              </h2>
            </div>
            <span className="text-[10px] font-bold uppercase font-technical text-slate-400">
              Menampilkan {availableProducts.length} unit tersedia
            </span>
          </div>

          {availableProducts.length === 0 ? (
            <div className="p-16 text-center text-slate-400 dark:text-slate-500 bg-[#F9F9F8] dark:bg-[#161719] rounded-[8px] border border-[#eaeaea] dark:border-slate-800 text-xs font-technical uppercase tracking-wider">
              Belum ada koleksi tas yang ditampilkan saat ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {availableProducts.map((p) => {
                const finalPrice = p.price - (p.discount || 0);
                return (
                  <div
                    key={p.id}
                    className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] overflow-hidden hover:shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:hover:shadow-[0_4px_25px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col group justify-between"
                  >
                    {/* Image Container */}
                    <div className="w-full h-56 bg-[#fbfbfa] dark:bg-slate-900 relative overflow-hidden flex items-center justify-center border-b border-[#eaeaea] dark:border-slate-800/80">
                      {p.photoUrl && !p.photoUrl.includes("placeholder") ? (
                        <Image
                          src={p.photoUrl}
                          alt={p.id}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600 font-bold text-xs uppercase font-technical">
                          Foto Tas #{p.id}
                        </span>
                      )}

                      {/* Code Tag */}
                      <div className="absolute top-3 left-3 bg-[#E1F3FE] text-[#1F6C9F] px-2.5 py-0.5 rounded-full text-[9px] font-technical uppercase font-semibold">
                        #{p.id}
                      </div>

                      {/* Status Tag */}
                      <div className="absolute top-3 right-3 bg-[#EDF3EC] text-[#346538] px-2.5 py-0.5 rounded-full text-[9px] font-technical uppercase font-semibold">
                        Tersedia
                      </div>
                    </div>

                    {/* Product Metadata & Info */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-1">
                        <span className="text-[9px] text-[#787774] dark:text-slate-400 font-technical uppercase tracking-wider block">
                          Supplier: {p.shop?.name || "-"}
                        </span>
                        <h3 className="text-xs font-semibold text-[#111111] dark:text-[#f3f3f3] tracking-tight line-clamp-2">
                          {p.description || `Tas Fashion #${p.id}`}
                        </h3>
                      </div>

                      <div className="pt-3 border-t border-[#f1f1f1] dark:border-slate-800/80 flex items-center justify-between">
                        <div>
                          {p.discount && p.discount > 0 ? (
                            <div>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 line-through block font-technical">
                                Rp {p.price.toLocaleString("id-ID")}
                              </span>
                              <span className="text-xs font-bold text-[#9F2F2D] dark:text-red-400 font-technical">
                                Rp {finalPrice.toLocaleString("id-ID")}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-[#111111] dark:text-[#f3f3f3] font-technical">
                              Rp {p.price.toLocaleString("id-ID")}
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-technical text-slate-400 uppercase">
                          [ Qty: 1 ]
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 4. Keunggulan Section (Bento Grid) */}
        <section id="keunggulan" className="py-12 border-t border-[#eaeaea] dark:border-slate-800/80 mb-20">
          <div className="space-y-1 mb-10">
            <span className="text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical block">
              [ Pelayanan Utama ]
            </span>
            <h2 className="text-2xl font-editorial font-normal tracking-tight text-[#111111] dark:text-[#f3f3f3]">
              Komitmen Kualitas & Kecepatan
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Bento Card 1 */}
            <div className="p-8 bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] space-y-4 hover:shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-shadow">
              <div className="w-8 h-8 rounded-full bg-[#EDF3EC] text-[#346538] flex items-center justify-center font-technical font-bold text-xs">
                01
              </div>
              <h3 className="text-sm font-semibold tracking-tight text-[#111111] dark:text-[#f3f3f3] uppercase font-technical">
                Jaminan Fisik Produk
              </h3>
              <p className="text-xs text-[#787774] dark:text-slate-400 leading-relaxed">
                Setiap produk tas melewati pemeriksaan fisik mendalam sebelum dikemas dan dikirim guna mematikan kesesuaian mutu standar tanpa cacat.
              </p>
            </div>

            {/* Bento Card 2 */}
            <div className="p-8 bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] space-y-4 hover:shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-shadow">
              <div className="w-8 h-8 rounded-full bg-[#E1F3FE] text-[#1F6C9F] flex items-center justify-center font-technical font-bold text-xs">
                02
              </div>
              <h3 className="text-sm font-semibold tracking-tight text-[#111111] dark:text-[#f3f3f3] uppercase font-technical">
                Distribusi Efisien
              </h3>
              <p className="text-xs text-[#787774] dark:text-slate-400 leading-relaxed">
                Kalkulasi otomatis kurir pengiriman instan langsung dari lokasi supplier terdekat ke alamat penerima di seluruh wilayah Indonesia.
              </p>
            </div>

            {/* Bento Card 3 */}
            <div className="p-8 bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] space-y-4 hover:shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-shadow">
              <div className="w-8 h-8 rounded-full bg-[#FBF3DB] text-[#956400] flex items-center justify-center font-technical font-bold text-xs">
                03
              </div>
              <h3 className="text-sm font-semibold tracking-tight text-[#111111] dark:text-[#f3f3f3] uppercase font-technical">
                Otomasi Komunikasi
              </h3>
              <p className="text-xs text-[#787774] dark:text-slate-400 leading-relaxed">
                Memudahkan admin menyusun pesanan baru dan membagikan tautan rekap secara langsung via Whatsapp kepada pelanggan bersangkutan.
              </p>
            </div>

          </div>
        </section>

        {/* 5. Footer */}
        <footer className="py-12 border-t border-[#eaeaea] dark:border-slate-800/80 text-center space-y-2">
          <p className="text-xs font-bold text-[#111111] dark:text-[#f3f3f3] uppercase font-technical tracking-wider">
            Mbokdhe Fashion // Rekap Katalog Terintegrasi
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-technical uppercase">
            © 2026 Mbokdhe Fashion. Seluruh hak cipta dilindungi undang-undang.
          </p>
        </footer>

      </div>
    </div>
  );
}
