"use client";

import { useState, useRef, useEffect } from "react";

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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-center" ref={menuRef}>
      {/* Trigger Button (Hamburger / More Vert Icon) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors active:scale-95 border border-slate-200 mx-auto"
        title="Menu Aksi"
      >
        <span className="material-symbols-outlined text-lg">more_vert</span>
      </button>

      {/* Popover / Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-left">
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
      )}
    </div>
  );
}
