"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function NotificationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isReady, isLogin } = useAuth();

  useEffect(() => {
    if (!isReady || isLogin) return;
    router.replace("/");
  }, [isLogin, isReady, router]);

  if (!isReady || !isLogin) {
    return null;
  }

  return <>{children}</>;
}
