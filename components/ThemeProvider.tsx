"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  const applyTheme = (targetTheme: Theme) => {
    if (targetTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("mbokdhe_theme") as Theme | null;
    const initialTheme = savedTheme === "dark" ? "dark" : "light";
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("mbokdhe_theme", nextTheme);
    applyTheme(nextTheme);
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

