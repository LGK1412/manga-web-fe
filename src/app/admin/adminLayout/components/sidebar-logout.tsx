"use client";

import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

type SidebarLogoutProps = {
  isLoggingOut: boolean;
  isOpen: boolean;
  onLogout: () => void;
};

export function SidebarLogout({
  isLoggingOut,
  isOpen,
  onLogout,
}: SidebarLogoutProps) {
  return (
    <div className="shrink-0 border-t border-slate-200/80 px-3 py-4 dark:border-slate-800">
      <div className={isOpen ? "flex" : "flex justify-center"}>
        <Button
          type="button"
          variant="ghost"
          onClick={onLogout}
          disabled={isLoggingOut}
          className={`h-11 rounded-xl border border-red-400 bg-red-200 font-semibold text-red-900 transition-colors hover:bg-red-300 hover:text-red-950 dark:border-red-900 dark:bg-red-950/70 dark:text-red-50 dark:hover:bg-red-950/90 ${
            isOpen ? "w-full justify-center gap-2 px-3" : "w-11 px-0"
          }`}
          title={!isOpen ? "Logout" : ""}
        >
          {isLoggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          {isOpen && (
            <span>{isLoggingOut ? "Signing out..." : "Logout"}</span>
          )}
        </Button>
      </div>
    </div>
  );
}
