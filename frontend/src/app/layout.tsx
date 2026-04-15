import "./globals.css";
import type { Metadata } from "next";
import React from "react";
import { SidebarProvider } from "@/context/SidebarContext";
import { MerchantModalProvider } from "@/context/MerchantModalContext";
import MerchantModal from "@/components/modals/MerchantModal";

export const metadata: Metadata = {
  title: "ERP Multi Merchant",
  description: "ERP Multi Merchant Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SidebarProvider>
          <MerchantModalProvider>
            {children}
            <MerchantModal />
          </MerchantModalProvider>
        </SidebarProvider>
      </body>
    </html>
  );
}