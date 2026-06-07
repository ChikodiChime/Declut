"use client";

import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { TopBar } from '@/components/dashboard/TopBar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
