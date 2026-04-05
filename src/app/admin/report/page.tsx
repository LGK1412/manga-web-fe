"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock3,
  Eye,
  Loader2,
  MessageSquare,
  Search,
  ShieldCheck,
} from "lucide-react";

import { toast } from "sonner";
import AdminLayout from "../adminLayout/page";
import ReportModal from "@/components/ui/report-modal";
import CommunityReportModal from "@/components/ui/community-report-modal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildContentReportGroups,
  buildCommunityReportGroups,
  CommunityReportAgainstGroup,
  findCommunityReportLocation,
  findReportLocation,
  formatReportDateTime,
  getInitial,
  getPageNumbers,
  isCommunityReport,
  isContentReport,
  isDoneStatus,
  MergedReportItem,
  ReportAgainstGroup,
  ReportResolutionAction,
  ReportStatus,
  resolveAvatarUrl,
  WorkspaceReport,
} from "@/lib/report-workspace";

type StaffRole = "admin" | "content_moderator" | "community_manager" | null;
type WorkspaceTab = "content" | "community";
type GroupStatusFilter = "all" | "needs-review" | "done";

type WorkspaceViewState = {
  searchTerm: string;
  statusFilter: GroupStatusFilter;
  currentPage: number;
  selectedGroupKey: string | null;
  focusReportId: string | null;
  isModalOpen: boolean;
  confirmGroupKey: string | null;
};

const GROUPS_PER_PAGE = 10;
const INITIAL_VIEW_STATE: WorkspaceViewState = {
  searchTerm: "",
  statusFilter: "all",
  currentPage: 1,
  selectedGroupKey: null,
  focusReportId: null,
  isModalOpen: false,
  confirmGroupKey: null,
};

function normalizeRole(value: unknown): StaffRole {
  const normalized = String(value || "").toLowerCase().trim();
  if (
    normalized === "admin" ||
    normalized === "content_moderator" ||
    normalized === "community_manager"
  ) {
    return normalized;
  }
  return null;
}

function logAxiosError(tag: string, endpoint: string, err: any, extra?: any) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const message = err?.message;

  console.group(`${tag} ERROR FULL`);
  console.log("url:", endpoint);
  console.log("status:", status);
  console.log("data:", data);
  console.log("data (stringify):", JSON.stringify(data, null, 2));
  console.log("message:", message);
  if (!err?.response) console.log("err.request:", err?.request);
  if (extra) console.log("extra:", extra);
  console.groupEnd();
}

function getErrorMessage(err: any) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    "Unable to load reports."
  );
}

function getGroupStatusMeta(group: { doneCount: number; totalCount: number }) {
  if (group.doneCount === group.totalCount && group.totalCount > 0) {
    return {
      label: "Done",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  return {
    label: "In progress",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  };
}

function getEditableItemReportIds(
  item: MergedReportItem,
  mode: "note" | "status"
) {
  const unresolved = item.reports
    .filter((report) => !isDoneStatus(report.status))
    .map((report) => report._id);

  if (unresolved.length > 0) return unresolved;
  if (mode === "note" && item.reports[0]?._id) return [item.reports[0]._id];
  return [];
}

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const API = process.env.NEXT_PUBLIC_API_URL;
  const linkedReportId = searchParams.get("reportId")?.trim() || "";
  const linkedReportCode = searchParams.get("reportCode")?.trim() || "";
  const linkedTab = searchParams.get("tab")?.trim().toLowerCase() || "";

  const [role, setRole] = useState<StaffRole>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [reports, setReports] = useState<WorkspaceReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("content");
  const [views, setViews] = useState<Record<WorkspaceTab, WorkspaceViewState>>({
    content: { ...INITIAL_VIEW_STATE },
    community: { ...INITIAL_VIEW_STATE },
  });

  const deepLinkHandledRef = useRef(false);

  const patchView = useCallback(
    (tab: WorkspaceTab, patch: Partial<WorkspaceViewState>) => {
      setViews((previous) => ({
        ...previous,
        [tab]: {
          ...previous[tab],
          ...patch,
        },
      }));
    },
    []
  );

  const fetchRole = useCallback(async () => {
    if (!API) {
      setRoleError("Missing NEXT_PUBLIC_API_URL.");
      setRole(null);
      return;
    }

    try {
      const response = await axios.get(`${API}/api/auth/me`, {
        withCredentials: true,
      });
      setRole(normalizeRole(response.data?.role || response.data?.user?.role));
      setRoleError(null);
    } catch (err: any) {
      setRoleError(getErrorMessage(err));
      setRole(null);
    }
  }, [API]);

  const fetchReports = useCallback(async () => {
    if (!API) {
      setListError("Missing NEXT_PUBLIC_API_URL.");
      setReports([]);
      return;
    }

    const endpoint = `${API}/api/reports`;

    setLoadingReports(true);
    setListError(null);

    try {
      const response = await axios.get(endpoint, { withCredentials: true });
      setReports(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      logAxiosError("[Admin Reports]", endpoint, err);
      setListError(getErrorMessage(err));
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  }, [API]);

  useEffect(() => {
    fetchRole();
    fetchReports();
  }, [fetchReports, fetchRole]);

  useEffect(() => {
    if (!linkedReportId && !linkedReportCode && !linkedTab) return;
    deepLinkHandledRef.current = false;
  }, [linkedReportCode, linkedReportId, linkedTab]);

  const availableTabs = useMemo<WorkspaceTab[]>(() => {
    if (role === "content_moderator") return ["content"];
    if (role === "community_manager") return ["community"];
    return ["content", "community"];
  }, [role]);

  const contentReports = useMemo(
    () => reports.filter((report) => isContentReport(report)),
    [reports]
  );
  const communityReports = useMemo(
    () => reports.filter((report) => isCommunityReport(report)),
    [reports]
  );
  const contentGroups = useMemo(
    () => buildContentReportGroups(contentReports),
    [contentReports]
  );
  const communityGroups = useMemo(
    () => buildCommunityReportGroups(communityReports),
    [communityReports]
  );

  const filteredContentGroups = useMemo(() => {
    const normalizedTerm = views.content.searchTerm.trim().toLowerCase();

    return contentGroups.filter((group) => {
      const matchesSearch =
        !normalizedTerm ||
        group.meta.name.toLowerCase().includes(normalizedTerm) ||
        String(group.meta.email || "").toLowerCase().includes(normalizedTerm) ||
        group.mangaBuckets.some((manga) =>
          manga.mangaTitle.toLowerCase().includes(normalizedTerm)
        );

      const matchesStatus =
        views.content.statusFilter === "all"
          ? true
          : views.content.statusFilter === "done"
            ? group.doneCount === group.totalCount && group.totalCount > 0
            : group.doneCount < group.totalCount;

      return matchesSearch && matchesStatus;
    });
  }, [contentGroups, views.content.searchTerm, views.content.statusFilter]);

  const filteredCommunityGroups = useMemo(() => {
    const normalizedTerm = views.community.searchTerm.trim().toLowerCase();

    return communityGroups.filter((group) => {
      const matchesSearch =
        !normalizedTerm ||
        group.meta.name.toLowerCase().includes(normalizedTerm) ||
        String(group.meta.email || "").toLowerCase().includes(normalizedTerm) ||
        group.sections.some((section) =>
          section.targetBuckets.some(
            (target) =>
              target.label.toLowerCase().includes(normalizedTerm) ||
              target.excerpt.toLowerCase().includes(normalizedTerm)
          )
        );

      const matchesStatus =
        views.community.statusFilter === "all"
          ? true
          : views.community.statusFilter === "done"
            ? group.doneCount === group.totalCount && group.totalCount > 0
            : group.doneCount < group.totalCount;

      return matchesSearch && matchesStatus;
    });
  }, [communityGroups, views.community.searchTerm, views.community.statusFilter]);

  const contentSelectedGroup = useMemo(
    () =>
      views.content.selectedGroupKey
        ? contentGroups.find((group) => group.key === views.content.selectedGroupKey) ||
          null
        : null,
    [contentGroups, views.content.selectedGroupKey]
  );

  const communitySelectedGroup = useMemo(
    () =>
      views.community.selectedGroupKey
        ? communityGroups.find(
            (group) => group.key === views.community.selectedGroupKey
          ) || null
        : null,
    [communityGroups, views.community.selectedGroupKey]
  );

  const contentConfirmGroup = useMemo(
    () =>
      views.content.confirmGroupKey
        ? contentGroups.find((group) => group.key === views.content.confirmGroupKey) ||
          null
        : null,
    [contentGroups, views.content.confirmGroupKey]
  );

  const communityConfirmGroup = useMemo(
    () =>
      views.community.confirmGroupKey
        ? communityGroups.find(
            (group) => group.key === views.community.confirmGroupKey
          ) || null
        : null,
    [communityGroups, views.community.confirmGroupKey]
  );

  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0] || "content");
    }
  }, [activeTab, availableTabs]);

  useEffect(() => {
    if (!linkedTab) return;
    if (linkedReportId || linkedReportCode) return;

    const requestedTab =
      linkedTab === "community"
        ? "community"
        : linkedTab === "content"
          ? "content"
          : null;

    if (requestedTab && availableTabs.includes(requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [availableTabs, linkedReportCode, linkedReportId, linkedTab]);

  useEffect(() => {
    if (!views.content.selectedGroupKey) return;
    if (!contentGroups.some((group) => group.key === views.content.selectedGroupKey)) {
      patchView("content", {
        selectedGroupKey: null,
        focusReportId: null,
        isModalOpen: false,
      });
    }
  }, [contentGroups, patchView, views.content.selectedGroupKey]);

  useEffect(() => {
    if (!views.community.selectedGroupKey) return;
    if (
      !communityGroups.some((group) => group.key === views.community.selectedGroupKey)
    ) {
      patchView("community", {
        selectedGroupKey: null,
        focusReportId: null,
        isModalOpen: false,
      });
    }
  }, [communityGroups, patchView, views.community.selectedGroupKey]);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(filteredContentGroups.length / GROUPS_PER_PAGE)
    );

    if (views.content.currentPage > totalPages) {
      patchView("content", { currentPage: totalPages });
    }
  }, [filteredContentGroups.length, patchView, views.content.currentPage]);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(filteredCommunityGroups.length / GROUPS_PER_PAGE)
    );

    if (views.community.currentPage > totalPages) {
      patchView("community", { currentPage: totalPages });
    }
  }, [filteredCommunityGroups.length, patchView, views.community.currentPage]);

  useEffect(() => {
    if (loadingReports || deepLinkHandledRef.current) return;
    if (!linkedReportId && !linkedReportCode) return;

    const targetReport = reports.find((report) => {
      if (linkedReportId && report._id === linkedReportId) return true;
      return (
        linkedReportCode &&
        String(report.reportCode || "").toLowerCase() ===
          linkedReportCode.toLowerCase()
      );
    });

    if (!targetReport) return;

    const targetTab: WorkspaceTab = isCommunityReport(targetReport)
      ? "community"
      : "content";

    if (!availableTabs.includes(targetTab)) return;

    const groups = targetTab === "content" ? contentGroups : communityGroups;
    if (!groups.length) return;

    const location =
      targetTab === "content"
        ? findReportLocation(contentGroups, targetReport._id)
        : findCommunityReportLocation(communityGroups, targetReport._id);

    if (!location) return;

    deepLinkHandledRef.current = true;
    setActiveTab(targetTab);

    const groupIndex = groups.findIndex((group) => group.key === location.groupKey);

    patchView(targetTab, {
      selectedGroupKey: location.groupKey,
      focusReportId: targetReport._id,
      isModalOpen: true,
      currentPage: groupIndex >= 0 ? Math.floor(groupIndex / GROUPS_PER_PAGE) + 1 : 1,
      confirmGroupKey: null,
    });
  }, [
    availableTabs,
    communityGroups,
    contentGroups,
    linkedReportCode,
    linkedReportId,
    loadingReports,
    patchView,
    reports,
  ]);

  const currentView = views[activeTab];
  const currentGroups =
    activeTab === "content" ? filteredContentGroups : filteredCommunityGroups;
  const totalPages = Math.max(1, Math.ceil(currentGroups.length / GROUPS_PER_PAGE));
  const currentPageGroups = currentGroups.slice(
    (currentView.currentPage - 1) * GROUPS_PER_PAGE,
    currentView.currentPage * GROUPS_PER_PAGE
  );
  const pageNumbers = getPageNumbers(totalPages, currentView.currentPage);

  const currentStats = useMemo(() => {
    const groups = activeTab === "content" ? contentGroups : communityGroups;
    const totalMergedCases = groups.reduce(
      (total, group) => total + group.totalCount,
      0
    );
    const doneMergedCases = groups.reduce(
      (total, group) => total + group.doneCount,
      0
    );

    return {
      totalMergedCases,
      doneMergedCases,
      openMergedCases: totalMergedCases - doneMergedCases,
      reportAgainstCount: groups.length,
    };
  }, [activeTab, communityGroups, contentGroups]);

  const applyReportMutation = useCallback(
    async ({
      reportIds,
      status,
      note,
      resolutionAction,
      mutationKey,
      successMessage,
    }: {
      reportIds: string[];
      status?: ReportStatus;
      note?: string;
      resolutionAction?: ReportResolutionAction;
      mutationKey: string;
      successMessage: string;
    }) => {
      if (!API) {
        toast.error("Missing NEXT_PUBLIC_API_URL.");
        return;
      }

      const normalizedNote = note?.trim();

      if (!status && !resolutionAction && !normalizedNote) {
        toast.error("Write a note before saving.");
        return;
      }

      if ((status === "resolved" || status === "rejected" || resolutionAction) && !normalizedNote) {
        toast.error("Add a closing note before resolving or rejecting.");
        return;
      }

      if (!reportIds.length) {
        toast.success("Nothing new to update.");
        return;
      }

      setBusyKey(mutationKey);

      try {
        const payload: Record<string, unknown> = {};
        if (status) payload.status = status;
        if (normalizedNote) payload.resolution_note = normalizedNote;
        if (resolutionAction) {
          payload.resolution_action = resolutionAction;
          payload.status = "resolved";
        }

        const finalStatus = String(payload.status || "");
        const shouldCloseFromNew =
          finalStatus === "resolved" || finalStatus === "rejected";
        const reportLookup = new Map(reports.map((report) => [report._id, report]));

        const results = await Promise.allSettled(
          reportIds.map(async (reportId) => {
            const endpoint = `${API}/api/reports/${reportId}/moderate`;
            const currentReport = reportLookup.get(reportId);

            // Backend requires new -> in-progress before a report can be closed.
            if (currentReport?.status === "new" && shouldCloseFromNew) {
              await axios.put(
                endpoint,
                { status: "in-progress" },
                { withCredentials: true }
              );
            }

            const response = await axios.put(endpoint, payload, {
              withCredentials: true,
            });

            return response.data as WorkspaceReport;
          })
        );

        const succeededReports = results.flatMap((result) =>
          result.status === "fulfilled" ? [result.value] : []
        );

        if (succeededReports.length > 0) {
          const updates = new Map(
            succeededReports.map((report) => [report._id, report])
          );

          setReports((previous) =>
            previous.map((report) => updates.get(report._id) ?? report)
          );
        }

        if (succeededReports.length === reportIds.length) {
          toast.success(successMessage);
          return;
        }

        const rejected = results.find((result) => result.status === "rejected") as
          | PromiseRejectedResult
          | undefined;

        if (succeededReports.length > 0) {
          toast.error(
            rejected
              ? `Only updated ${succeededReports.length}/${reportIds.length} reports.`
              : "Some reports may not be fully updated."
          );
          return;
        }

        toast.error(getErrorMessage(rejected?.reason));
      } catch (err: any) {
        logAxiosError("[Admin Reports Update]", `${API}/api/reports`, err, {
          reportIds,
          status,
          note: normalizedNote,
          resolutionAction,
        });
        toast.error(getErrorMessage(err));
      } finally {
        setBusyKey(null);
      }
    },
    [API, reports]
  );

  const handleTabChange = (nextTab: WorkspaceTab) => {
    setActiveTab(nextTab);
    setViews((previous) => ({
      content: {
        ...previous.content,
        isModalOpen: false,
        focusReportId: null,
        confirmGroupKey: null,
      },
      community: {
        ...previous.community,
        isModalOpen: false,
        focusReportId: null,
        confirmGroupKey: null,
      },
    }));
  };

  const handleOpenContentGroup = (group: ReportAgainstGroup, reportId?: string | null) => {
    const visibleIndex = filteredContentGroups.findIndex(
      (candidate) => candidate.key === group.key
    );

    patchView("content", {
      selectedGroupKey: group.key,
      focusReportId: reportId || null,
      isModalOpen: true,
      currentPage: visibleIndex >= 0 ? Math.floor(visibleIndex / GROUPS_PER_PAGE) + 1 : 1,
    });
  };

  const handleOpenCommunityGroup = (
    group: CommunityReportAgainstGroup,
    reportId?: string | null
  ) => {
    const visibleIndex = filteredCommunityGroups.findIndex(
      (candidate) => candidate.key === group.key
    );

    patchView("community", {
      selectedGroupKey: group.key,
      focusReportId: reportId || null,
      isModalOpen: true,
      currentPage: visibleIndex >= 0 ? Math.floor(visibleIndex / GROUPS_PER_PAGE) + 1 : 1,
    });
  };

  const handleResolveGroup = useCallback(
    async (tab: WorkspaceTab, group: ReportAgainstGroup | CommunityReportAgainstGroup) => {
      const unresolvedReportIds = group.reports
        .filter((report) => !isDoneStatus(report.status))
        .map((report) => report._id);

      await applyReportMutation({
        reportIds: unresolvedReportIds,
        status: "resolved",
        note:
          tab === "content"
            ? "Bulk resolved from content report workspace."
            : "Bulk resolved from community report workspace.",
        mutationKey: `group:${tab}:${group.key}`,
        successMessage: `Marked ${group.meta.name} cases as done.`,
      });

      patchView(tab, { confirmGroupKey: null });
    },
    [applyReportMutation, patchView]
  );

  const handleSubmitItemAction = useCallback(
    async (
      tab: WorkspaceTab,
      item: MergedReportItem,
      action: {
        status?: ReportStatus;
        note?: string;
        resolutionAction?: ReportResolutionAction;
      }
    ) => {
      const reportIds =
        action.status || action.resolutionAction
          ? getEditableItemReportIds(item, "status")
          : getEditableItemReportIds(item, "note");

      await applyReportMutation({
        reportIds,
        status: action.status,
        note: action.note,
        resolutionAction: action.resolutionAction,
        mutationKey: `item:${tab}:${item.key}`,
        successMessage: action.resolutionAction
          ? "Resolved grouped case with moderation action."
          : action.status
            ? action.status === "resolved"
              ? "Marked grouped case as done."
              : action.status === "rejected"
                ? "Rejected grouped case."
                : "Marked grouped case in progress."
            : "Saved grouped case note.",
      });
    },
    [applyReportMutation]
  );

  const activeConfirmGroup =
    activeTab === "content" ? contentConfirmGroup : communityConfirmGroup;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500">Admin / Report Review</p>
            <h1 className="text-3xl font-bold text-gray-900">Report Review</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              {activeTab === "content"
                ? "Review manga and chapter reports by reported account, then resolve grouped cases from one content-focused queue."
                : "Review comment and reply reports by reported account, then resolve grouped cases from one community-focused queue."}
            </p>
          </div>

          {availableTabs.length > 1 ? (
            <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as WorkspaceTab)}>
              <TabsList className="h-10 rounded-xl border border-slate-200 bg-white p-1">
                <TabsTrigger value="content" className="rounded-lg px-4">
                  Content
                  <Badge variant="secondary" className="ml-1 border border-slate-200 bg-slate-50 text-slate-700">
                    {contentGroups.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="community" className="rounded-lg px-4">
                  Community
                  <Badge variant="secondary" className="ml-1 border border-slate-200 bg-slate-50 text-slate-700">
                    {communityGroups.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}
        </div>

        {roleError ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Role verification issue</AlertTitle>
            <AlertDescription>{roleError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                Case Progress
              </CardTitle>
              <ShieldCheck className="h-5 w-5 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {currentStats.doneMergedCases}/{currentStats.totalMergedCases}
              </div>
              <p className="mt-1 text-xs text-gray-600">
                Grouped cases already marked done.
              </p>
            </CardContent>
          </Card>

          <Card className="border-amber-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                Open Cases
              </CardTitle>
              <Clock3 className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">
                {currentStats.openMergedCases}
              </div>
              <p className="mt-1 text-xs text-gray-600">
                {activeTab === "content"
                  ? "Still waiting for a final content decision."
                  : "Still waiting for a final community decision."}
              </p>
            </CardContent>
          </Card>

          <Card className="border-sky-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                Report Against
              </CardTitle>
              {activeTab === "content" ? (
                <BookOpen className="h-5 w-5 text-sky-600" />
              ) : (
                <MessageSquare className="h-5 w-5 text-sky-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-sky-600">
                {currentStats.reportAgainstCount}
              </div>
              <p className="mt-1 text-xs text-gray-600">
                {activeTab === "content"
                  ? "Accounts with active or completed content report history."
                  : "Accounts with active or completed community report history."}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl border-slate-200/80 shadow-sm">
          <CardHeader className="space-y-4 pb-4">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold text-slate-900">
                Report Against Queue
              </CardTitle>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={
                    activeTab === "content"
                      ? "Search by reported account or manga title..."
                      : "Search by reported account or comment text..."
                  }
                  className="pl-9"
                  value={currentView.searchTerm}
                  onChange={(event) =>
                    patchView(activeTab, {
                      searchTerm: event.target.value,
                      currentPage: 1,
                    })
                  }
                />
              </div>

              <div className="w-full lg:w-[220px]">
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Queue Status
                </label>
                <Select
                  value={currentView.statusFilter}
                  onValueChange={(value) =>
                    patchView(activeTab, {
                      statusFilter: value as GroupStatusFilter,
                      currentPage: 1,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All rows" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All rows</SelectItem>
                    <SelectItem value="needs-review">Needs review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {listError && reports.length > 0 ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Some report data may be stale</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>{listError}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-fit border-white/60 bg-white/10 text-white hover:bg-white/20"
                    onClick={fetchReports}
                  >
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="overflow-hidden rounded-2xl border border-slate-200/80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Against</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      {activeTab === "content" ? "Manga with report" : "Targets with report"}
                    </TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Latest activity</TableHead>
                    <TableHead className="w-[220px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loadingReports ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center">
                        <div className="inline-flex items-center gap-2 text-slate-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {activeTab === "content"
                            ? "Loading content reports..."
                            : "Loading community reports..."}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : listError && reports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center">
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-semibold text-rose-700">
                              Unable to load reports
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {listError}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-slate-200"
                            onClick={fetchReports}
                          >
                            Retry
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : currentPageGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center">
                        {activeTab === "content"
                          ? "No content report groups found."
                          : "No community report groups found."}
                      </TableCell>
                    </TableRow>
                  ) : activeTab === "content" ? (
                    currentPageGroups.map((group) => {
                      const contentGroup = group as ReportAgainstGroup;
                      const statusMeta = getGroupStatusMeta(contentGroup);
                      const avatar = resolveAvatarUrl(contentGroup.meta.avatar, API);
                      const isActive =
                        views.content.selectedGroupKey === contentGroup.key &&
                        views.content.isModalOpen;
                      const groupBusy = busyKey === `group:content:${contentGroup.key}`;

                      return (
                        <TableRow
                          key={contentGroup.key}
                          className={isActive ? "bg-sky-50/60" : undefined}
                        >
                          <TableCell>
                            <div className="flex items-start gap-3">
                              <Avatar className="h-11 w-11 border border-slate-200">
                                <AvatarImage
                                  src={avatar}
                                  alt={contentGroup.meta.name}
                                  referrerPolicy="no-referrer"
                                />
                                <AvatarFallback>
                                  {getInitial(contentGroup.meta.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900">
                                  {contentGroup.meta.name}
                                </div>
                                <div className="truncate text-xs text-slate-500">
                                  {contentGroup.meta.email || "No email"}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge variant="secondary" className={`border ${statusMeta.className}`}>
                              {statusMeta.label}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-semibold text-slate-900">
                                {contentGroup.mangaCount}
                              </div>
                              <div className="text-xs text-slate-500">
                                manga currently in this queue
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-semibold text-slate-900">
                                {contentGroup.doneCount}/{contentGroup.totalCount}
                              </div>
                              <div className="text-xs text-slate-500">
                                grouped cases done
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="text-sm text-slate-700">
                              {formatReportDateTime(contentGroup.latestActivityAt)}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="mx-auto grid w-[190px] grid-cols-2 gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-xl border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100 hover:text-sky-800"
                                onClick={() => handleOpenContentGroup(contentGroup)}
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </Button>
                              <Button
                                variant="success"
                                size="sm"
                                className="h-9 rounded-xl"
                                disabled={groupBusy || contentGroup.doneCount === contentGroup.totalCount}
                                onClick={() =>
                                  patchView("content", { confirmGroupKey: contentGroup.key })
                                }
                              >
                                {groupBusy ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                                Done
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    currentPageGroups.map((group) => {
                      const communityGroup = group as CommunityReportAgainstGroup;
                      const statusMeta = getGroupStatusMeta(communityGroup);
                      const avatar = resolveAvatarUrl(communityGroup.meta.avatar, API);
                      const isActive =
                        views.community.selectedGroupKey === communityGroup.key &&
                        views.community.isModalOpen;
                      const groupBusy = busyKey === `group:community:${communityGroup.key}`;

                      return (
                        <TableRow
                          key={communityGroup.key}
                          className={isActive ? "bg-sky-50/60" : undefined}
                        >
                          <TableCell>
                            <div className="flex items-start gap-3">
                              <Avatar className="h-11 w-11 border border-slate-200">
                                <AvatarImage
                                  src={avatar}
                                  alt={communityGroup.meta.name}
                                  referrerPolicy="no-referrer"
                                />
                                <AvatarFallback>
                                  {getInitial(communityGroup.meta.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900">
                                  {communityGroup.meta.name}
                                </div>
                                <div className="truncate text-xs text-slate-500">
                                  {communityGroup.meta.email || "No email"}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge variant="secondary" className={`border ${statusMeta.className}`}>
                              {statusMeta.label}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-semibold text-slate-900">
                                {communityGroup.targetCount}
                              </div>
                              <div className="text-xs text-slate-500">
                                {communityGroup.commentCount} comments, {communityGroup.replyCount} replies
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-semibold text-slate-900">
                                {communityGroup.doneCount}/{communityGroup.totalCount}
                              </div>
                              <div className="text-xs text-slate-500">
                                grouped cases done
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="text-sm text-slate-700">
                              {formatReportDateTime(communityGroup.latestActivityAt)}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="mx-auto grid w-[190px] grid-cols-2 gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-xl border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100 hover:text-sky-800"
                                onClick={() => handleOpenCommunityGroup(communityGroup)}
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </Button>
                              <Button
                                variant="success"
                                size="sm"
                                className="h-9 rounded-xl"
                                disabled={groupBusy || communityGroup.doneCount === communityGroup.totalCount}
                                onClick={() =>
                                  patchView("community", {
                                    confirmGroupKey: communityGroup.key,
                                  })
                                }
                              >
                                {groupBusy ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                                Done
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {currentGroups.length > 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-slate-200"
                  disabled={currentView.currentPage <= 1}
                  onClick={() =>
                    patchView(activeTab, {
                      currentPage: Math.max(1, currentView.currentPage - 1),
                    })
                  }
                >
                  Prev
                </Button>
                {pageNumbers.map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    variant={pageNumber === currentView.currentPage ? "default" : "outline"}
                    size="sm"
                    className="rounded-xl"
                    onClick={() => patchView(activeTab, { currentPage: pageNumber })}
                  >
                    {pageNumber}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-slate-200"
                  disabled={currentView.currentPage >= totalPages}
                  onClick={() =>
                    patchView(activeTab, {
                      currentPage: Math.min(totalPages, currentView.currentPage + 1),
                    })
                  }
                >
                  Next
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <ReportModal
          open={views.content.isModalOpen}
          group={contentSelectedGroup}
          busyKey={busyKey}
          focusReportId={views.content.focusReportId}
          onClose={() =>
            patchView("content", { isModalOpen: false, focusReportId: null })
          }
          onSubmitItemAction={(item, action) =>
            handleSubmitItemAction("content", item, action)
          }
        />

        <CommunityReportModal
          open={views.community.isModalOpen}
          group={communitySelectedGroup}
          busyKey={busyKey}
          focusReportId={views.community.focusReportId}
          onClose={() =>
            patchView("community", { isModalOpen: false, focusReportId: null })
          }
          onSubmitItemAction={(item, action) =>
            handleSubmitItemAction("community", item, action)
          }
        />

        <AlertDialog
          open={Boolean(activeConfirmGroup)}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) patchView(activeTab, { confirmGroupKey: null });
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark all current cases done?</AlertDialogTitle>
              <AlertDialogDescription>
                {activeConfirmGroup ? (
                  <>
                    This will resolve every unresolved{" "}
                    {activeTab === "content" ? "manga and chapter" : "comment and reply"}{" "}
                    report currently grouped under{" "}
                    <span className="font-semibold text-slate-900">
                      {activeConfirmGroup.meta.name}
                    </span>
                    . Existing done cases stay unchanged.
                  </>
                ) : (
                  "This will resolve every unresolved grouped case in the selected row."
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={Boolean(busyKey)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={!activeConfirmGroup || Boolean(busyKey)}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={(event) => {
                  event.preventDefault();
                  if (!activeConfirmGroup) return;
                  handleResolveGroup(activeTab, activeConfirmGroup);
                }}
              >
                {busyKey && activeConfirmGroup ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
