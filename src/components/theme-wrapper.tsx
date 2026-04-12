"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider } from "@/components/theme-provider";
import React from "react";

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Disable dark mode on admin and content-moderator pages
    const isAdminOrModerator =
        pathname?.startsWith("/admin") || pathname?.startsWith("/content-moderator") || pathname?.startsWith("/financial_manager");

    return (
        <ThemeProvider
            attribute="class"
            defaultTheme={isAdminOrModerator ? "light" : "system"}
            enableSystem={!isAdminOrModerator}
            disableTransitionOnChange
            forcedTheme={isAdminOrModerator ? "light" : undefined}
        >
            {children}
        </ThemeProvider>
    );
}
