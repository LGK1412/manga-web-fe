"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  AlertTriangle,
  Eye,
  Clock,
  Search,
  BookOpen,
  FileText,
  MessageSquare,
  Mail,
} from "lucide-react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import AdminLayout from "../adminLayout/page";
import ReportModal from "@/components/ui/report-modal";

interface Report {
  _id: string;
  reportCode?: string;
  reporter_id?: {
    username: string;
    email: string;
    role?: string;
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

/** ===== Helpers: Axios error logger ===== */
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

/** ✅ Hover border color based on status */
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

  /** ✅ highlight row when click sendmail */
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Pagination */
  const [currentPage, setCurrentPage] = useState(1);
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

  const handleUpdateStatus = async (
    id: string,
    newStatus?: string,
    note?: string
  ) => {
    if (!API) {
      console.error("Missing NEXT_PUBLIC_API_URL");
      return;
    }

    const endpoint = `${API}/api/reports/${id}`;

    try {
      setLoading(true);

      const payload: any = {};
      if (newStatus) payload.status = newStatus;
      if (note !== undefined) payload.resolution_note = note;

      console.log("[Admin Update Report] REQUEST", { url: endpoint, payload });

      await axios.put(endpoint, payload, { withCredentials: true });

      console.log("[Admin Update Report] SUCCESS");

      setReports((prev) =>
        prev.map((r) =>
          r._id === id
            ? {
                ...r,
                status: newStatus ?? r.status,
                resolution_note: note ?? r.resolution_note,
              }
            : r
        )
      );

      setIsModalOpen(false);
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

  /** ✅ Filter logic */
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const term = searchTerm.toLowerCase();

      const matchSearch =
        r.reason?.toLowerCase().includes(term) ||
        r.reporter_id?.username?.toLowerCase().includes(term) ||
        r.reporter_id?.email?.toLowerCase().includes(term) ||
        r.target_id?.title?.toLowerCase().includes(term) ||
        r.target_id?.content?.toLowerCase().includes(term);

      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      const matchType = typeFilter === "all" || r.target_type === typeFilter;

      return matchSearch && matchStatus && matchType;
    });
  }, [reports, searchTerm, statusFilter, typeFilter]);

  const indexOfLast = currentPage * reportsPerPage;
  const indexOfFirst = indexOfLast - reportsPerPage;
  const currentReports = filteredReports.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredReports.length / reportsPerPage);

  const handlePageChange = (page: number) => setCurrentPage(page);

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
          <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" /> Manga
          </Badge>
        );
      case "Chapter":
        return (
          <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" /> Chapter
          </Badge>
        );
      case "Comment":
        return (
          <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" /> Comment
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

  /** ✅ NEW: SendMail like User Management */
  const handleSendMail = (report: Report) => {
    const reportedAgainstEmail =
      report.target_detail?.target_human?.email ||
      report.target_id?.authorId?.email ||
      report.target_id?.user?.email ||
      "";

    if (!reportedAgainstEmail) {
      toast.error("Reported Against Email not found.");
      return;
    }

    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);

    // highlight row
    setHighlightId(report._id);

    // delay to show highlight
    highlightTimerRef.current = setTimeout(() => {
      const params = new URLSearchParams({
        receiverEmail: reportedAgainstEmail,
      });

      router.push(`/admin/notifications?${params.toString()}`);
    }, 600);
  };

  const totalReports = reports.length;
  const newReports = reports.filter((r) => r.status === "new").length;
  const unresolvedReports = reports.filter((r) => r.status === "in-progress")
    .length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <p className="text-sm text-gray-500">Admin / Reports</p>
          <h1 className="text-3xl font-bold text-gray-900">
            Reported Stories Management
          </h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <p className="text-xs text-gray-600 mt-1">+12 from last month</p>
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
              <p className="text-xs text-gray-600 mt-1">
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
              <p className="text-xs text-gray-600 mt-1">
                Currently under review
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters + Table */}
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
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by user, reason, or content..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
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

              {/* Target Type Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
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

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Code</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Reported Against</TableHead>
                    <TableHead>Target Type</TableHead>
                    <TableHead>Title / Content</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-4">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : currentReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-4">
                        No reports found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentReports.map((r) => {
                      const reportedAgainst =
                        r.target_detail?.target_human?.username ||
                        r.target_id?.authorId?.username ||
                        r.target_id?.user?.username ||
                        "—";

                      const reportedAgainstEmail =
                        r.target_detail?.target_human?.email ||
                        r.target_id?.authorId?.email ||
                        r.target_id?.user?.email ||
                        null;

                      const targetTitle =
                        r.target_detail?.title ||
                        r.target_id?.title ||
                        r.target_id?.content?.slice(0, 50) ||
                        "—";

                      const isHighlighted = highlightId === r._id;

                      /** ✅ Strong row hover + status-based left border */
                      const rowClass = [
                        "group transition-all duration-150",
                        "cursor-default",
                        // hover make row obvious (serious tool)
                        "hover:bg-slate-50 hover:shadow-sm",
                        // status-based left border when hover
                        "hover:border-l-4",
                        hoverBorderByStatus(r.status),
                        // keyboard focus
                        "focus-within:bg-slate-50 focus-within:shadow-sm",
                        "focus-within:border-l-4 focus-within:border-l-blue-500",
                        // click SendMail highlight
                        isHighlighted
                          ? "bg-blue-50 ring-1 ring-blue-200 border-l-4 border-l-blue-500 shadow-sm"
                          : "",
                      ].join(" ");

                      return (
                        <TableRow key={r._id} className={rowClass}>
                          <TableCell className="group-hover:text-slate-900">
                            {r.reportCode}
                          </TableCell>

                          <TableCell className="group-hover:text-slate-900">
                            <div>
                              <div className="font-semibold">
                                {r.reporter_id?.username}
                              </div>
                              <div className="text-xs text-gray-500">
                                {r.reporter_id?.email}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="group-hover:text-slate-900">
                            <div>
                              <div className="font-semibold">
                                {reportedAgainst}
                              </div>
                              {reportedAgainstEmail && (
                                <div className="text-xs text-gray-500">
                                  {reportedAgainstEmail}
                                </div>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>{targetTypeBadge(r.target_type)}</TableCell>

                          <TableCell className="group-hover:text-slate-900">
                            {targetTitle}
                          </TableCell>

                          <TableCell className="group-hover:text-slate-900">
                            {r.reason}
                          </TableCell>

                          <TableCell>
                            <Badge className={statusColor(r.status)}>
                              {r.status}
                            </Badge>
                          </TableCell>

                          <TableCell className="group-hover:text-slate-900">
                            {r.createdAt
                              ? new Date(r.createdAt).toLocaleDateString("en-GB")
                              : "—"}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* View */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="
                                  bg-white
                                  transition-all
                                  group-hover:border-slate-400
                                  hover:bg-slate-100 hover:border-slate-500 hover:shadow-sm
                                  focus-visible:ring-2 focus-visible:ring-blue-500
                                "
                                onClick={() => openModal(r)}
                              >
                                <Eye className="h-4 w-4 mr-1" /> View
                              </Button>

                              {/* ✅ SendMail */}
                              <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                className="
                                  bg-white
                                  transition-all
                                  group-hover:border-red-400
                                  hover:bg-red-50 hover:border-red-500 hover:text-red-700 hover:shadow-sm
                                  focus-visible:ring-2 focus-visible:ring-red-500
                                "
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleSendMail(r);
                                }}
                              >
                                <Mail className="h-4 w-4 mr-1" /> SendMail
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

            {/* Pagination */}
            <div className="flex justify-center mt-4 space-x-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </Button>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Report Modal */}
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
