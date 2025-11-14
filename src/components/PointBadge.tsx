"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useUserPoint } from "@/contexts/UserPointContext";

export function PointBadge() {
  const { point, authorPoint, role } = useUserPoint();

  if (role === "admin") return null; // Admin không hiện gì cả

  return (
    <div className="flex items-center gap-4 mr-2">
      {/* Bar nạp (user và author đều có) */}
      {(role === "user" || role === "author") && (
        <div className="flex items-center bg-muted px-5 py-2 rounded-full shadow-sm min-w-[140px] justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/point-icons/point.png"
              alt="User Point"
              width={22}
              height={22}
              className="object-contain"
            />
            <span className="text-sm font-semibold">{point}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            asChild
          >
            <Link href="/topup">+</Link>
          </Button>
        </div>
      )}

      {/* Bar rút (chỉ author có) */}
      {role === "author" && (
        <div className="flex items-center bg-muted px-5 py-2 rounded-full shadow-sm min-w-[140px] justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/point-icons/author_point.png"
              alt="Author Point"
              width={22}
              height={22}
              className="object-contain"
            />
            <span className="text-sm font-semibold">{authorPoint}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            asChild
          >
            <Link href="/withdraw">→</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
