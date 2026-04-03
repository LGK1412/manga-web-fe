"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import {
  AlertTriangle,
  ArrowUpDown,
  BellRing,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  Mail,
  MessageSquare,
  Search,
} from "lucide-react";

import { toast } from "sonner";
import AdminLayout from "../adminLayout/page";
import ReportModal from "@/components/ui/report-modal";
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

interface Report {
  _id: string;
  reportCode?: string;
  reporter_id?: {
    username: string;
    email: string;
    role?: string;
    avatar?: string;
  };
  target_type: string;
  target_id?: {
    _id?: string;
    title?: string;
    content?: string;
    authorId?: { username?: string; email?: string };
    user?: { username?: string; email?: string };
  };
  target_detail?: {
    title?: string;
    target_human?: {
      user_id?: string;
      username?: string;
      email?: string;
      avatar?: string;
    };
  };
  reason: string;
  description?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  resolver_id?: string;
  resolution_note?: string;
}

type ReportSortColumn = "reportedAgainst" | "reportCount";

type SortDirection = "asc" | "desc";
type QuickFilterKey =
  | "all"
  | "new"
  | "in-progress"
  | "resolved"
  | "comment"
  | "manga";

type ReportedAgainstMeta = {
  key: string;
  userId?: string | null;
  name: string;
  email: string | null;
  avatar?: string;
};

type ReportGroup = {
  key: string;
  meta: ReportedAgainstMeta;
  reports: Report[];
  primaryReport: Report;
  reportCount: number;
};

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

  if (!err?.response) {
    console.log("No response object -> maybe network/CORS/server down?");
    console.log("err.request:", err?.request);
  }

  if (extra) console.log("extra:", extra);
  console.groupEnd();
}

function isAbsoluteUrl(value: string) {
  return /^(?:[a-z]+:)?\/\//i.test(value) || value.startsWith("data:");
}

function resolveAvatarUrl(rawAvatar?: string, apiUrl?: string) {
  if (!rawAvatar) return undefined;
  if (isAbsoluteUrl(rawAvatar)) return rawAvatar;
  if (!apiUrl) return undefined;

  const normalizedApi = apiUrl.replace(/\/+$/, "");
  const normalizedAvatar = rawAvatar.replace(/^\/+/, "");
  return `${normalizedApi}/assets/avatars/${normalizedAvatar}`;
}

function getInitial(value?: string) {
  return value?.trim()?.charAt(0)?.toUpperCase() || "U";
}

function compareStrings(a?: string | null, b?: string | null) {
  return String(a || "").localeCompare(String(b || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function compareDates(a?: string | null, b?: string | null) {
  const first = a ? new Date(a).getTime() : 0;
  const second = b ? new Date(b).getTime() : 0;
  return first - second;
}

function nextSortDirection(
  activeColumn: ReportSortColumn,
  currentColumn: ReportSortColumn,
  currentDirection: SortDirection
): SortDirection {
  if (activeColumn !== currentColumn) return "asc";
  return currentDirection === "asc" ? "desc" : "asc";
}

function SortableHeader({
  column,
  label,
  activeColumn,
  direction,
  onSort,
}: {
  column: ReportSortColumn;
  label: string;
  activeColumn: ReportSortColumn;
  direction: SortDirection;
  onSort: (column: ReportSortColumn) => void;
}) {
  const isActive = activeColumn === column;

  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="inline-flex items-center gap-1 font-medium text-slate-700 transition-colors hover:text-slate-900"
    >
      <span>{label}</span>

      {!isActive ? (
        <ArrowUpDown className="h-4 w-4 text-slate-400" />
      ) : direction === "desc" ? (
        <ChevronDown className="h-4 w-4 text-slate-500" />
      ) : (
        <ChevronUp className="h-4 w-4 text-slate-500" />
      )}
    </button>
  );
}

function getReportedAgainstMeta(report: Report): ReportedAgainstMeta {
  const userId = report.target_detail?.target_human?.user_id || null;
  const name =
    report.target_detail?.target_human?.username ||
    report.target_id?.authorId?.username ||
    report.target_id?.user?.username ||
    "Unknown user";
  const email =
    report.target_detail?.target_human?.email ||
    report.target_id?.authorId?.email ||
    report.target_id?.user?.email ||
    null;

  return {
    key: userId
      ? `user:${userId}`
      : email
      ? `email:${email.toLowerCase()}`
      : name !== "Unknown user"
      ? `name:${name.toLowerCase()}`
      : `report:${report._id}`,
    userId,
    name,
    email,
    avatar: report.target_detail?.target_human?.avatar,
  };
}

function getReportFetchErrorMessage(err: any) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    "Unable to load reports."
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const API = process.env.NEXT_PUBLIC_API_URL;
  const linkedReportId = searchParams.get("reportId")?.trim() || "";
  const linkedReportCode = searchParams.get("reportCode")?.trim() || "";

  const [reports, setReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [highlightGroupKey, setHighlightGroupKey] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<ReportSortColumn>("reportCount");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deepLinkHandledRef = useRef(false);
  const reportsPerPage = 10;

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
      const res = await axios.get(endpoint, { withCredentials: true });
      setReports(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      logAxiosError("[Admin Reports]", endpoint, err);
      setListError(getReportFetchErrorMessage(err));
    } finally {
      setLoadingReports(false);
    }
  }, [API]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!linkedReportId && !linkedReportCode) return;

    deepLinkHandledRef.current = false;
    setStatusFilter("all");
    setTypeFilter("all");
  }, [linkedReportCode, linkedReportId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, sortColumn, sortDirection]);

  const handleUpdateStatus = async (
    id: string,
    newStatus?: string,
    note?: string
  ) => {
    if (!API) {
      console.error("Missing NEXT_PUBLIC_API_URL");
      return;
    }

    const endpoint = `${API}/api/reports/${id}/moderate`;

    try {
      setUpdatingReportId(id);

      const payload: any = {};
      if (newStatus) payload.status = newStatus;
      if (note !== undefined) payload.resolution_note = note;

      console.log("[Admin Update Report] REQUEST", { url: endpoint, payload });

      await axios.put(endpoint, payload, { withCredentials: true });

      console.log("[Admin Update Report] SUCCESS");

      const nextStatus = newStatus ?? selectedReport?.status;

      setReports((prev) =>
        prev.map((report) =>
          report._id === id
            ? {
                ...report,
                status: newStatus ?? report.status,
                resolution_note: note ?? report.resolution_note,
                updatedAt: new Date().toISOString(),
              }
            : report
        )
      );
      setSelectedReport((prev) =>
        prev && prev._id === id
          ? {
              ...prev,
              status: newStatus ?? prev.status,
              resolution_note: note ?? prev.resolution_note,
              updatedAt: new Date().toISOString(),
            }
          : prev
      );

      toast.success(
        newStatus
          ? `Report marked ${nextStatus?.replace("-", " ")}`
          : "Resolution note saved"
      );
    } catch (err: any) {
      logAxiosError("[Admin Update Report]", endpoint, err, {
        id,
        newStatus,
        note,
      });
      toast.error("Update failed");
    } finally {
      setUpdatingReportId(null);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const term = searchTerm.toLowerCase();
      const reportedAgainstMeta = getReportedAgainstMeta(report);
      const reportedAgainstUsername = reportedAgainstMeta.name || "";
      const reportedAgainstEmail = reportedAgainstMeta.email || "";

      const matchSearch =
        term.length === 0 ||
        reportedAgainstUsername.toLowerCase().includes(term) ||
        reportedAgainstEmail.toLowerCase().includes(term);

      const matchStatus =
        statusFilter === "all" || report.status === statusFilter;
      const matchType =
        typeFilter === "all"
          ? true
          : typeFilter === "conversation"
          ? report.target_type === "Comment" || report.target_type === "Reply"
          : report.target_type === typeFilter;

      return matchSearch && matchStatus && matchType;
    });
  }, [reports, searchTerm, statusFilter, typeFilter]);

  const groupedReports = useMemo(() => {
    const groups = new Map<string, ReportGroup>();

    filteredReports.forEach((report) => {
      const meta = getReportedAgainstMeta(report);
      const existing = groups.get(meta.key);

      if (existing) {
        existing.reports.push(report);
        return;
      }

      groups.set(meta.key, {
        key: meta.key,
        meta,
        reports: [report],
        primaryReport: report,
        reportCount: 1,
      });
    });

    const rows = Array.from(groups.values()).map((group) => {
      const reportsByNewest = [...group.reports].sort((first, second) =>
        compareDates(
          second.updatedAt || second.createdAt,
          first.updatedAt || first.createdAt
        )
      );

      return {
        ...group,
        reports: reportsByNewest,
        primaryReport: reportsByNewest[0],
        reportCount: reportsByNewest.length,
      };
    });

    rows.sort((first, second) => {
      let result = 0;

      switch (sortColumn) {
        case "reportedAgainst":
          result = compareStrings(first.meta.name, second.meta.name);
          break;
        case "reportCount":
          result = first.reportCount - second.reportCount;
          break;
        default:
          result = 0;
      }

      return sortDirection === "asc" ? result : -result;
    });

    return rows;
  }, [filteredReports, sortColumn, sortDirection]);

  const indexOfLast = currentPage * reportsPerPage;
  const indexOfFirst = indexOfLast - reportsPerPage;
  const currentReportGroups = groupedReports.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(groupedReports.length / reportsPerPage);

  const statusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-yellow-100 text-yellow-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const openModal = (report: Report, groupKey?: string) => {
    setSelectedReport(report);
    setIsModalOpen(true);
    if (groupKey) {
      setHighlightGroupKey(groupKey);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedReport(null);
  };

  const handleSendMail = (group: ReportGroup) => {
    const reportedAgainstEmail = group.meta.email || "";

    if (!reportedAgainstEmail) {
      toast.error("Reported user email not found.");
      return;
    }

    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);

    setHighlightGroupKey(group.key);

    highlightTimerRef.current = setTimeout(() => {
      const params = new URLSearchParams({
        receiverEmail: reportedAgainstEmail,
      });

      router.push(`/admin/notifications/send-general?${params.toString()}`);
    }, 350);
  };

  const handleSort = (column: ReportSortColumn) => {
    setSortDirection((currentDirection) =>
      nextSortDirection(column, sortColumn, currentDirection)
    );
    setSortColumn(column);
  };

  const activeQuickFilter = useMemo<QuickFilterKey | null>(() => {
    if (statusFilter === "all" && typeFilter === "all") return "all";
    if (statusFilter === "new" && typeFilter === "all") return "new";
    if (statusFilter === "in-progress" && typeFilter === "all") {
      return "in-progress";
    }
    if (statusFilter === "resolved" && typeFilter === "all") return "resolved";
    if (statusFilter === "all" && typeFilter === "conversation") {
      return "comment";
    }
    if (statusFilter === "all" && typeFilter === "Manga") return "manga";
    return null;
  }, [statusFilter, typeFilter]);

  const quickFilters = useMemo(
    () => [
      {
        key: "all" as const,
        label: "All reports",
        count: reports.length,
        icon: AlertTriangle,
      },
      {
        key: "new" as const,
        label: "New",
        count: reports.filter((report) => report.status === "new").length,
        icon: Clock,
      },
      {
        key: "in-progress" as const,
        label: "In Progress",
        count: reports.filter((report) => report.status === "in-progress")
          .length,
        icon: Eye,
      },
      {
        key: "resolved" as const,
        label: "Resolved",
        count: reports.filter((report) => report.status === "resolved").length,
        icon: CheckCircle,
      },
      {
        key: "comment" as const,
        label: "Comments only",
        count: reports.filter(
          (report) =>
            report.target_type === "Comment" || report.target_type === "Reply"
        ).length,
        icon: MessageSquare,
      },
      {
        key: "manga" as const,
        label: "Manga only",
        count: reports.filter((report) => report.target_type === "Manga").length,
        icon: BookOpen,
      },
    ],
    [reports]
  );

  const applyQuickFilter = (filter: QuickFilterKey) => {
    setCurrentPage(1);

    switch (filter) {
      case "new":
        setStatusFilter("new");
        setTypeFilter("all");
        break;
      case "in-progress":
        setStatusFilter("in-progress");
        setTypeFilter("all");
        break;
      case "resolved":
        setStatusFilter("resolved");
        setTypeFilter("all");
        break;
      case "comment":
        setStatusFilter("all");
        setTypeFilter("conversation");
        break;
      case "manga":
        setStatusFilter("all");
        setTypeFilter("Manga");
        break;
      default:
        setStatusFilter("all");
        setTypeFilter("all");
        break;
    }
  };

  const selectedReportIndex = useMemo(() => {
    if (!selectedReport) return -1;
    const selectedGroupKey = getReportedAgainstMeta(selectedReport).key;
    return groupedReports.findIndex((group) => group.key === selectedGroupKey);
  }, [selectedReport, groupedReports]);

  const openModalByIndex = (index: number) => {
    const group = groupedReports[index];
    if (!group) return;

    setSelectedReport(group.primaryReport);
    setIsModalOpen(true);
    setHighlightGroupKey(group.key);
    setCurrentPage(Math.floor(index / reportsPerPage) + 1);
  };

  useEffect(() => {
    if (loadingReports || deepLinkHandledRef.current) return;
    if (!linkedReportId && !linkedReportCode) return;
    if (!reports.length || !groupedReports.length) return;

    const targetReport = reports.find((report) => {
      if (linkedReportId && report._id === linkedReportId) return true;
      return (
        linkedReportCode &&
        String(report.reportCode || "").toLowerCase() === linkedReportCode.toLowerCase()
      );
    });

    if (!targetReport) return;

    const targetGroupKey = getReportedAgainstMeta(targetReport).key;
    const targetIndex = groupedReports.findIndex(
      (group) => group.key === targetGroupKey
    );

    if (targetIndex < 0) return;

    deepLinkHandledRef.current = true;
    setHighlightGroupKey(targetGroupKey);
    setSelectedReport(targetReport);
    setIsModalOpen(true);
    setCurrentPage(Math.floor(targetIndex / reportsPerPage) + 1);
  }, [linkedReportCode, linkedReportId, loadingReports, reports, groupedReports]);

  const handlePreviousReport = () => {
    if (selectedReportIndex <= 0) return;
    openModalByIndex(selectedReportIndex - 1);
  };

  const handleNextReport = () => {
    if (selectedReportIndex < 0 || selectedReportIndex >= groupedReports.length - 1) {
      return;
    }
    openModalByIndex(selectedReportIndex + 1);
  };

  const totalReports = reports.length;
  const newReports = reports.filter((report) => report.status === "new").length;
  const unresolvedReports = reports.filter(
    (report) => report.status === "in-progress"
  ).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <p className="text-sm text-gray-500">Admin / Report Workspace</p>
          <h1 className="text-3xl font-bold text-gray-900">
            Moderation Reports
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Review reports across manga, chapters, comments, and replies from one queue.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                Total Reports
              </CardTitle>
              <AlertTriangle className="h-5 w-5 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {totalReports}
              </div>
              <p className="mt-1 text-xs text-gray-600">Current queue snapshot across all report types.</p>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                New Reports
              </CardTitle>
              <Clock className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{newReports}</div>
              <p className="mt-1 text-xs text-gray-600">
                Waiting for a first review
              </p>
            </CardContent>
          </Card>

          <Card className="border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                Unresolved Reports
              </CardTitle>
              <Eye className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {unresolvedReports}
              </div>
              <p className="mt-1 text-xs text-gray-600">
                Already picked up by staff
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl border-slate-200/80 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Reports Queue
                </CardTitle>
                <CardDescription className="max-w-2xl text-sm leading-6">
                  Review the target account quickly and move each case through
                  moderation without leaving the queue.
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {quickFilters.map((filter) => {
                const Icon = filter.icon;
                const isActive = activeQuickFilter === filter.key;

                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => applyQuickFilter(filter.key)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{filter.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        isActive
                          ? "bg-white/15 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {filter.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardHeader>

          <CardContent>
            {listError && reports.length > 0 && (
              <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Some report data may be stale.</p>
                  <p className="text-amber-800">{listError}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                  onClick={fetchReports}
                >
                  Retry
                </Button>
              </div>
            )}

            <div className="mb-5 flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by reported account or email..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Status
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[168px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Target Type
                </label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[178px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="conversation">
                      Comments & Replies
                    </SelectItem>
                    <SelectItem value="Manga">Manga</SelectItem>
                    <SelectItem value="Chapter">Chapter</SelectItem>
                    <SelectItem value="Comment">Comment</SelectItem>
                    <SelectItem value="Reply">Reply</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <SortableHeader
                        column="reportedAgainst"
                        label="Reported Against"
                        activeColumn={sortColumn}
                        direction={sortDirection}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead>
                      <SortableHeader
                        column="reportCount"
                        label="Report Count"
                        activeColumn={sortColumn}
                        direction={sortDirection}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead className="w-[184px] text-center">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loadingReports ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-4 text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : listError && reports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center">
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-semibold text-rose-700">
                              Unable to load reports
                            </p>
                            <p className="mt-1 text-sm text-slate-500">{listError}</p>
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
                  ) : currentReportGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-4 text-center">
                        No reports found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentReportGroups.map((group) => {
                      const reportedAgainst = group.meta.name;
                      const reportedAgainstEmail = group.meta.email;
                      const reportedAgainstAvatar = resolveAvatarUrl(
                        group.meta.avatar,
                        API
                      );
                      const isHighlighted = highlightGroupKey === group.key;

                      const rowClass = [
                        "group cursor-default transition-all duration-150",
                        "hover:bg-slate-50 hover:shadow-sm",
                        "focus-within:bg-slate-50 focus-within:shadow-sm",
                        isHighlighted
                          ? "bg-blue-50 ring-1 ring-blue-200 shadow-sm"
                          : "",
                      ].join(" ");

                      return (
                        <TableRow key={group.key} className={rowClass}>
                          <TableCell className="group-hover:text-slate-900">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-10 w-10 border">
                                <AvatarImage
                                  src={reportedAgainstAvatar}
                                  alt={reportedAgainst || "Reported user"}
                                  referrerPolicy="no-referrer"
                                />
                                <AvatarFallback>
                                  {getInitial(reportedAgainst)}
                                </AvatarFallback>
                              </Avatar>

                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900">
                                  {reportedAgainst}
                                </div>
                                {reportedAgainstEmail ? (
                                  <div className="truncate text-xs text-gray-500">
                                    {reportedAgainstEmail}
                                  </div>
                                ) : (
                                  <div className="truncate text-xs text-gray-400">
                                    No email
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="group-hover:text-slate-900">
                            <div className="flex items-center gap-3">
                              <div className="text-2xl font-semibold text-slate-900">
                                {group.reportCount}
                              </div>
                              <Badge
                                variant="secondary"
                                className="border border-slate-200 bg-slate-100 text-slate-700"
                              >
                                total reports
                              </Badge>
                            </div>
                          </TableCell>

                          <TableCell className="align-middle">
                            <div className="mx-auto grid w-[164px] grid-cols-2 gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 w-full rounded-xl border-sky-200 bg-sky-50 text-sky-700 shadow-none transition-colors hover:border-sky-300 hover:bg-sky-100 hover:text-sky-800"
                                onClick={() =>
                                  openModal(group.primaryReport, group.key)
                                }
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                className="h-9 w-full rounded-xl border-amber-200 bg-amber-50 text-amber-700 shadow-none transition-colors hover:border-amber-300 hover:bg-amber-100 hover:text-amber-800 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  handleSendMail(group);
                                }}
                                disabled={!reportedAgainstEmail}
                                title={
                                  reportedAgainstEmail
                                    ? "Open notification composer"
                                    : "This report target does not have an email"
                                }
                              >
                                {reportedAgainstEmail ? (
                                  <BellRing className="h-4 w-4" />
                                ) : (
                                  <Mail className="h-4 w-4" />
                                )}
                                Notify
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

            <div className="mt-4 flex justify-center space-x-2">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (page) => (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                )
              )}
            </div>
          </CardContent>
        </Card>

        <ReportModal
          open={isModalOpen}
          report={selectedReport}
          loading={Boolean(updatingReportId)}
          onClose={closeModal}
          onUpdateStatus={handleUpdateStatus}
          statusColor={statusColor}
          onPrevious={handlePreviousReport}
          onNext={handleNextReport}
          hasPrevious={selectedReportIndex > 0}
          hasNext={
            selectedReportIndex >= 0 &&
            selectedReportIndex < groupedReports.length - 1
          }
        />
      </div>
    </AdminLayout>
  );
}
