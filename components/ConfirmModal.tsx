"use client";

import React, { useEffect } from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Konfirmasi Penghapusan",
  message,
  confirmText = "Ya, Hapus Data",
  cancelText = "Batal",
  isDestructive = true,
  isLoading = false,
}: ConfirmModalProps) {
  // Tutup modal jika tombol Escape ditekan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[3px] flex items-center justify-center p-4 transition-all animate-fade-in"
      onClick={() => {
        if (!isLoading) onClose();
      }}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white dark:bg-[#141517] border border-[#eaeaea] dark:border-slate-800/80 rounded-[8px] max-w-md w-full p-6 space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.18)] font-ui animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Icon */}
        <div className="flex items-start gap-3.5 border-b border-[#eaeaea] dark:border-slate-800/80 pb-4">
          <div
            className={`w-10 h-10 rounded-[6px] flex items-center justify-center shrink-0 ${
              isDestructive
                ? "bg-[#FDEBEC] dark:bg-red-950/40 text-[#9F2F2D] dark:text-red-400 border border-[#f5c2c2] dark:border-red-900/50"
                : "bg-[#E1F3FE] dark:bg-sky-950/40 text-[#1F6C9F] dark:text-sky-400 border border-[#c5e6fb] dark:border-sky-900/50"
            }`}
          >
            <span className="material-symbols-outlined text-xl">
              {isDestructive ? "delete_forever" : "help_outline"}
            </span>
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="text-sm font-bold text-[#111111] dark:text-[#f3f3f3] uppercase font-technical tracking-tight">
              {title}
            </h3>
            <span className="text-[10px] text-[#787774] dark:text-slate-400 font-technical uppercase mt-0.5 tracking-wider block">
              [ Tindakan Tidak Dapat Dibatalkan ]
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50 p-1"
            title="Tutup"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Message Body */}
        <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-ui py-1">
          {typeof message === "string" ? (
            <p className="whitespace-pre-line">{message}</p>
          ) : (
            message
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-2 border-t border-[#eaeaea] dark:border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 bg-[#f5f5f5] hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-[6px] transition-colors border border-[#eaeaea] dark:border-slate-700 cursor-pointer uppercase font-technical text-xs disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-2.5 text-white font-bold rounded-[6px] transition-all cursor-pointer uppercase font-technical text-xs active:scale-95 shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5 ${
              isDestructive
                ? "bg-[#9F2F2D] hover:bg-red-800"
                : "bg-[#111111] hover:bg-[#333333] dark:bg-[#f3f3f3] dark:text-[#111111] dark:hover:bg-slate-200"
            }`}
          >
            {isLoading ? (
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                Memproses...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
