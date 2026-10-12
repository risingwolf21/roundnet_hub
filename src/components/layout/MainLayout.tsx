import React from "react";
import { SidebarProvider } from "../ui/sidebar";
import { Toaster } from "../ui/sonner";
import { AppSidebar } from "./SidebarContent";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      {/* iOS Statusbar Blur Fix */}
      <div
        aria-hidden="true"
        className="fixed top-0 inset-x-0 z-[99999] h-px pointer-events-none"
        style={{ backgroundColor: "var(--background)" }}
      />
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