import React from "react";
import { SidebarProvider } from "../ui/sidebar";
import { Toaster } from "../ui/sonner";
import { AppSidebar } from "./SidebarContent";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex min-h-dvh w-full'>
      <SidebarProvider>
        <AppSidebar />
        <Toaster />
        <div className='flex flex-1 flex-col size-full'>
          {children}
        </div>
      </SidebarProvider>
    </div>
  );
}