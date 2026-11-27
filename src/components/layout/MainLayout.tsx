import { AppBadge } from "@/features/pwa/AppBadge";
import { useIsWide } from "@/hooks/use-mobile";
import React from "react";
import { SidebarProvider } from "../ui/sidebar";
import { Toaster } from "../ui/sonner";
import { AppSidebar } from "./SidebarContent";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  // Tablets get an icon bar, wide screens the full sidebar; phones open it as a sheet.
  const isWide = useIsWide();
  return (<div className='flex min-h-dvh w-full'>
    <SidebarProvider open={isWide}>
      <AppSidebar />
      <Toaster />
      <AppBadge />
      <div className='flex flex-1 flex-col size-full'>
        {children}
      </div>
    </SidebarProvider>
  </div>
  );
}

export default MainLayout;