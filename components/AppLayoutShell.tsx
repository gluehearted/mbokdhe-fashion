"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { FloatingNewOrderButton } from "@/components/FloatingNewOrderButton";

export function AppLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return (
      <div className="min-h-screen w-full bg-slate-900 text-slate-900 font-sans overflow-x-hidden">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f7f9fb] text-[#191c1e] font-sans overflow-hidden w-full relative">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen ml-[260px] relative w-full overflow-hidden">
        {children}
      </main>
      <FloatingNewOrderButton />
    </div>
  );
}
