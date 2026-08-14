"use client";

import { ThemeToggle } from "@/components/ThemeProvider";

const WA_NUMBER = "6285810912193";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fbfbfa] dark:bg-[#0c0d0f] text-[#111111] dark:text-[#f3f3f3] font-ui transition-colors duration-300 relative overflow-hidden flex flex-col justify-between">
      
      {/* Background Ambient Spotlight */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(251,243,219,0.15)_0%,rgba(0,0,0,0)_70%)] dark:bg-[radial-gradient(circle,rgba(243,243,243,0.01)_0%,rgba(0,0,0,0)_70%)] pointer-events-none z-0" />

      {/* Main Content Wrap */}
      <div className="max-w-6xl mx-auto px-6 sm:px-8 relative z-10 w-full">
        
        {/* 1. Header Navbar */}
        <header className="py-8 flex items-center justify-between border-b border-[#eaeaea] dark:border-slate-800/80 mb-16 animate-fade-in-up">
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-[#111111] dark:text-[#f3f3f3] uppercase font-technical">
              Mbokdhe // Fashion
            </span>
            <span className="text-[10px] text-[#787774] dark:text-slate-400 font-technical uppercase mt-0.5 tracking-wider">
              Koleksi Tas Pilihan
            </span>
          </div>

          <div className="flex items-center gap-8">
            <nav className="flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-[#787774] dark:text-slate-400 font-technical">
              <a href="#layanan" className="hover:text-[#111111] dark:hover:text-[#f3f3f3] transition-colors">
                Layanan
              </a>
              <a
                href={`https://wa.me/${WA_NUMBER}?text=Halo%20Admin%20Mbokdhe%20Fashion,%20saya%20ingin%20bertanya%20mengenai%20koleksi%20tas.`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#111111] dark:hover:text-[#f3f3f3] transition-colors flex items-center gap-1"
              >
                <span>WhatsApp</span>
              </a>
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
              <span className="italic text-slate-500 dark:text-slate-400 font-light">
                Pilihan Elegan &amp; Berkualitas.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-[#2F3437] dark:text-slate-300 font-normal leading-relaxed max-w-2xl pt-2">
              Temukan pilihan tas fashion berkualitas tinggi dengan desain rapi terstruktur, harga transparan, dan jaminan pengiriman terintegrasi langsung ke seluruh wilayah Indonesia.
            </p>

            <div className="pt-6">
              <a
                href={`https://wa.me/${WA_NUMBER}?text=Halo%20Admin%20Mbokdhe%20Fashion,%20saya%20ingin%20tanya%20koleksi%20tas%20terbaru.`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#111111] hover:bg-[#2c2c2c] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] font-semibold text-xs uppercase tracking-wider rounded-[6px] transition-all duration-200 active:scale-98 shadow-sm font-technical"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                <span>Chat WhatsApp Admin</span>
              </a>
            </div>
          </div>
        </section>

        {/* 3. Layanan Section (Bento Grid) */}
        <section id="layanan" className="py-12 border-t border-[#eaeaea] dark:border-slate-800/80 mb-20 scroll-mt-6">
          <div className="space-y-1 mb-10">
            <span className="text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical block">
              [ Layanan Utama ]
            </span>
            <h2 className="text-2xl font-editorial font-normal tracking-tight text-[#111111] dark:text-[#f3f3f3]">
              Komitmen Kualitas &amp; Pelayanan
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
                Setiap produk tas melewati pemeriksaan fisik sebelum dikemas guna memastikan kesesuaian mutu standar tanpa cacat.
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
                Pengiriman terintegrasi ke seluruh Indonesia dengan pilihan ekspedisi terpercaya dan pembaruan nomor resi secara akurat.
              </p>
            </div>

            {/* Bento Card 3 */}
            <div className="p-8 bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] space-y-4 hover:shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-shadow">
              <div className="w-8 h-8 rounded-full bg-[#FBF3DB] text-[#956400] flex items-center justify-center font-technical font-bold text-xs">
                03
              </div>
              <h3 className="text-sm font-semibold tracking-tight text-[#111111] dark:text-[#f3f3f3] uppercase font-technical">
                Layanan Responsif
              </h3>
              <p className="text-xs text-[#787774] dark:text-slate-400 leading-relaxed">
                Kemudahan konsultasi model tas, detail ukuran, dan foto asli tambahan secara langsung melalui WhatsApp resmi.
              </p>
            </div>

          </div>
        </section>

      </div>

      {/* 4. Footer */}
      <footer className="py-12 border-t border-[#eaeaea] dark:border-slate-800/80 text-center space-y-2 max-w-6xl mx-auto px-6 sm:px-8 w-full">
        <p className="text-xs font-bold text-[#111111] dark:text-[#f3f3f3] uppercase font-technical tracking-wider">
          Mbokdhe Fashion // Koleksi Tas Pilihan
        </p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-technical uppercase">
          © 2026 Mbokdhe Fashion. Seluruh hak cipta dilindungi undang-undang.
        </p>
      </footer>

    </div>
  );
}
