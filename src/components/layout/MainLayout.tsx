import React from "react";
import { SidebarProvider } from "../ui/sidebar";
import { AppSidebar } from "./SidebarContent";

export function MainLayout({ children }: { children: React.ReactNode }) {

  return (
    <SidebarProvider>
      <AppSidebar />

      <main className="flex min-h-screen w-full flex-col bg-background">
        {children}
      </main>
    </SidebarProvider>

  );
}