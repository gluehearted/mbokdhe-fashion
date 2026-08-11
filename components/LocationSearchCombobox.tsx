"use client";

import { useState, useEffect, useRef } from "react";
import { FlatLocation, searchLocations } from "@/lib/indonesia-locations";

interface LocationSearchComboboxProps {
  label?: string;
  placeholder?: string;
  value?: FlatLocation | null;
  initialQuery?: string;
  onSelect: (location: FlatLocation) => void;
  debounceMs?: number;
  theme?: "dark" | "light";
  required?: boolean;
}

export function LocationSearchCombobox({
  label,
  placeholder = "Ketik nama kecamatan, kelurahan, atau kota...",
  value,
  initialQuery = "",
  onSelect,
  debounceMs = 300,
  theme = "dark",
  required = false,
}: LocationSearchComboboxProps) {
  const [query, setQuery] = useState(value ? value.label : initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<FlatLocation[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal input query when value prop changes externally
  useEffect(() => {
    if (value) {
      setQuery(value.label);
    }
  }, [value]);

  // Debounce logic
  useEffect(() => {
    setIsSearching(true);
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
      setIsSearching(false);
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [query, debounceMs]);

  // Perform search when debouncedQuery changes
  useEffect(() => {
    const res = searchLocations(debouncedQuery, 25);
    setResults(res);
    setSelectedIndex(-1);
  }, [debouncedQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
  };

  const handleSelectLocation = (loc: FlatLocation) => {
    setQuery(loc.label);
    onSelect(loc);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelectLocation(results[selectedIndex]);
      } else if (results.length > 0) {
        handleSelectLocation(results[0]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Dynamic theme styles matching user screenshot (dark) or standard UI (light)
  const isDark = theme === "dark";
  const inputBgClass = isDark
    ? "bg-[#25282a] text-white border-slate-700 hover:border-slate-500 focus:border-amber-400"
    : "bg-slate-50 text-slate-900 border-slate-300 hover:border-slate-400 focus:border-blue-600";

  const dropdownBgClass = isDark
    ? "bg-[#25282a] border-slate-700 text-slate-100 shadow-2xl"
    : "bg-white border-slate-200 text-slate-900 shadow-xl";

  const hoverItemClass = isDark
    ? "hover:bg-slate-700/60"
    : "hover:bg-blue-50 hover:text-blue-900";

  const selectedItemClass = isDark
    ? "bg-slate-700 text-amber-400 font-bold"
    : "bg-blue-100 text-blue-900 font-bold";

  return (
    <div ref={containerRef} className="relative w-full text-left">
      {label && (
        <label className={`block text-xs font-semibold mb-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
          {label}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          className={`w-full py-3 px-4 pr-10 text-xs sm:text-sm rounded-xl border transition-all outline-none font-medium ${inputBgClass}`}
        />

        {/* Right Arrow / Spinner / Clear Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isSearching ? (
            <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${isDark ? "border-amber-400" : "border-blue-600"}`} />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setDebouncedQuery("");
                setIsOpen(true);
                inputRef.current?.focus();
              }}
              className={`p-1 rounded-full ${isDark ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-700"}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <svg
              className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""} ${isDark ? "text-slate-400" : "text-slate-500"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full mt-1.5 max-h-60 overflow-y-auto rounded-xl border z-50 py-1 font-mono text-xs ${dropdownBgClass}`}
        >
          {results.length === 0 ? (
            <div className="px-4 py-3 text-slate-400 text-center italic text-xs">
              Lokasi tidak ditemukan...
            </div>
          ) : (
            results.map((loc, idx) => {
              const isSelected = selectedIndex === idx || (value && value.label === loc.label);
              return (
                <div
                  key={`${loc.cityId}-${loc.district}-${loc.subdistrict}-${idx}`}
                  onClick={() => handleSelectLocation(loc)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-4 py-2.5 cursor-pointer transition-colors flex flex-col gap-0.5 border-b last:border-0 ${
                    isDark ? "border-slate-800" : "border-slate-100"
                  } ${isSelected ? selectedItemClass : hoverItemClass}`}
                >
                  <div className="font-bold tracking-tight">{loc.label}</div>
                  <div className={`text-[10px] font-sans ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Prov. {loc.province} • {loc.type} {loc.cityName} (City ID: {loc.cityId})
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
