import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeWrapper } from "@/components/theme-wrapper";
import { Toaster } from "@/components/ui/toaster";
import FCMToken from "@/components/firebase/FCMToken";
import SWRegister from "@/components/firebase/SWRegister";
import "react-confirm-alert/src/react-confirm-alert.css";
import { UserPointProvider } from "@/contexts/UserPointContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Manga World - Read & Write Manga",
  description: "A platform for reading and writing manga",
  generator: "v1.app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeWrapper>
          <FCMToken />
          <SWRegister />
          <AuthProvider>
            <UserPointProvider>
              {children}
              <Toaster />
            </UserPointProvider>
          </AuthProvider>
        </ThemeWrapper>
      </body>
    </html>
  );
}