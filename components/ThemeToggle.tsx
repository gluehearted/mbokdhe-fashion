"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm active:scale-95"
      title={theme === "light" ? "Ganti ke Tema Gelap (Dark Mode)" : "Ganti ke Tema Terang (Light Mode)"}
    >
      <span className="material-symbols-outlined text-xl select-none">
        {theme === "light" ? "dark_mode" : "light_mode"}
      </span>
    </button>
  );
}
