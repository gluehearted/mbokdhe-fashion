"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Floating Notification Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl border shadow-xl flex items-center gap-3 transition-all animate-in slide-in-from-bottom-5 duration-200 text-xs font-semibold ${
              toast.type === "error"
                ? "bg-white border-blue-300 text-blue-900 shadow-blue-900/10"
                : toast.type === "info"
                ? "bg-white border-slate-300 text-slate-800"
                : "bg-blue-600 border-blue-700 text-white shadow-blue-600/25"
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {toast.type === "error" ? "error" : toast.type === "info" ? "info" : "check_circle"}
            </span>
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-current opacity-70 hover:opacity-100 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Return dummy fallback if called outside provider during SSR/testing
    return {
      showToast: (msg: string) => {
        if (typeof window !== "undefined") alert(msg);
      },
    };
  }
  return context;
}
