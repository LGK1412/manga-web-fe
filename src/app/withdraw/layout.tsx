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

  // Kiểm tra active chính xác hơn
  const isActive = (path: string) => pathname.includes(path);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Navbar />

      <div className="max-w-6xl mx-auto pt-28 px-4 pb-20 space-y-8">
        <div className="flex justify-center">
          <div className="inline-flex p-1 bg-gray-200/50 backdrop-blur-md rounded-xl w-full max-w-[400px] shadow-inner">
            <Link
              href="/withdraw/request"
              className={`
                flex-1 flex items-center justify-center gap-2 
                px-6 py-2.5 text-sm font-bold transition-all duration-200 rounded-lg
                ${
                  isActive("request")
                    ? "bg-white text-gray-900 shadow-sm scale-[1.02]"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                }
              `}
            >
              Withdraw
            </Link>

            <Link
              href="/withdraw/history"
              className={`
                flex-1 flex items-center justify-center gap-2 
                px-6 py-2.5 text-sm font-bold transition-all duration-200 rounded-lg
                ${
                  isActive("history")
                    ? "bg-white text-gray-900 shadow-sm scale-[1.02]"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                }
              `}
            >
              History
            </Link>
          </div>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </div>
    </div>
  );
}
