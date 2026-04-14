"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarClock,
  CheckCircle,
  Clock3,
  FileText,
  Loader2,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  formatReportDateTime,
  formatReasonLabel,
  getInitial,
  getPageNumbers,
  MergedReportItem,
  ReportAgainstGroup,
  ReportResolutionAction,
  ReportStatus,
  resolveAvatarUrl,
} from "@/lib/report-workspace";
import {
  formatRoleLabel,
  getRoleColor,
  getRoleIcon,
} from "@/components/admin/users/user-management.utils";

type ReportModalProps = {
  open: boolean;
  group: ReportAgainstGroup | null;
  busyKey: string | null;
  focusReportId?: string | null;
  onClose: () => void;
  onSubmitItemAction: (
    item: MergedReportItem,
    action: {
      status?: ReportStatus;
      note?: string;
      resolutionAction?: ReportResolutionAction;
    }
  ) => void;
};

function getStatusClass(status: string) {
  switch (status) {
    case "new":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "in-progress":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "resolved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function getReasonMeta(reason: string) {
  const normalized = String(reason || "").toLowerCase();

  if (normalized === "harassment" || normalized === "inappropriate") {
    return {
      className: "border-rose-200 bg-rose-50 text-rose-700",
      icon: ShieldAlert,
    };
  }

  if (normalized === "copyright" || normalized === "offense") {
    return {
      className: "border-amber-200 bg-amber-50 text-amber-700",
      icon: ShieldAlert,
    };
  }

  if (normalized === "spam") {
    return {
      className: "border-sky-200 bg-sky-50 text-sky-700",
      icon: MessageSquare,
    };
  }

  return {
    className: "border-slate-200 bg-slate-100 text-slate-700",
    icon: FileText,
  };
}

function findFocusLocation(group: ReportAgainstGroup, reportId?: string | null) {
  if (!reportId) return null;

  for (const manga of group.mangaBuckets) {
    for (const target of manga.targetBuckets) {
      for (const item of target.mergedItems) {
        if (item.reports.some((report) => report._id === reportId)) {
          return {
            mangaId: manga.mangaId,
            targetKey: target.key,
            itemKey: item.key,
          };
        }
      }
    }
  }

  return null;
}

export default function ReportModal({
  open,
  group,
  busyKey,
  focusReportId,
  onClose,
  onSubmitItemAction,
}: ReportModalProps) {
  const API = process.env.NEXT_PUBLIC_API_URL;
  const [selectedMangaId, setSelectedMangaId] = useState("");
  const [selectedTargetKey, setSelectedTargetKey] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [highlightedItemKey, setHighlightedItemKey] = useState<string | null>(
    null
  );
  const itemsPerPage = 10;

  useEffect(() => {
    if (!group) {
      setNoteDrafts({});
      return;
    }

    setNoteDrafts((previous) => {
      const next: Record<string, string> = {};

      group.mangaBuckets.forEach((manga) => {
        manga.targetBuckets.forEach((target) => {
          target.mergedItems.forEach((item) => {
            next[item.key] =
              previous[item.key] ?? item.latestResolutionNote ?? "";
          });
        });
      });

      return next;
    });
  }, [group]);

  useEffect(() => {
    if (!group) {
      setSelectedMangaId("");
      setSelectedTargetKey("");
      setCurrentPage(1);
      setHighlightedItemKey(null);
      return;
    }

    const focusLocation = findFocusLocation(group, focusReportId);
    const fallbackManga = group.mangaBuckets[0];
    const nextMangaId = focusLocation?.mangaId || fallbackManga?.mangaId || "";
    const nextManga =
      group.mangaBuckets.find((manga) => manga.mangaId === nextMangaId) ||
      fallbackManga;
    const nextTargetKey =
      focusLocation?.targetKey || nextManga?.targetBuckets[0]?.key || "";

    setSelectedMangaId(nextMangaId);
    setSelectedTargetKey(nextTargetKey);
    setHighlightedItemKey(focusLocation?.itemKey || null);

    const focusedTarget = nextManga?.targetBuckets.find(
      (target) => target.key === nextTargetKey
    );
    const focusedIndex = focusLocation?.itemKey
      ? focusedTarget?.mergedItems.findIndex(
          (item) => item.key === focusLocation.itemKey
        ) ?? -1
      : -1;

    setCurrentPage(
      focusedIndex >= 0 ? Math.floor(focusedIndex / itemsPerPage) + 1 : 1
    );
  }, [group, focusReportId]);

  const selectedManga = useMemo(() => {
    if (!group) return null;

    return (
      group.mangaBuckets.find((manga) => manga.mangaId === selectedMangaId) ||
      group.mangaBuckets[0] ||
      null
    );
  }, [group, selectedMangaId]);

  useEffect(() => {
    if (!selectedManga) return;

    if (!selectedManga.targetBuckets.some((target) => target.key === selectedTargetKey)) {
      setSelectedTargetKey(selectedManga.targetBuckets[0]?.key || "");
      setCurrentPage(1);
    }
  }, [selectedManga, selectedTargetKey]);

  const selectedTarget = useMemo(() => {
    if (!selectedManga) return null;

    return (
      selectedManga.targetBuckets.find((target) => target.key === selectedTargetKey) ||
      selectedManga.targetBuckets[0] ||
      null
    );
  }, [selectedManga, selectedTargetKey]);

  const paginatedItems = useMemo(() => {
    if (!selectedTarget) return [];

    const start = (currentPage - 1) * itemsPerPage;
    return selectedTarget.mergedItems.slice(start, start + itemsPerPage);
  }, [currentPage, selectedTarget]);

  const totalPages = selectedTarget
    ? Math.max(1, Math.ceil(selectedTarget.mergedItems.length / itemsPerPage))
    : 1;
  const pageNumbers = getPageNumbers(totalPages, currentPage);

  if (!group) return null;

  const groupAvatar = resolveAvatarUrl(group.meta.avatar, API);

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-hidden border-l border-slate-200 bg-slate-50 p-0 shadow-2xl sm:max-w-2xl lg:max-w-[1020px]"
      >
        <SheetHeader className="border-b border-slate-200 bg-white px-6 py-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <SheetTitle className="text-xl text-slate-900">
                Content Report Workspace
              </SheetTitle>
              <SheetDescription className="max-w-3xl text-sm leading-6 text-slate-500">
                Review grouped manga and chapter reports for one reported
                account and resolve cases from the same workspace.
              </SheetDescription>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 border border-slate-200 bg-white shadow-sm">
                    <AvatarImage
                      src={groupAvatar}
                      alt={group.meta.name}
                      referrerPolicy="no-referrer"
                    />
                    <AvatarFallback>{getInitial(group.meta.name)}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Report Against
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">
                      {group.meta.name}
                    </h3>
                    <p className="truncate text-sm text-slate-500">
                      {group.meta.email || "No email"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "border",
                          group.status === "done"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        )}
                      >
                        {group.status === "done" ? "Done" : "In progress"}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="border border-slate-200 bg-white text-slate-700"
                      >
                        {group.doneCount}/{group.totalCount} cases done
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="border border-slate-200 bg-white text-slate-700"
                      >
                        {group.mangaCount} manga
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Latest activity
                </p>
                <div className="mt-2 flex items-center gap-2 font-medium text-slate-900">
                  <CalendarClock className="h-4 w-4 text-slate-500" />
                  {formatReportDateTime(group.latestActivityAt)}
                </div>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <section className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Select manga</p>
              <p className="mt-1 text-xs text-slate-500">
                Only manga that currently have reports are shown here.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.mangaBuckets.map((manga) => (
                <Button
                  key={manga.mangaId}
                  type="button"
                  variant={manga.mangaId === selectedManga?.mangaId ? "default" : "outline"}
                  className="h-auto max-w-full rounded-full px-4 py-2 text-left"
                  onClick={() => {
                    setSelectedMangaId(manga.mangaId);
                    setCurrentPage(1);
                    setHighlightedItemKey(null);
                  }}
                >
                  <span className="block max-w-[240px] truncate">
                    {manga.mangaTitle}
                  </span>
                </Button>
              ))}
            </div>
          </section>

          {selectedManga ? (
            <section className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Target options
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Only targets with reports are listed.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedManga.targetBuckets.map((target) => (
                  <Button
                    key={target.key}
                    type="button"
                    variant={target.key === selectedTarget?.key ? "default" : "outline"}
                    className="h-auto max-w-full rounded-full px-4 py-2 text-left"
                    onClick={() => {
                      setSelectedTargetKey(target.key);
                      setCurrentPage(1);
                      setHighlightedItemKey(null);
                    }}
                  >
                    <span className="block max-w-[260px] truncate">
                      {target.label}
                      {target.subtitle ? ` - ${target.subtitle}` : ""}
                    </span>
                  </Button>
                ))}
              </div>
            </section>
          ) : null}

          {selectedTarget ? (
            <section className="space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Selected target</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-900">
                      {selectedTarget.kind === "manga"
                        ? selectedTarget.mangaTitle
                        : `${selectedTarget.label}${
                            selectedTarget.subtitle
                              ? ` - ${selectedTarget.subtitle}`
                              : ""
                          }`}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedTarget.kind === "manga"
                        ? "Grouped manga-level reports only."
                        : `Part of ${selectedTarget.mangaTitle}.`}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="secondary"
                      className="border border-slate-200 bg-slate-50 text-slate-700"
                    >
                      {selectedTarget.doneCount}/{selectedTarget.totalCount} cases
                      done
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="border border-slate-200 bg-slate-50 text-slate-700"
                    >
                      {selectedTarget.kind === "manga" ? (
                        <BookOpen className="h-3.5 w-3.5" />
                      ) : (
                        <FileText className="h-3.5 w-3.5" />
                      )}
                      {selectedTarget.kind === "manga" ? "Manga" : "Chapter"}
                    </Badge>
                  </div>
                </div>
              </div>

              {paginatedItems.length ? (
                <div className="space-y-4">
                  {paginatedItems.map((item) => {
                    const reasonMeta = getReasonMeta(item.reason);
                    const ReasonIcon = reasonMeta.icon;
                    const itemBusy = busyKey === `item:${item.key}`;
                    const reporterAvatar = resolveAvatarUrl(item.reporter.avatar, API);
                    const noteValue =
                      noteDrafts[item.key] ?? item.latestResolutionNote ?? "";

                    return (
                      <article
                        key={item.key}
                        className={cn(
                          "rounded-[26px] border bg-white p-5 shadow-sm",
                          item.isDone
                            ? "border-emerald-200/80"
                            : "border-slate-200/90",
                          highlightedItemKey === item.key ? "ring-2 ring-sky-200" : ""
                        )}
                      >
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-11 w-11 border border-slate-200 shadow-sm">
                                <AvatarImage
                                  src={reporterAvatar}
                                  alt={item.reporter.name}
                                  referrerPolicy="no-referrer"
                                />
                                <AvatarFallback>
                                  {getInitial(item.reporter.name)}
                                </AvatarFallback>
                              </Avatar>

                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900">
                                  {item.reporter.name}
                                </p>
                                <p className="truncate text-sm text-slate-500">
                                  {item.reporter.email || "No email"}
                                </p>
                                {item.reporter.role ? (
                                  <div className="mt-2">
                                    <Badge
                                      variant="secondary"
                                      className={`inline-flex items-center gap-1 border ${getRoleColor(
                                        item.reporter.role
                                      )}`}
                                    >
                                      {getRoleIcon(item.reporter.role)}
                                      {formatRoleLabel(item.reporter.role)}
                                    </Badge>
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Badge
                                variant="secondary"
                                className={`border ${reasonMeta.className}`}
                              >
                                <ReasonIcon className="h-3.5 w-3.5" />
                                {formatReasonLabel(item.reason)}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className={`border ${getStatusClass(item.status)}`}
                              >
                                {item.status}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className="border border-slate-200 bg-slate-50 text-slate-700"
                              >
                                {item.moments.length} report moments
                              </Badge>
                            </div>
                          </div>

                          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                            <div className="space-y-4">
                              <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                <p className="font-medium text-slate-900">
                                  Latest activity
                                </p>
                                <p className="mt-1">
                                  {formatReportDateTime(item.latestActivityAt)}
                                </p>
                              </div>

                              {item.latestDescription ? (
                                <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                    Latest reporter note
                                  </p>
                                  <p className="mt-2 text-sm leading-7 text-slate-700">
                                    {item.latestDescription}
                                  </p>
                                </div>
                              ) : null}

                              <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                  Report moments
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {item.moments.map((moment) => (
                                    <span
                                      key={moment.reportId}
                                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600"
                                    >
                                      <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                                      {formatReportDateTime(moment.createdAt)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                                <p className="text-sm font-semibold text-slate-900">
                                  Staff note
                                </p>
                                <Textarea
                                  value={noteValue}
                                  onChange={(event) =>
                                    setNoteDrafts((previous) => ({
                                      ...previous,
                                      [item.key]: event.target.value,
                                    }))
                                  }
                                  rows={7}
                                  placeholder="Add a working note for the current grouped case..."
                                  className="mt-3 rounded-xl border-slate-200 bg-white"
                                />
                              </div>

                              <div className="grid gap-2">
                                <Button
                                  variant="outline"
                                  className="rounded-xl border-slate-200"
                                  disabled={itemBusy}
                                  onClick={() =>
                                    onSubmitItemAction(item, { note: noteValue })
                                  }
                                >
                                  {itemBusy ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <FileText className="h-4 w-4" />
                                  )}
                                  Save Note
                                </Button>

                                <Button
                                  variant="outline"
                                  className="rounded-xl border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800"
                                  disabled={
                                    itemBusy ||
                                    item.isDone ||
                                    item.status === "in-progress"
                                  }
                                  onClick={() =>
                                    onSubmitItemAction(item, {
                                      status: "in-progress",
                                      note: noteValue,
                                    })
                                  }
                                >
                                  {itemBusy ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Clock3 className="h-4 w-4" />
                                  )}
                                  Mark In Progress
                                </Button>

                                <Button
                                  variant="success"
                                  className="rounded-xl"
                                  disabled={itemBusy || item.isDone}
                                  onClick={() =>
                                    onSubmitItemAction(item, {
                                      status: "resolved",
                                      note: noteValue,
                                    })
                                  }
                                >
                                  {itemBusy ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4" />
                                  )}
                                  Mark Done
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  No grouped cases for the current target.
                </div>
              )}

              {selectedTarget.mergedItems.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-slate-200"
                    disabled={currentPage <= 1}
                    onClick={() =>
                      setCurrentPage((previous) => Math.max(1, previous - 1))
                    }
                  >
                    Prev
                  </Button>
                  {pageNumbers.map((pageNumber) => (
                    <Button
                      key={pageNumber}
                      variant={pageNumber === currentPage ? "default" : "outline"}
                      size="sm"
                      className="rounded-xl"
                      onClick={() => setCurrentPage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-slate-200"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setCurrentPage((previous) =>
                        Math.min(totalPages, previous + 1)
                      )
                    }
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
