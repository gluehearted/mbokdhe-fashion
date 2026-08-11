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
      const openUp = spaceBelow < 160; // If less than 160px below, open upwards

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
      className="w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-[9999] py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-left"
    >
      {items.map((item, idx) => (
        <button
          key={idx}
          type="button"
          disabled={item.disabled}
          onClick={() => {
            setIsOpen(false);
            item.onClick();
          }}
          className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            item.danger
              ? "text-rose-700 hover:bg-rose-50"
              : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
          }`}
        >
          {item.icon && (
            <span className="material-symbols-outlined text-base">
              {item.icon}
            </span>
          )}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className="relative inline-block text-center">
      {/* Trigger Button (Hamburger / More Vert Icon) */}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors active:scale-95 border border-slate-200 mx-auto"
        title="Menu Aksi"
      >
        <span className="material-symbols-outlined text-lg">more_vert</span>
      </button>

      {/* Render via Portal to avoid overflow clipping */}
      {mounted && typeof document !== "undefined" && menuContent && createPortal(menuContent, document.body)}
    </div>
  );
}
