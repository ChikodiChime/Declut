"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileHeader } from "@/components/dashboard/MobileHeader";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-card">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
