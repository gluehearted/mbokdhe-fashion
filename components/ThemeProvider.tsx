"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
});

let memoryTheme: Theme = "light";
let storageUnavailable = false;
const THEME_EVENT = "mbokdhe-theme-change";
function readTheme(): Theme {
  if (storageUnavailable) return memoryTheme;
  try { return localStorage.getItem("mbokdhe_theme") === "dark" ? "dark" : "light"; }
  catch { storageUnavailable = true; return memoryTheme; }
}
function subscribeTheme(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(THEME_EVENT, listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener(THEME_EVENT, listener); };
}
const serverTheme = (): Theme => "light";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, serverTheme);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.body.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    memoryTheme = readTheme() === "light" ? "dark" : "light";
    try { localStorage.setItem("mbokdhe_theme", memoryTheme); } catch { storageUnavailable = true; }
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-1.5 rounded-[6px] bg-[#f5f5f5] dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-[#eaeaea] dark:hover:bg-slate-700 transition-all border border-[#eaeaea] dark:border-slate-700 flex items-center justify-center shrink-0 cursor-pointer"
      title={theme === "light" ? "Ganti ke Tema Gelap (Dark Mode)" : "Ganti ke Tema Terang (Light Mode)"}
    >
      <span className="material-symbols-outlined text-sm select-none">
        {theme === "light" ? "dark_mode" : "light_mode"}
      </span>
    </button>
  );
}

