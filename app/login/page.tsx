"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeProvider";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Gagal masuk. Periksa email dan kata sandi.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setErrorMessage("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#fbfbfa] dark:bg-[#0c0d0f] p-6 font-ui relative overflow-hidden transition-colors">
      
      {/* Top Right Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-sm bg-white dark:bg-[#141517] rounded-[8px] p-8 border border-[#eaeaea] dark:border-slate-800/80 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-6 relative z-10 animate-fade-in-up">
        
        {/* Header Logo & Title */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-editorial text-[#111111] dark:text-[#f3f3f3] tracking-tight">
            Mbokdhe Fashion
          </h1>
          <p className="text-[10px] text-[#787774] dark:text-slate-400 font-technical uppercase tracking-wider">
            [ Portal Autentikasi Admin ]
          </p>
        </div>

        {/* Error Alert (Using Muted Pale Red Pastel Style) */}
        {errorMessage && (
          <div className="p-3 bg-[#FDEBEC] text-[#9F2F2D] border border-[#f5c2c2] rounded-[6px] text-xs font-semibold text-center font-technical">
            {errorMessage}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
              Email Akun
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@mbokdhe.com"
              className="w-full px-4 py-2.5 bg-white dark:bg-[#1c1d1f] border border-[#eaeaea] dark:border-slate-800 text-[#111111] dark:text-white text-sm focus:outline-none focus:border-[#111111] dark:focus:border-slate-500 rounded-[6px] font-medium transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-[#787774] dark:text-slate-400 uppercase tracking-widest font-technical">
              Kata Sandi
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-white dark:bg-[#1c1d1f] border border-[#eaeaea] dark:border-slate-800 text-[#111111] dark:text-white text-sm focus:outline-none focus:border-[#111111] dark:focus:border-slate-500 rounded-[6px] font-medium pr-10 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center justify-center p-1"
                title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              >
                <span className="material-symbols-outlined text-lg select-none">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:hover:bg-slate-200 text-white dark:text-[#111111] font-semibold rounded-[6px] text-xs uppercase tracking-wider transition-all duration-200 active:scale-98 disabled:opacity-50 mt-2 cursor-pointer"
          >
            {submitting ? "Memproses..." : "Masuk ke Dashboard"}
          </button>
        </form>

        <div className="pt-4 text-center border-t border-[#f1f1f1] dark:border-slate-800/80">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-technical uppercase tracking-wider">
            Sistem Keamanan Terproteksi • 2026
          </p>
        </div>
      </div>
    </div>
  );
}
