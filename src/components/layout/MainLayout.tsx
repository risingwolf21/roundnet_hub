import React from "react";
import { SidebarProvider } from "../ui/sidebar";
import { Toaster } from "../ui/sonner";
import { AppSidebar } from "./SidebarContent";

export function MainLayout({ children }: { children: React.ReactNode }) {

  return (
    <SidebarProvider>
      <AppSidebar />
      <Toaster />
      <main className="flex min-h-screen w-full flex-col bg-background">
        {children}
      </main>
    </SidebarProvider>

  );
}