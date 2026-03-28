"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  AlertTriangle,
  ArrowUpDown,
  BellRing,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  FileText,
  Mail,
  MessageSquare,
  Search,
} from "lucide-react";

import { toast } from "sonner";
import AdminLayout from "../adminLayout/page";
import ReportModal from "@/components/ui/report-modal";
import {
  formatRoleLabel,
  getRoleColor,
  getRoleIcon,
} from "@/components/admin/users/user-management.utils";
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
    target_human?: { username?: string; email?: string };
  };
  reason: string;
  description?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  resolver_id?: string;
  resolution_note?: string;
}

type ReportSortColumn =
  | "reportCode"
  | "reporter"
  | "reportedAgainst"
  | "targetType"
  | "reason"
  | "status"
  | "createdAt";

type SortDirection = "asc" | "desc";

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

function hoverBorderByStatus(status: string) {
  switch (status) {
    case "new":
      return "hover:border-l-red-500";
    case "in-progress":
      return "hover:border-l-orange-500";
    case "resolved":
      return "hover:border-l-green-500";
    case "rejected":
      return "hover:border-l-gray-500";
    default:
      return "hover:border-l-slate-400";
  }
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

export default function ReportsPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [reports, setReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<ReportSortColumn>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportsPerPage = 10;

  useEffect(() => {
    const fetchReports = async () => {
      if (!API) {
        console.error("Missing NEXT_PUBLIC_API_URL");
        return;
      }

      const endpoint = `${API}/api/reports`;

      setLoading(true);
      try {
        console.log("[Admin Reports] REQUEST", { url: endpoint });

        const res = await axios.get(endpoint, { withCredentials: true });

        console.log("[Admin Reports] RESPONSE", {
          status: res.status,
          dataPreview: Array.isArray(res.data)
            ? `Array(${res.data.length})`
            : res.data,
        });

        setReports(res.data);
      } catch (err: any) {
        logAxiosError("[Admin Reports]", endpoint, err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [API]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

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
      setLoading(true);

      const payload: any = {};
      if (newStatus) payload.status = newStatus;
      if (note !== undefined) payload.resolution_note = note;

      console.log("[Admin Update Report] REQUEST", { url: endpoint, payload });

      await axios.put(endpoint, payload, { withCredentials: true });

      console.log("[Admin Update Report] SUCCESS");

      setReports((prev) =>
        prev.map((report) =>
          report._id === id
            ? {
                ...report,
                status: newStatus ?? report.status,
                resolution_note: note ?? report.resolution_note,
              }
            : report
        )
      );

      setIsModalOpen(false);
      toast.success("Report updated!");
    } catch (err: any) {
      logAxiosError("[Admin Update Report]", endpoint, err, {
        id,
        newStatus,
        note,
      });
      toast.error("Update failed");
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const term = searchTerm.toLowerCase();
      const reportedAgainstUsername =
        report.target_detail?.target_human?.username ||
        report.target_id?.authorId?.username ||
        report.target_id?.user?.username ||
        "";
      const reportedAgainstEmail =
        report.target_detail?.target_human?.email ||
        report.target_id?.authorId?.email ||
        report.target_id?.user?.email ||
        "";

      const matchSearch =
        report.reportCode?.toLowerCase().includes(term) ||
        report.reason?.toLowerCase().includes(term) ||
        report.reporter_id?.username?.toLowerCase().includes(term) ||
        report.reporter_id?.email?.toLowerCase().includes(term) ||
        reportedAgainstUsername.toLowerCase().includes(term) ||
        reportedAgainstEmail.toLowerCase().includes(term);

      const matchStatus =
        statusFilter === "all" || report.status === statusFilter;
      const matchType =
        typeFilter === "all" || report.target_type === typeFilter;

      return matchSearch && matchStatus && matchType;
    });
  }, [reports, searchTerm, statusFilter, typeFilter]);

  const sortedReports = useMemo(() => {
    const statusPriority: Record<string, number> = {
      new: 0,
      "in-progress": 1,
      resolved: 2,
      rejected: 3,
    };

    const sorted = [...filteredReports];

    sorted.sort((first, second) => {
      const firstReportedAgainst =
        first.target_detail?.target_human?.username ||
        first.target_id?.authorId?.username ||
        first.target_id?.user?.username ||
        "";
      const secondReportedAgainst =
        second.target_detail?.target_human?.username ||
        second.target_id?.authorId?.username ||
        second.target_id?.user?.username ||
        "";

      let result = 0;

      switch (sortColumn) {
        case "reportCode":
          result = compareStrings(first.reportCode, second.reportCode);
          break;
        case "reporter":
          result = compareStrings(
            first.reporter_id?.username,
            second.reporter_id?.username
          );
          break;
        case "reportedAgainst":
          result = compareStrings(firstReportedAgainst, secondReportedAgainst);
          break;
        case "targetType":
          result = compareStrings(first.target_type, second.target_type);
          break;
        case "reason":
          result = compareStrings(first.reason, second.reason);
          break;
        case "status":
          result =
            (statusPriority[first.status] ?? 999) -
            (statusPriority[second.status] ?? 999);
          break;
        case "createdAt":
          result = compareDates(first.createdAt, second.createdAt);
          break;
        default:
          result = 0;
      }

      return sortDirection === "asc" ? result : -result;
    });

    return sorted;
  }, [filteredReports, sortColumn, sortDirection]);

  const indexOfLast = currentPage * reportsPerPage;
  const indexOfFirst = indexOfLast - reportsPerPage;
  const currentReports = sortedReports.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(sortedReports.length / reportsPerPage);

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

  const targetTypeBadge = (type: string) => {
    switch (type) {
      case "Manga":
        return (
          <Badge className="flex items-center gap-1 bg-purple-100 text-purple-800">
            <BookOpen className="h-3.5 w-3.5" />
            Manga
          </Badge>
        );
      case "Chapter":
        return (
          <Badge className="flex items-center gap-1 bg-blue-100 text-blue-800">
            <FileText className="h-3.5 w-3.5" />
            Chapter
          </Badge>
        );
      case "Comment":
        return (
          <Badge className="flex items-center gap-1 bg-green-100 text-green-800">
            <MessageSquare className="h-3.5 w-3.5" />
            Comment
          </Badge>
        );
      default:
        return <Badge className="bg-gray-100 text-gray-700">{type}</Badge>;
    }
  };

  const openModal = (report: Report) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedReport(null);
  };

  const handleSendMail = (report: Report) => {
    const reportedAgainstEmail =
      report.target_detail?.target_human?.email ||
      report.target_id?.authorId?.email ||
      report.target_id?.user?.email ||
      "";

    if (!reportedAgainstEmail) {
      toast.error("Reported user email not found.");
      return;
    }

    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);

    setHighlightId(report._id);

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

  const totalReports = reports.length;
  const newReports = reports.filter((report) => report.status === "new").length;
  const unresolvedReports = reports.filter(
    (report) => report.status === "in-progress"
  ).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <p className="text-sm text-gray-500">Admin / Reports</p>
          <h1 className="text-3xl font-bold text-gray-900">
            Reported Stories Management
          </h1>
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
              <p className="mt-1 text-xs text-gray-600">+12 from last month</p>
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
                Require immediate attention
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
                Currently under review
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Reports List
            </CardTitle>
            <CardDescription>
              Manage and resolve story violation reports
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by code, reporter, user, or reason..."
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
                  <SelectTrigger className="w-[150px]">
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
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Manga">Manga</SelectItem>
                    <SelectItem value="Chapter">Chapter</SelectItem>
                    <SelectItem value="Comment">Comment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <SortableHeader
                        column="reportCode"
                        label="Report Code"
                        activeColumn={sortColumn}
                        direction={sortDirection}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead>
                      <SortableHeader
                        column="reporter"
                        label="Reporter"
                        activeColumn={sortColumn}
                        direction={sortDirection}
                        onSort={handleSort}
                      />
                    </TableHead>
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
                        column="targetType"
                        label="Target Type"
                        activeColumn={sortColumn}
                        direction={sortDirection}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead>
                      <SortableHeader
                        column="reason"
                        label="Reason"
                        activeColumn={sortColumn}
                        direction={sortDirection}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead>
                      <SortableHeader
                        column="status"
                        label="Status"
                        activeColumn={sortColumn}
                        direction={sortDirection}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead>
                      <SortableHeader
                        column="createdAt"
                        label="Created"
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
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-4 text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : currentReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-4 text-center">
                        No reports found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentReports.map((report) => {
                      const reportedAgainst =
                        report.target_detail?.target_human?.username ||
                        report.target_id?.authorId?.username ||
                        report.target_id?.user?.username ||
                        "Unknown user";
                      const reportedAgainstEmail =
                        report.target_detail?.target_human?.email ||
                        report.target_id?.authorId?.email ||
                        report.target_id?.user?.email ||
                        null;
                      const reporterAvatar = resolveAvatarUrl(
                        report.reporter_id?.avatar,
                        API
                      );
                      const isHighlighted = highlightId === report._id;

                      const rowClass = [
                        "group cursor-default transition-all duration-150",
                        "hover:bg-slate-50 hover:shadow-sm",
                        "hover:border-l-4",
                        hoverBorderByStatus(report.status),
                        "focus-within:bg-slate-50 focus-within:shadow-sm",
                        "focus-within:border-l-4 focus-within:border-l-blue-500",
                        isHighlighted
                          ? "border-l-4 border-l-blue-500 bg-blue-50 ring-1 ring-blue-200 shadow-sm"
                          : "",
                      ].join(" ");

                      return (
                        <TableRow key={report._id} className={rowClass}>
                          <TableCell className="group-hover:text-slate-900">
                            {report.reportCode}
                          </TableCell>

                          <TableCell className="group-hover:text-slate-900">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-10 w-10 border">
                                <AvatarImage
                                  src={reporterAvatar}
                                  alt={
                                    report.reporter_id?.username || "Reporter"
                                  }
                                  referrerPolicy="no-referrer"
                                />
                                <AvatarFallback>
                                  {getInitial(report.reporter_id?.username)}
                                </AvatarFallback>
                              </Avatar>

                              <div className="min-w-0">
                                <div className="font-medium text-slate-900">
                                  {report.reporter_id?.username ||
                                    "Unknown reporter"}
                                </div>
                                <div className="truncate text-slate-500">
                                  {report.reporter_id?.email || "No email"}
                                </div>

                                {report.reporter_id?.role ? (
                                  <div className="mt-1.5 flex flex-wrap gap-2">
                                    <Badge
                                      variant="secondary"
                                      className={`inline-flex items-center gap-1 border ${getRoleColor(
                                        report.reporter_id.role
                                      )}`}
                                    >
                                      {getRoleIcon(report.reporter_id.role)}
                                      {formatRoleLabel(report.reporter_id.role)}
                                    </Badge>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="group-hover:text-slate-900">
                            <div className="min-w-0">
                              <div className="font-semibold">
                                {reportedAgainst}
                              </div>
                              {reportedAgainstEmail ? (
                                <div className="truncate text-xs text-gray-500">
                                  {reportedAgainstEmail}
                                </div>
                              ) : null}
                            </div>
                          </TableCell>

                          <TableCell>
                            {targetTypeBadge(report.target_type)}
                          </TableCell>

                          <TableCell className="group-hover:text-slate-900">
                            {report.reason}
                          </TableCell>

                          <TableCell>
                            <Badge className={statusColor(report.status)}>
                              {report.status}
                            </Badge>
                          </TableCell>

                          <TableCell className="group-hover:text-slate-900">
                            {report.createdAt
                              ? new Date(report.createdAt).toLocaleDateString(
                                  "en-GB"
                                )
                              : "N/A"}
                          </TableCell>

                          <TableCell className="align-middle">
                            <div className="mx-auto grid w-[164px] grid-cols-2 gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 w-full rounded-xl border-sky-200 bg-sky-50 text-sky-700 shadow-none transition-colors hover:border-sky-300 hover:bg-sky-100 hover:text-sky-800"
                                onClick={() => openModal(report)}
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
                                  handleSendMail(report);
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
          loading={loading}
          onClose={closeModal}
          onUpdateStatus={handleUpdateStatus}
          statusColor={statusColor}
        />
      </div>
    </AdminLayout>
  );
}
