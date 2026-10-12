import React from "react";
import { SidebarProvider } from "../ui/sidebar";
import { Toaster } from "../ui/sonner";
import { AppSidebar } from "./SidebarContent";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {/* iOS Statusbar Blur Fix */}
      <div className="fixed top-0 left-0 z-[9999] h-px w-full bg-background" />
      <div className='flex min-h-dvh w-full'>
        <SidebarProvider>
          <AppSidebar />
          <Toaster />
          <div className='flex flex-1 flex-col size-full'>
            {children}
          </div>
        </SidebarProvider>
      </div>
    </>
  );
}

export default MainLayout;