"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import axios from "axios";

export function PointBadge() {
  const [point, setPoint] = useState(0);
  const [authorPoint, setAuthorPoint] = useState(0);
  const [role, setRole] = useState("user");

  useEffect(() => {
    async function fetchPoint() {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/user/point`,
          { withCredentials: true }
        );
        setPoint(res.data.point ?? 0);
        setAuthorPoint(res.data.author_point ?? 0);
        setRole(res.data.role);
      } catch (err) {
        console.error(err);
      }
    }

    fetchPoint();
  }, []);

  const isAuthor = role === "author";

  return (
    <div className="flex items-center gap-2 mr-2">
      <div className="flex items-center bg-muted px-4 py-1.5 rounded-full shadow-sm min-w-[100px] justify-between">
        <span className="text-sm font-semibold">
          {isAuthor ? authorPoint : point}
        </span>

        {isAuthor ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            asChild
          >
            <Link href="/withdraw">→</Link>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            asChild
          >
            <Link href="/topup">+</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
