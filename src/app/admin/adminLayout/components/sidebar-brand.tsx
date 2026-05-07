"use client";

import { Menu, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

type SidebarBrandProps = {
  isOpen: boolean;
  roleLabel: string;
  sectionLabel: string;
  toggleSidebar: () => void;
};

export function SidebarBrand({
  isOpen,
  roleLabel,
  sectionLabel,
  toggleSidebar,
}: SidebarBrandProps) {
  return (
    <div className="shrink-0 border-b border-slate-200/80 px-4 py-4 dark:border-slate-800">
      {isOpen ? (
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-slate-200/80 bg-white px-3.5 py-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex min-w-0 items-center gap-3">
              <ShieldMark />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight tracking-tight text-slate-950 whitespace-normal dark:text-slate-50">
                  {roleLabel}
                </p>
                <p className="mt-1 truncate text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {sectionLabel}
                </p>
              </div>
            </div>
          </div>

          <SidebarToggle isOpen={isOpen} toggleSidebar={toggleSidebar} />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <ShieldMark />
          <SidebarToggle isOpen={isOpen} toggleSidebar={toggleSidebar} />
        </div>
      )}
    </div>
  );
}

function ShieldMark() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-red-500 dark:border-slate-700 dark:bg-slate-900 dark:text-red-300">
      <Shield className="h-5 w-5" />
    </div>
  );
}

function SidebarToggle({
  isOpen,
  toggleSidebar,
}: {
  isOpen: boolean;
  toggleSidebar: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className="h-10 w-10 shrink-0 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
    >
      <Menu className="h-4 w-4" />
    </Button>
  );
}
