"use client";

import { useState, useRef, useEffect, useSyncExternalStore, useCallback } from "react";
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

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) {
      setIsOpen(false); return;
    }
    const height = Math.min(items.length * 40 + 12, window.innerHeight - 16);
    const openUp = window.innerHeight - rect.bottom < height + 6 && rect.top > height + 8;
    const left = Math.max(8, Math.min(rect.right - 192, window.innerWidth - 200));
    setMenuCoords({
      top: openUp ? rect.top - 8 : Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - height - 8)),
      right: Math.max(8, window.innerWidth - left - 192), openUp,
    });
  }, [items.length]);

  const toggleMenu = () => {
    if (!isOpen) updateMenuPosition();
    setIsOpen(prev => !prev);
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

    function handleScrollOrResize() { updateMenuPosition(); }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { setIsOpen(false); buttonRef.current?.focus({ preventScroll: true }); }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScrollOrResize, true);
      window.addEventListener("resize", handleScrollOrResize);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, updateMenuPosition]);

  const menuContent = isOpen && mounted ? (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: menuCoords.openUp ? undefined : `${menuCoords.top}px`,
        bottom: menuCoords.openUp ? `${window.innerHeight - menuCoords.top}px` : undefined,
        right: `${menuCoords.right}px`,
      }}
      className="w-48 bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-850 rounded-[6px] shadow-[0_4px_16px_rgba(0,0,0,0.04)] z-[9999] py-1.5 overflow-hidden text-left transition-colors font-ui"
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
            className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
              item.danger
                ? "text-[#9F2F2D] dark:text-red-400 hover:bg-[#FDEBEC] dark:hover:bg-red-950/20 font-bold"
                : "text-slate-700 dark:text-slate-200 hover:bg-[#f5f5f5] dark:hover:bg-slate-800 hover:text-[#111111] dark:hover:text-white"
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
        className="w-8 h-8 rounded-[6px] bg-[#f5f5f5] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-400 flex items-center justify-center transition-colors active:scale-95 border border-[#eaeaea] dark:border-slate-700 mx-auto cursor-pointer"
        title="Menu Aksi"
        aria-expanded={isOpen}
      >
        <span className="material-symbols-outlined text-base">more_vert</span>
      </button>

      {mounted && typeof document !== "undefined" && menuContent && createPortal(menuContent, document.body)}
    </div>
  );
}
