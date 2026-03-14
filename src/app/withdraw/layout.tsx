"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";

export default function WithdrawLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isActive = (path: string) =>
    pathname.includes(path) ? "bg-primary text-primary-foreground" : "bg-muted";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-4xl mx-auto pt-24 px-4 space-y-6">
        {/* Tabs */}
        <div className="flex gap-2">
          <Link
            href="/withdraw/request"
            className={`px-4 py-2 rounded ${isActive("request")}`}
          >
            Yêu cầu rút tiền
          </Link>

          <Link
            href="/withdraw/history"
            className={`px-4 py-2 rounded ${isActive("history")}`}
          >
            Lịch sử / Báo cáo
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}
