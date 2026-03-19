"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useUserPoint } from "@/contexts/UserPointContext";
import { Coins, Wallet, Plus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PointBadge() {
  const { point, authorPoint, role, isLoading } = useUserPoint();

  if (isLoading || (role !== "user" && role !== "author")) return null;

  const isAuthor = role === "author";

  return (
    <div className="flex items-center gap-2 md:gap-4 mr-1 md:mr-2">
      <PointItem
        icon={<Coins className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-500" />}
        value={point}
        href="/topup"
        actionIcon={<Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />}
        variant="yellow"
      />

      {isAuthor && (
        <PointItem
          icon={
            <Wallet className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500" />
          }
          value={authorPoint}
          href="/withdraw/request"
          actionIcon={<ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />}
          variant="emerald"
        />
      )}
    </div>
  );
}

function PointItem({
  icon,
  value,
  href,
  actionIcon,
  variant,
}: {
  icon: React.ReactNode;
  value: number;
  href: string;
  actionIcon: React.ReactNode;
  variant: "yellow" | "emerald";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 md:gap-3 p-1 md:pl-3 md:pr-1 md:py-1.5 rounded-full transition-all",
        "bg-secondary/50 border border-border shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]",
        "min-w-fit md:min-w-[140px] lg:min-w-[160px]",
      )}
    >
      <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0 ml-1 md:ml-0">
        <div
          className={cn(
            "p-1 md:p-1.5 rounded-full bg-background shadow-sm border border-border/50 shrink-0",
            variant === "yellow" ? "text-yellow-500" : "text-emerald-500",
          )}
        >
          {icon}
        </div>
        <span className="text-[12px] md:text-sm font-bold truncate tracking-tighter md:tracking-tight">
          {value >= 1000000
            ? (value / 1000000).toFixed(1) + "M"
            : value.toLocaleString()}
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          // Nút bấm nhỏ lại ở mobile
          "h-6 w-6 md:h-8 md:w-8 rounded-full shrink-0 shadow-md transition-transform active:scale-90",
          variant === "yellow"
            ? "bg-yellow-500 hover:bg-yellow-600 text-white"
            : "bg-emerald-500 hover:bg-emerald-600 text-white",
        )}
        asChild
      >
        <Link href={href}>{actionIcon}</Link>
      </Button>
    </div>
  );
}
