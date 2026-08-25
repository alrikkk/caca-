import React from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-canvas flex flex-col bg-grid-subtle">
      <Navbar />
      <div className="flex-1 flex w-full max-w-7xl mx-auto">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 md:p-8 pb-24 md:pb-8 overflow-y-auto max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
};
