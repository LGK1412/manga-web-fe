import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import FCMToken from "@/components/firebase/FCMToken";
import SWRegister from "@/components/firebase/SWRegister";
import { cookies } from "next/headers";
import 'react-confirm-alert/src/react-confirm-alert.css';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Manga World - Read & Write Manga",
  description: "A platform for reading and writing manga",
  generator: "v0.app",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token");
  const isLogin = !!accessToken;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <FCMToken />
          <SWRegister />
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
