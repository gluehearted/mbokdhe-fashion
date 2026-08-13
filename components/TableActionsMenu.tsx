"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

export interface ActionMenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface TableActionsMenuProps {
  items: ActionMenuItem[];
}

const emptySubscribe = () => () => {};

export function TableActionsMenu({ items }: TableActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; right: number; openUp: boolean }>({
    top: 0,
    right: 0,
    openUp: false,
  });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const toggleMenu = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const spaceBelow = windowHeight - rect.bottom;
      const openUp = spaceBelow < 160;

      setMenuCoords({
        top: openUp ? rect.top - 8 : rect.bottom + 6,
        right: window.innerWidth - rect.right,
        openUp,
      });
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleScrollOrResize() {
      if (isOpen) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScrollOrResize, true);
      window.addEventListener("resize", handleScrollOrResize);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  const menuContent = isOpen && mounted ? (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: menuCoords.openUp ? undefined : `${menuCoords.top}px`,
        bottom: menuCoords.openUp ? `${window.innerHeight - menuCoords.top}px` : undefined,
        right: `${menuCoords.right}px`,
      }}
      className="w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-[9999] py-1.5 overflow-hidden text-left transition-colors"
    >
      {items.map((item, idx) => {
        let iconName = item.icon;
        if (!iconName) {
          if (item.danger || item.label.toLowerCase().includes("hapus")) iconName = "delete";
          else if (item.label.toLowerCase().includes("edit") || item.label.toLowerCase().includes("input")) iconName = "edit";
          else if (item.label.toLowerCase().includes("lihat") || item.label.toLowerCase().includes("detail")) iconName = "visibility";
        }

        return (
          <button
            key={idx}
            type="button"
            disabled={item.disabled}
            onClick={() => {
              setIsOpen(false);
              item.onClick();
            }}
            className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              item.danger
                ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold"
                : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-400"
            }`}
          >
            {iconName && (
              <span className="material-symbols-outlined text-sm font-normal">
                {iconName}
              </span>
            )}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div className="relative inline-block text-center">
      {/* Hamburger Action Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-blue-700 dark:text-blue-400 flex items-center justify-center transition-colors active:scale-95 border border-blue-200 dark:border-slate-700 mx-auto"
        title="Menu Aksi"
      >
        <span className="material-symbols-outlined text-base">more_vert</span>
      </button>

      {mounted && typeof document !== "undefined" && menuContent && createPortal(menuContent, document.body)}
    </div>
  );
}
