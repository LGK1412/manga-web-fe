"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  FileCheck,
  FileText,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star,
  Tags,
  User2,
  Zap,
} from "lucide-react";

import AdminLayout from "../adminLayout/page";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type LicenseStatus = "none" | "pending" | "approved" | "rejected";
type PublicationStatus = "draft" | "published" | "unpublished";
type EnforcementStatus = "normal" | "suspended" | "banned";
type StoryStatus = "ongoing" | "completed" | "hiatus";

type ActionDialogType =
  | null
  | "approve-license"
  | "reject-license"
  | "publish"
  | "unpublish"
  | "suspend"
  | "ban"
  | "clear-enforcement";

interface MangaListItem {
  id: string;
  title: string;
  author: string;
  authorId?: string;
  summary: string;
  coverImage: string;
  licenseStatus: LicenseStatus;
  publicationStatus: PublicationStatus;
  enforcementStatus: EnforcementStatus;
  enforcementReason?: string;
  status: StoryStatus;
  views: number;
  chaptersCount: number;
  updatedAt: string;
  licenseSubmittedAt?: string;
  isPublish: boolean;
}

interface ManagementListResponse {
  data: MangaListItem[];
  total: number;
  page: number;
  limit: number;
  stats: {
    total: number;
    pendingLicense: number;
    published: number;
    enforcementIssues: number;
  };
}

interface UserMini {
  _id: string;
  username: string;
  email?: string;
  avatar?: string;
}

interface TagMini {
  _id: string;
  name: string;
}

interface MangaDetail {
  id: string;
  title: string;
  summary: string;
  coverImage: string;
  author: UserMini | null;
  styles: TagMini[];
  genres: TagMini[];
  views: number;
  status: StoryStatus;
  chaptersCount: number;
  ratingSummary: {
    avgRating: number;
    count: number;
  };
  updatedAt: string;
  createdAt: string;

  licenseStatus: LicenseStatus;
  licenseFiles: string[];
  licenseNote: string;
  licenseSubmittedAt?: string | null;
  licenseReviewedAt?: string | null;
  licenseReviewedBy?: UserMini | null;
  licenseRejectReason: string;

  isPublish: boolean;
  publicationStatus: PublicationStatus;

  enforcementStatus: EnforcementStatus;
  enforcementReason: string;
  enforcementUpdatedAt?: string | null;
  enforcementUpdatedBy?: UserMini | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function MangaManagementPage() {
  const { toast } = useToast();

  const [mangaList, setMangaList] = useState<MangaListItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pendingLicense: 0,
    published: 0,
    enforcementIssues: 0,
  });
  const [total, setTotal] = useState(0);

  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [licenseFilter, setLicenseFilter] = useState<string>("all");
  const [publicationFilter, setPublicationFilter] = useState<string>("all");
  const [enforcementFilter, setEnforcementFilter] = useState<string>("all");
  const [authorFilter, setAuthorFilter] = useState<string>("all");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState("10");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedMangaId, setSelectedMangaId] = useState<string | null>(null);
  const [selectedManga, setSelectedManga] = useState<MangaDetail | null>(null);

  const [actionDialog, setActionDialog] = useState<ActionDialogType>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [enforcementReason, setEnforcementReason] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / Number(limit || 10)));

  const authorOptions = useMemo(() => {
    const map = new Map<string, string>();
    mangaList.forEach((item) => {
      if (item.authorId) {
        map.set(item.authorId, item.author);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [mangaList]);

  const getErrorMessage = (
    error: unknown,
    fallback = "Something went wrong"
  ) => {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data;
      if (Array.isArray(data?.message)) return data.message.join(", ");
      if (typeof data?.message === "string") return data.message;
    }
    return fallback;
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  };

  const truncateText = (text?: string | null, max = 60) => {
    if (!text) return "";
    if (text.length <= max) return text;
    return `${text.slice(0, max).trim()}...`;
  };

  const getLicenseStatusColor = (status: LicenseStatus) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPublicationStatusColor = (status: PublicationStatus) => {
    switch (status) {
      case "published":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "draft":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getEnforcementStatusColor = (status: EnforcementStatus) => {
    switch (status) {
      case "suspended":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "banned":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const getStoryStatusColor = (status: StoryStatus) => {
    switch (status) {
      case "ongoing":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "completed":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "hiatus":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const resolveFileUrl = (file: string) => {
    const normalized = file.replace(/\\/g, "/");
    if (normalized.startsWith("http")) return normalized;
    return `${API_URL}${
      normalized.startsWith("/") ? normalized : `/${normalized}`
    }`;
  };

  const resolveImageUrl = (file?: string | null) => {
    if (!file) return "";
    const normalized = file.replace(/\\/g, "/");
    if (normalized.startsWith("http")) return normalized;
    return `${API_URL}${
      normalized.startsWith("/") ? normalized : `/${normalized}`
    }`;
  };

  const fetchManagementList = useCallback(async () => {
    try {
      setLoadingList(true);

      const res = await axios.get<ManagementListResponse>(
        `${API_URL}/api/manga/admin/management`,
        {
          withCredentials: true,
          params: {
            q: searchQuery || undefined,
            licenseStatus: licenseFilter !== "all" ? licenseFilter : undefined,
            publicationStatus:
              publicationFilter !== "all" ? publicationFilter : undefined,
            enforcementStatus:
              enforcementFilter !== "all" ? enforcementFilter : undefined,
            authorId: authorFilter !== "all" ? authorFilter : undefined,
            page,
            limit: Number(limit),
          },
        }
      );

      setMangaList(res.data.data || []);
      setStats(
        res.data.stats || {
          total: 0,
          pendingLicense: 0,
          published: 0,
          enforcementIssues: 0,
        }
      );
      setTotal(res.data.total || 0);
    } catch (error) {
      toast({
        title: "Failed to load manga list",
        description: getErrorMessage(
          error,
          "Could not fetch manga management data."
        ),
        variant: "destructive",
      });
    } finally {
      setLoadingList(false);
    }
  }, [
    searchQuery,
    licenseFilter,
    publicationFilter,
    enforcementFilter,
    authorFilter,
    page,
    limit,
    toast,
  ]);

  const fetchManagementDetail = useCallback(
    async (mangaId: string) => {
      try {
        setLoadingDetail(true);

        const res = await axios.get<MangaDetail>(
          `${API_URL}/api/manga/admin/management/${mangaId}`,
          { withCredentials: true }
        );

        setSelectedManga(res.data);
      } catch (error) {
        toast({
          title: "Failed to load details",
          description: getErrorMessage(error, "Could not fetch manga detail."),
          variant: "destructive",
        });
      } finally {
        setLoadingDetail(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchManagementList();
  }, [fetchManagementList]);

  const openDetail = async (mangaId: string) => {
    setSelectedMangaId(mangaId);
    setSelectedManga(null);
    setDetailsOpen(true);
    await fetchManagementDetail(mangaId);
  };

  const closeActionDialog = () => {
    if (actionLoading) return;
    setActionDialog(null);
    setRejectReason("");
    setEnforcementReason("");
  };

  const refreshAfterMutation = async (mangaId: string) => {
    await Promise.all([fetchManagementList(), fetchManagementDetail(mangaId)]);
  };

  const handleConfirmAction = async () => {
    if (!selectedManga) return;

    try {
      setActionLoading(true);

      switch (actionDialog) {
        case "approve-license": {
          await axios.patch(
            `${API_URL}/api/manga/admin/license/${selectedManga.id}/review`,
            {
              status: "approved",
              publishAfterApprove: false,
            },
            { withCredentials: true }
          );

          toast({
            title: "License approved",
            description: "The license has been approved successfully.",
          });
          break;
        }

        case "reject-license": {
          if (!rejectReason.trim()) {
            toast({
              title: "Missing reason",
              description: "Please enter a reject reason.",
              variant: "destructive",
            });
            setActionLoading(false);
            return;
          }

          await axios.patch(
            `${API_URL}/api/manga/admin/license/${selectedManga.id}/review`,
            {
              status: "rejected",
              rejectReason: rejectReason.trim(),
            },
            { withCredentials: true }
          );

          toast({
            title: "License rejected",
            description: "The license review has been completed.",
          });
          break;
        }

        case "publish": {
          await axios.patch(
            `${API_URL}/api/manga/admin/story/${selectedManga.id}/publish`,
            { isPublish: true },
            { withCredentials: true }
          );

          toast({
            title: "Manga published",
            description: "This story is now visible on the platform.",
          });
          break;
        }

        case "unpublish": {
          await axios.patch(
            `${API_URL}/api/manga/admin/story/${selectedManga.id}/publish`,
            { isPublish: false },
            { withCredentials: true }
          );

          toast({
            title: "Manga unpublished",
            description: "This story has been hidden from public view.",
          });
          break;
        }

        case "suspend": {
          if (!enforcementReason.trim()) {
            toast({
              title: "Missing reason",
              description: "Please enter a suspension reason.",
              variant: "destructive",
            });
            setActionLoading(false);
            return;
          }

          await axios.patch(
            `${API_URL}/api/manga/admin/story/${selectedManga.id}/enforcement`,
            {
              status: "suspended",
              reason: enforcementReason.trim(),
            },
            { withCredentials: true }
          );

          toast({
            title: "Manga suspended",
            description: "The story has been suspended successfully.",
          });
          break;
        }

        case "ban": {
          if (!enforcementReason.trim()) {
            toast({
              title: "Missing reason",
              description: "Please enter a ban reason.",
              variant: "destructive",
            });
            setActionLoading(false);
            return;
          }

          await axios.patch(
            `${API_URL}/api/manga/admin/story/${selectedManga.id}/enforcement`,
            {
              status: "banned",
              reason: enforcementReason.trim(),
            },
            { withCredentials: true }
          );

          toast({
            title: "Manga banned",
            description: "The story has been banned successfully.",
            variant: "destructive",
          });
          break;
        }

        case "clear-enforcement": {
          await axios.patch(
            `${API_URL}/api/manga/admin/story/${selectedManga.id}/enforcement`,
            {
              status: "normal",
            },
            { withCredentials: true }
          );

          toast({
            title: "Restriction removed",
            description: "The story has returned to normal status.",
          });
          break;
        }

        default:
          return;
      }

      await refreshAfterMutation(selectedManga.id);
      closeActionDialog();
    } catch (error) {
      toast({
        title: "Action failed",
        description: getErrorMessage(
          error,
          "The action could not be completed."
        ),
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const canPublish =
    selectedManga?.licenseStatus === "approved" &&
    selectedManga?.enforcementStatus === "normal";

  const dialogStoryTitle = truncateText(selectedManga?.title, 55);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Manga Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage story licenses, publication, and enforcement across the
              platform.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Manga
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pending License Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pendingLicense}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Published Manga
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.published}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Suspended / Banned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.enforcementIssues}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
            <CardDescription>
              Filter stories by title, author, license, publication, and
              enforcement state.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 flex-col lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by title or author..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setLicenseFilter("all");
                  setPublicationFilter("all");
                  setEnforcementFilter("all");
                  setAuthorFilter("all");
                  setPage(1);
                  setLimit("10");
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              <Select
                value={licenseFilter}
                onValueChange={(value) => {
                  setLicenseFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="License Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All License</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={publicationFilter}
                onValueChange={(value) => {
                  setPublicationFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Publication Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Publication</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="unpublished">Unpublished</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={enforcementFilter}
                onValueChange={(value) => {
                  setEnforcementFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Enforcement Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Enforcement</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="banned">Banned</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={authorFilter}
                onValueChange={(value) => {
                  setAuthorFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Author" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Authors</SelectItem>
                  {authorOptions.map((author) => (
                    <SelectItem key={author.id} value={author.id}>
                      {author.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={limit}
                onValueChange={(value) => {
                  setLimit(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Rows per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>List of Manga ({total})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[380px]">Title</TableHead>
                  <TableHead className="w-[160px]">Author</TableHead>
                  <TableHead className="w-[110px]">License</TableHead>
                  <TableHead className="w-[120px]">Publication</TableHead>
                  <TableHead className="w-[120px]">Enforcement</TableHead>
                  <TableHead className="w-[90px] text-right">
                    Chapters
                  </TableHead>
                  <TableHead className="w-[110px]">Updated</TableHead>
                  <TableHead className="w-[100px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loadingList ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-10 text-gray-500"
                    >
                      <div className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading manga management data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : mangaList.length > 0 ? (
                  mangaList.map((manga) => (
                    <TableRow key={manga.id}>
                      <TableCell className="w-[380px] max-w-[380px] overflow-hidden">
                        <div className="flex items-start gap-3 w-full overflow-hidden">
                          <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md border bg-gray-100">
                            {manga.coverImage ? (
                              <img
                                src={resolveImageUrl(manga.coverImage)}
                                alt={manga.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[10px] text-gray-400">
                                N/A
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p
                              className="font-medium text-gray-900 truncate"
                              title={manga.title}
                            >
                              {manga.title}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-gray-600">
                        <p className="truncate" title={manga.author}>
                          {manga.author}
                        </p>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getLicenseStatusColor(
                            manga.licenseStatus
                          )}
                        >
                          {manga.licenseStatus}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getPublicationStatusColor(
                            manga.publicationStatus
                          )}
                        >
                          {manga.publicationStatus}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getEnforcementStatusColor(
                            manga.enforcementStatus
                          )}
                        >
                          {manga.enforcementStatus}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        {manga.chaptersCount}
                      </TableCell>

                      <TableCell className="text-gray-600">
                        {formatDate(manga.updatedAt)}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetail(manga.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-10 text-gray-500"
                    >
                      No manga found matching your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={page <= 1 || loadingList}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= totalPages || loadingList}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Sheet
          open={detailsOpen}
          onOpenChange={(open) => {
            setDetailsOpen(open);
            if (!open) {
              setSelectedManga(null);
              setSelectedMangaId(null);
            }
          }}
        >
          <SheetContent className="w-screen max-w-none overflow-y-auto border-l bg-slate-50 p-0 sm:max-w-[92vw] xl:max-w-[86vw] 2xl:max-w-[80vw]">
            <SheetHeader className="sr-only">
              <SheetTitle>
                {selectedManga?.title || "Manga detail workspace"}
              </SheetTitle>
              <SheetDescription>
                Review manga overview, license, publication, and enforcement.
              </SheetDescription>
            </SheetHeader>

            {loadingDetail ? (
              <div className="min-h-full bg-slate-50">
                <div className="grid min-h-full lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
                  <aside className="border-b bg-white lg:border-b-0 lg:border-r">
                    <div className="space-y-6 p-6 xl:p-8 animate-pulse">
                      <div className="h-6 w-40 rounded-full bg-slate-200" />
                      <div className="aspect-[3/4] rounded-2xl bg-slate-200" />
                      <div className="space-y-3">
                        <div className="h-8 w-3/4 rounded-md bg-slate-200" />
                        <div className="h-5 w-1/2 rounded-md bg-slate-200" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <div className="h-7 w-24 rounded-full bg-slate-200" />
                        <div className="h-7 w-28 rounded-full bg-slate-200" />
                        <div className="h-7 w-24 rounded-full bg-slate-200" />
                      </div>
                      <div className="h-40 rounded-2xl bg-slate-100" />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="h-24 rounded-2xl bg-slate-100" />
                        <div className="h-24 rounded-2xl bg-slate-100" />
                      </div>
                    </div>
                  </aside>

                  <section className="min-w-0 animate-pulse">
                    <div className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 px-6 py-4 backdrop-blur xl:px-8">
                      <div className="mb-3 h-6 w-40 rounded-md bg-slate-200" />
                      <div className="h-14 rounded-2xl bg-white" />
                    </div>

                    <div className="space-y-6 p-6 xl:p-8">
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, idx) => (
                          <div
                            key={idx}
                            className="h-36 rounded-2xl bg-white shadow-sm"
                          />
                        ))}
                      </div>

                      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                        <div className="h-72 rounded-2xl bg-white shadow-sm" />
                        <div className="h-72 rounded-2xl bg-white shadow-sm" />
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            ) : selectedManga ? (
              <div className="min-h-full bg-slate-50">
                <div className="grid min-h-full lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
                  <aside className="border-b bg-white lg:border-b-0 lg:border-r">
                    <div className="lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
                      <div className="space-y-6 p-6 xl:p-8">
                        <div className="space-y-4">
                          <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                            Manga Detail Workspace
                          </div>

                          <div className="overflow-hidden rounded-2xl border bg-slate-100 shadow-sm">
                            <div className="aspect-[3/4]">
                              {selectedManga.coverImage ? (
                                <img
                                  src={resolveImageUrl(selectedManga.coverImage)}
                                  alt={selectedManga.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                                  No cover
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <h2 className="text-2xl font-bold leading-tight text-slate-900 break-words">
                              {selectedManga.title}
                            </h2>

                            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700">
                              <User2 className="h-4 w-4 text-slate-500" />
                              {selectedManga.author?.username || "Unknown author"}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant="outline"
                            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${getLicenseStatusColor(
                              selectedManga.licenseStatus
                            )}`}
                          >
                            License: {selectedManga.licenseStatus}
                          </Badge>

                          <Badge
                            variant="outline"
                            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${getPublicationStatusColor(
                              selectedManga.publicationStatus
                            )}`}
                          >
                            Publication: {selectedManga.publicationStatus}
                          </Badge>

                          <Badge
                            variant="outline"
                            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${getEnforcementStatusColor(
                              selectedManga.enforcementStatus
                            )}`}
                          >
                            Enforcement: {selectedManga.enforcementStatus}
                          </Badge>
                        </div>

                        <Card className="rounded-2xl border-slate-200 shadow-sm">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                              <MessageSquareText className="h-4 w-4 text-slate-500" />
                              Summary Preview
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm leading-7 text-slate-700">
                              {selectedManga.summary
                                ? truncateText(selectedManga.summary, 220)
                                : "No summary provided for this story."}
                            </p>
                          </CardContent>
                        </Card>

                        <div className="grid grid-cols-2 gap-3">
                          <Card className="rounded-2xl border-slate-200 shadow-sm">
                            <CardContent className="p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Chapters
                              </p>
                              <p className="mt-2 text-xl font-bold text-slate-900">
                                {selectedManga.chaptersCount}
                              </p>
                            </CardContent>
                          </Card>

                          <Card className="rounded-2xl border-slate-200 shadow-sm">
                            <CardContent className="p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Updated
                              </p>
                              <p className="mt-2 text-sm font-semibold text-slate-900">
                                {formatDate(selectedManga.updatedAt)}
                              </p>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </div>
                  </aside>

                  <section className="min-w-0">
                    <Tabs defaultValue="overview" className="min-h-full">
                      <div className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 px-6 py-4 backdrop-blur xl:px-8">
                        <div className="mb-3">
                          <h3 className="text-lg font-semibold text-slate-900">
                            Workspace
                          </h3>
                          <p className="text-sm text-slate-500">
                            Manage overview, license, and enforcement in one
                            place.
                          </p>
                        </div>

                        <TabsList className="grid h-14 w-full grid-cols-3 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                          <TabsTrigger
                            value="overview"
                            className="rounded-xl text-sm font-medium"
                          >
                            Overview
                          </TabsTrigger>
                          <TabsTrigger
                            value="license"
                            className="rounded-xl text-sm font-medium"
                          >
                            License
                          </TabsTrigger>
                          <TabsTrigger
                            value="enforcement"
                            className="rounded-xl text-sm font-medium"
                          >
                            Enforcement
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <div className="space-y-6 p-6 xl:p-8">
                        <TabsContent value="overview" className="mt-0 space-y-6">
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <Card className="rounded-2xl border-slate-200 shadow-sm">
                              <CardContent className="flex min-h-[140px] items-start gap-3 p-6">
                                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                                  <BookOpen className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Story Status
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className={`mt-3 capitalize ${getStoryStatusColor(
                                      selectedManga.status
                                    )}`}
                                  >
                                    {selectedManga.status}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="rounded-2xl border-slate-200 shadow-sm">
                              <CardContent className="flex min-h-[140px] items-start gap-3 p-6">
                                <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
                                  <Star className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Avg Rating
                                  </p>
                                  <p className="mt-3 text-3xl font-bold text-slate-900">
                                    {selectedManga.ratingSummary?.avgRating?.toFixed?.(
                                      1
                                    ) || "0.0"}
                                  </p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    {selectedManga.ratingSummary?.count || 0}{" "}
                                    ratings
                                  </p>
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="rounded-2xl border-slate-200 shadow-sm">
                              <CardContent className="flex min-h-[140px] items-start gap-3 p-6">
                                <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                                  <CalendarDays className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Created At
                                  </p>
                                  <p className="mt-3 text-2xl font-bold text-slate-900">
                                    {formatDate(selectedManga.createdAt)}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="rounded-2xl border-slate-200 shadow-sm">
                              <CardContent className="flex min-h-[140px] items-start gap-3 p-6">
                                <div className="rounded-xl bg-cyan-50 p-2 text-cyan-600">
                                  <Eye className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Views
                                  </p>
                                  <p className="mt-3 text-3xl font-bold text-slate-900">
                                    {selectedManga.views.toLocaleString()}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="rounded-2xl border-slate-200 shadow-sm">
                              <CardContent className="flex min-h-[140px] items-start gap-3 p-6">
                                <div className="rounded-xl bg-violet-50 p-2 text-violet-600">
                                  <FileText className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Chapters
                                  </p>
                                  <p className="mt-3 text-3xl font-bold text-slate-900">
                                    {selectedManga.chaptersCount}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="rounded-2xl border-slate-200 shadow-sm">
                              <CardContent className="flex min-h-[140px] items-start gap-3 p-6">
                                <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
                                  <CalendarDays className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Updated At
                                  </p>
                                  <p className="mt-3 text-2xl font-bold text-slate-900">
                                    {formatDate(selectedManga.updatedAt)}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
                            <div className="space-y-4">
                              <Card className="rounded-2xl border-slate-200 shadow-sm">
                                <CardHeader className="pb-4">
                                  <CardTitle className="flex items-center gap-2 text-lg">
                                    <MessageSquareText className="h-5 w-5 text-slate-500" />
                                    Story Summary
                                  </CardTitle>
                                  <CardDescription className="text-sm">
                                    Main description shown for internal review.
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="min-h-[220px] p-6 pt-0">
                                  <p className="text-sm leading-7 text-slate-700 break-words">
                                    {selectedManga.summary ||
                                      "No summary provided."}
                                  </p>
                                </CardContent>
                              </Card>

                              <Card className="rounded-2xl border-slate-200 shadow-sm">
                                <CardHeader className="pb-4">
                                  <CardTitle className="flex items-center gap-2 text-lg">
                                    <Tags className="h-5 w-5 text-slate-500" />
                                    Classification
                                  </CardTitle>
                                  <CardDescription className="text-sm">
                                    Genres and styles associated with this story.
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6 p-6 pt-0 min-h-[220px]">
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Genres
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {selectedManga.genres?.length ? (
                                        selectedManga.genres.map((genre) => (
                                          <Badge
                                            key={genre._id}
                                            variant="secondary"
                                            className="rounded-full px-3 py-1"
                                          >
                                            {genre.name}
                                          </Badge>
                                        ))
                                      ) : (
                                        <span className="text-sm text-slate-500">
                                          No genres assigned
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Styles
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {selectedManga.styles?.length ? (
                                        selectedManga.styles.map((style) => (
                                          <Badge
                                            key={style._id}
                                            variant="secondary"
                                            className="rounded-full px-3 py-1"
                                          >
                                            {style.name}
                                          </Badge>
                                        ))
                                      ) : (
                                        <span className="text-sm text-slate-500">
                                          No styles assigned
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>

                            <div className="space-y-4">
                              <Card className="rounded-2xl border-slate-200 shadow-sm">
                                <CardHeader className="pb-4">
                                  <CardTitle className="flex items-center gap-2 text-lg">
                                    <Eye className="h-5 w-5 text-slate-500" />
                                    Publication Control
                                  </CardTitle>
                                  <CardDescription className="text-sm">
                                    Control public visibility of this story.
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 p-6 pt-0 min-h-[220px]">
                                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Current Publication Status
                                    </p>
                                    <Badge
                                      variant="outline"
                                      className={`mt-3 capitalize ${getPublicationStatusColor(
                                        selectedManga.publicationStatus
                                      )}`}
                                    >
                                      {selectedManga.publicationStatus}
                                    </Badge>
                                  </div>

                                  {selectedManga.publicationStatus ===
                                  "published" ? (
                                    <Button
                                      variant="outline"
                                      className="w-full"
                                      onClick={() =>
                                        setActionDialog("unpublish")
                                      }
                                    >
                                      <EyeOff className="mr-2 h-4 w-4" />
                                      Unpublish Manga
                                    </Button>
                                  ) : (
                                    <div className="space-y-2">
                                      <Button
                                        className="w-full"
                                        disabled={!canPublish}
                                        onClick={() =>
                                          setActionDialog("publish")
                                        }
                                      >
                                        <Eye className="mr-2 h-4 w-4" />
                                        Publish Manga
                                      </Button>
                                      {!canPublish && (
                                        <p className="text-xs leading-5 text-amber-700">
                                          Publishing requires an approved
                                          license and normal enforcement status.
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>

                              <Card className="rounded-2xl border-slate-200 shadow-sm">
                                <CardHeader className="pb-4">
                                  <CardTitle className="flex items-center gap-2 text-lg">
                                    <ShieldCheck className="h-5 w-5 text-slate-500" />
                                    Operational Snapshot
                                  </CardTitle>
                                  <CardDescription className="text-sm">
                                    Key operational fields for quick review.
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 p-6 pt-0 min-h-[220px]">
                                  <div className="grid gap-3">
                                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        License
                                      </p>
                                      <Badge
                                        variant="outline"
                                        className={`mt-2 capitalize ${getLicenseStatusColor(
                                          selectedManga.licenseStatus
                                        )}`}
                                      >
                                        {selectedManga.licenseStatus}
                                      </Badge>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Enforcement
                                      </p>
                                      <Badge
                                        variant="outline"
                                        className={`mt-2 capitalize ${getEnforcementStatusColor(
                                          selectedManga.enforcementStatus
                                        )}`}
                                      >
                                        {selectedManga.enforcementStatus}
                                      </Badge>
                                    </div>

                                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Last Updated
                                      </p>
                                      <p className="mt-2 text-sm font-semibold text-slate-900">
                                        {formatDate(selectedManga.updatedAt)}
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="license" className="mt-0 space-y-4">
                          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                            <Card className="rounded-2xl border-slate-200 shadow-sm">
                              <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                  <BadgeCheck className="h-5 w-5 text-slate-500" />
                                  Review Status
                                </CardTitle>
                                <CardDescription className="text-sm">
                                  Approval state and audit information for the
                                  license submission.
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-4 p-6 pt-0 min-h-[220px]">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    License Status
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className={`mt-3 capitalize ${getLicenseStatusColor(
                                      selectedManga.licenseStatus
                                    )}`}
                                  >
                                    {selectedManga.licenseStatus}
                                  </Badge>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Submitted At
                                    </p>
                                    <p className="mt-2 text-sm font-semibold text-slate-900">
                                      {formatDate(
                                        selectedManga.licenseSubmittedAt
                                      )}
                                    </p>
                                  </div>

                                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Reviewed At
                                    </p>
                                    <p className="mt-2 text-sm font-semibold text-slate-900">
                                      {formatDate(
                                        selectedManga.licenseReviewedAt
                                      )}
                                    </p>
                                  </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Reviewed By
                                  </p>
                                  <p className="mt-2 text-sm font-semibold text-slate-900">
                                    {selectedManga.licenseReviewedBy?.username ||
                                      "—"}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="rounded-2xl border-slate-200 shadow-sm">
                              <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                  <FileText className="h-5 w-5 text-slate-500" />
                                  License Note
                                </CardTitle>
                                <CardDescription className="text-sm">
                                  Supporting note provided with the license
                                  submission.
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="p-6 pt-0 min-h-[220px]">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                  <p className="text-sm leading-7 text-slate-700 break-words">
                                    {selectedManga.licenseNote ||
                                      "No note provided."}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          <Card className="rounded-2xl border-slate-200 shadow-sm">
                            <CardHeader className="pb-4">
                              <CardTitle className="flex items-center gap-2 text-lg">
                                <FileText className="h-5 w-5 text-slate-500" />
                                License Files
                              </CardTitle>
                              <CardDescription className="text-sm">
                                Uploaded documents attached to this license
                                review.
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 pt-0">
                              {selectedManga.licenseFiles?.length ? (
                                <div className="space-y-3">
                                  {selectedManga.licenseFiles.map(
                                    (file, index) => {
                                      const fileName =
                                        file.split("/").pop() ||
                                        `license-file-${index + 1}`;

                                      return (
                                        <a
                                          key={`${file}-${index}`}
                                          href={resolveFileUrl(file)}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 transition hover:border-slate-300 hover:bg-slate-50"
                                        >
                                          <div className="flex min-w-0 items-center gap-3">
                                            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                                              <FileText className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                              <p className="truncate text-sm font-medium text-slate-900">
                                                {fileName}
                                              </p>
                                              <p className="truncate text-xs text-slate-500">
                                                Open attached license document
                                              </p>
                                            </div>
                                          </div>

                                          <ExternalLink className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-slate-700" />
                                        </a>
                                      );
                                    }
                                  )}
                                </div>
                              ) : (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                                  <FileText className="mx-auto h-8 w-8 text-slate-400" />
                                  <p className="mt-3 text-sm font-medium text-slate-700">
                                    No files uploaded
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    This submission does not contain any license
                                    attachments.
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          {selectedManga.licenseRejectReason && (
                            <Card className="rounded-2xl border-red-200 bg-red-50 shadow-sm">
                              <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg text-red-700">
                                  <AlertTriangle className="h-5 w-5" />
                                  Reject Reason
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-6 pt-0">
                                <p className="text-sm leading-7 text-red-700 break-words">
                                  {selectedManga.licenseRejectReason}
                                </p>
                              </CardContent>
                            </Card>
                          )}

                          {selectedManga.licenseStatus === "pending" && (
                            <Card className="rounded-2xl border-slate-200 shadow-sm">
                              <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                  <FileCheck className="h-5 w-5 text-slate-500" />
                                  Review Actions
                                </CardTitle>
                                <CardDescription className="text-sm">
                                  Choose how to proceed with this pending
                                  license.
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-3 p-6 pt-0">
                                <Button
                                  className="w-full"
                                  onClick={() =>
                                    setActionDialog("approve-license")
                                  }
                                >
                                  <FileCheck className="mr-2 h-4 w-4" />
                                  Approve License
                                </Button>

                                <Button
                                  variant="outline"
                                  className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  onClick={() =>
                                    setActionDialog("reject-license")
                                  }
                                >
                                  Reject License
                                </Button>
                              </CardContent>
                            </Card>
                          )}
                        </TabsContent>

                        <TabsContent
                          value="enforcement"
                          className="mt-0 space-y-4"
                        >
                          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                            <Card className="rounded-2xl border-slate-200 shadow-sm">
                              <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                  <ShieldCheck className="h-5 w-5 text-slate-500" />
                                  Current Enforcement Status
                                </CardTitle>
                                <CardDescription className="text-sm">
                                  Current moderation outcome for this story.
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-4 p-6 pt-0 min-h-[220px]">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Status
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className={`mt-3 capitalize ${getEnforcementStatusColor(
                                      selectedManga.enforcementStatus
                                    )}`}
                                  >
                                    {selectedManga.enforcementStatus}
                                  </Badge>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Reason
                                  </p>
                                  <p className="mt-2 text-sm leading-7 text-slate-700 break-words">
                                    {selectedManga.enforcementReason ||
                                      "No enforcement reason recorded."}
                                  </p>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Updated By
                                    </p>
                                    <p className="mt-2 text-sm font-semibold text-slate-900">
                                      {selectedManga.enforcementUpdatedBy
                                        ?.username || "—"}
                                    </p>
                                  </div>

                                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Updated At
                                    </p>
                                    <p className="mt-2 text-sm font-semibold text-slate-900">
                                      {formatDate(
                                        selectedManga.enforcementUpdatedAt
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="rounded-2xl border-slate-200 shadow-sm">
                              <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                  <ShieldAlert className="h-5 w-5 text-slate-500" />
                                  Moderation Actions
                                </CardTitle>
                                <CardDescription className="text-sm">
                                  Apply temporary or permanent moderation
                                  actions.
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-4 p-6 pt-0 min-h-[220px]">
                                {selectedManga.enforcementStatus ===
                                "normal" ? (
                                  <>
                                    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                                      <p className="text-sm font-semibold text-orange-800">
                                        Temporary restriction
                                      </p>
                                      <p className="mt-1 text-xs leading-5 text-orange-700">
                                        Suspend the story when access should be
                                        limited while the issue is being
                                        reviewed.
                                      </p>
                                      <Button
                                        variant="outline"
                                        className="mt-4 w-full border-orange-200 text-orange-700 hover:bg-orange-100"
                                        onClick={() =>
                                          setActionDialog("suspend")
                                        }
                                      >
                                        <Zap className="mr-2 h-4 w-4" />
                                        Suspend Manga
                                      </Button>
                                    </div>

                                    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                                      <p className="text-sm font-semibold text-red-800">
                                        Permanent restriction
                                      </p>
                                      <p className="mt-1 text-xs leading-5 text-red-700">
                                        Ban the story when it must be fully
                                        blocked from the platform.
                                      </p>
                                      <Button
                                        variant="destructive"
                                        className="mt-4 w-full"
                                        onClick={() => setActionDialog("ban")}
                                      >
                                        <ShieldAlert className="mr-2 h-4 w-4" />
                                        Ban Manga
                                      </Button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                    <p className="text-sm font-semibold text-emerald-800">
                                      Restore normal access
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-emerald-700">
                                      Remove the active restriction and return
                                      this story to normal status.
                                    </p>
                                    <Button
                                      className="mt-4 w-full"
                                      onClick={() =>
                                        setActionDialog("clear-enforcement")
                                      }
                                    >
                                      Remove Restriction
                                    </Button>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>
                        </TabsContent>
                      </div>
                    </Tabs>
                  </section>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[60vh] items-center justify-center px-6 text-center">
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 shadow-sm">
                  <BookOpen className="mx-auto h-10 w-10 text-slate-400" />
                  <p className="mt-4 text-base font-semibold text-slate-900">
                    No manga detail available
                  </p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Select a story from the table to review its overview,
                    license information, publication visibility, and enforcement
                    status.
                  </p>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        <Dialog
          open={!!actionDialog}
          onOpenChange={(open) => !open && closeActionDialog()}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionDialog === "approve-license" && "Approve License"}
                {actionDialog === "reject-license" && "Reject License"}
                {actionDialog === "publish" && "Publish Manga"}
                {actionDialog === "unpublish" && "Unpublish Manga"}
                {actionDialog === "suspend" && "Suspend Manga"}
                {actionDialog === "ban" && "Ban Manga"}
                {actionDialog === "clear-enforcement" && "Remove Restriction"}
              </DialogTitle>

              <DialogDescription>
                {actionDialog === "approve-license" &&
                  `Approve the license for "${dialogStoryTitle}"?`}
                {actionDialog === "reject-license" &&
                  `Reject the license for "${dialogStoryTitle}"?`}
                {actionDialog === "publish" &&
                  `This will make "${dialogStoryTitle}" visible to users.`}
                {actionDialog === "unpublish" &&
                  `This will hide "${dialogStoryTitle}" from public view.`}
                {actionDialog === "suspend" &&
                  `Suspending "${dialogStoryTitle}" will remove it from normal access temporarily.`}
                {actionDialog === "ban" &&
                  `Banning "${dialogStoryTitle}" will block it from the platform.`}
                {actionDialog === "clear-enforcement" &&
                  `Remove the current restriction from "${dialogStoryTitle}"?`}
              </DialogDescription>
            </DialogHeader>

            {actionDialog === "reject-license" && (
              <div className="space-y-2">
                <Label htmlFor="rejectReason">Reject reason</Label>
                <Textarea
                  id="rejectReason"
                  placeholder="Enter reason for rejection..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
            )}

            {(actionDialog === "suspend" || actionDialog === "ban") && (
              <div className="space-y-2">
                <Label htmlFor="enforcementReason">
                  {actionDialog === "suspend"
                    ? "Suspension reason"
                    : "Ban reason"}
                </Label>
                <Textarea
                  id="enforcementReason"
                  placeholder="Enter reason..."
                  value={enforcementReason}
                  onChange={(e) => setEnforcementReason(e.target.value)}
                />
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={closeActionDialog}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant={actionDialog === "ban" ? "destructive" : "default"}
                onClick={handleConfirmAction}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {actionDialog === "approve-license" && "Approve"}
                    {actionDialog === "reject-license" && "Reject"}
                    {actionDialog === "publish" && "Publish"}
                    {actionDialog === "unpublish" && "Unpublish"}
                    {actionDialog === "suspend" && "Suspend"}
                    {actionDialog === "ban" && "Ban"}
                    {actionDialog === "clear-enforcement" && "Confirm"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}