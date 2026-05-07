"use client";

import type { ReactNode } from "react";
import { StaffNotificationBell } from "@/components/admin/staff-notification-bell";

type WorkspaceMeta = {
  description: string;
  section: string;
  title: string;
};

type AdminContentShellProps = {
  canShowStaffInboxBell: boolean;
  children: ReactNode;
  roleLabel: string;
  toolTitle: string;
  workspaceMeta: WorkspaceMeta;
};

export function AdminContentShell({
  canShowStaffInboxBell,
  children,
  roleLabel,
  toolTitle,
  workspaceMeta,
}: AdminContentShellProps) {
  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(191,219,254,0.2),transparent_36%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(248,250,252,0.94))] dark:bg-[radial-gradient(circle_at_top,rgba(30,41,59,0.48),transparent_34%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(2,6,23,0.95))]">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3">
        <header className="rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.04)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
          <div className="flex items-start justify-between gap-4 px-6 py-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  {toolTitle}
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span>{workspaceMeta.section}</span>
              </div>

              <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                {workspaceMeta.title}
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                {workspaceMeta.description}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {canShowStaffInboxBell && <StaffNotificationBell />}

              <div className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 md:flex">
                <span className="mr-2 text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  Role
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 pb-3">
          <div className="flex flex-col gap-6 px-1 py-1">{children}</div>
        </main>
      </div>
    </div>
  );
}
