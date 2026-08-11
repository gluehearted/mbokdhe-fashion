"use client";

import { useState, useRef, useEffect } from "react";
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

export function TableActionsMenu({ items }: TableActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; right: number; openUp: boolean }>({
    top: 0,
    right: 0,
    openUp: false,
  });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      className="w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-[9999] py-1.5 overflow-hidden text-left"
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
                ? "text-blue-900 hover:bg-slate-100 font-bold"
                : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
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
        className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center transition-colors active:scale-95 border border-blue-200 mx-auto"
        title="Menu Aksi"
      >
        <span className="material-symbols-outlined text-base">more_vert</span>
      </button>

      {mounted && typeof document !== "undefined" && menuContent && createPortal(menuContent, document.body)}
    </div>
  );
}
