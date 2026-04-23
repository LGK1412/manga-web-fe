import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

type LicenseVerifiedBadgeProps = {
  className?: string;
  iconClassName?: string;
  size?: "sm" | "md";
  title?: string;
};

const sizeClasses = {
  sm: {
    container: "h-8 w-8",
    icon: "h-4 w-4",
  },
  md: {
    container: "h-10 w-10",
    icon: "h-5 w-5",
  },
};

export function LicenseVerifiedBadge({
  className,
  iconClassName,
  size = "md",
  title = "Rights verified",
}: LicenseVerifiedBadgeProps) {
  const currentSize = sizeClasses[size];

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-emerald-200/90 bg-white/95 text-emerald-700 shadow-sm backdrop-blur-sm dark:border-emerald-900/60 dark:bg-slate-950/85 dark:text-emerald-300",
        currentSize.container,
        className,
      )}
      title={title}
    >
      <ShieldCheck className={cn(currentSize.icon, iconClassName)} />
      <span className="sr-only">{title}</span>
    </div>
  );
}
