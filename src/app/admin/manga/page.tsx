"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Download,
  Eye,
  EyeOff,
  FileCheck,
  Loader2,
  RotateCcw,
  Search,
  ShieldAlert,
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

  const fetchManagementList = useCallback(async () => {
    try {
      setLoadingList(true);

      const res = await axios.get<ManagementListResponse>(
        `${API_URL}/api/manga/admin/management`,
        {
          withCredentials: true,
          params: {
            q: searchQuery || undefined,
            licenseStatus:
              licenseFilter !== "all" ? licenseFilter : undefined,
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
                                src={manga.coverImage}
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
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            {loadingDetail ? (
              <div className="py-12 flex items-center justify-center">
                <div className="inline-flex items-center gap-2 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading detail...
                </div>
              </div>
            ) : selectedManga ? (
              <>
                <SheetHeader className="pr-8">
                  <SheetTitle
                    className="text-left leading-tight break-words line-clamp-2"
                    title={selectedManga.title}
                  >
                    {selectedManga.title}
                  </SheetTitle>
                  <SheetDescription className="text-left">
                    Author: {selectedManga.author?.username || "Unknown"}
                  </SheetDescription>
                </SheetHeader>

                <Tabs defaultValue="overview" className="mt-6 space-y-4">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="license">License</TabsTrigger>
                    <TabsTrigger value="publication">Publication</TabsTrigger>
                    <TabsTrigger value="enforcement">Enforcement</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-[140px_1fr]">
                      <div className="aspect-[3/4] overflow-hidden rounded-lg border bg-gray-100">
                        {selectedManga.coverImage ? (
                          <img
                            src={selectedManga.coverImage}
                            alt={selectedManga.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-sm text-gray-400">
                            No cover
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-semibold uppercase text-gray-500">
                            Summary
                          </p>
                          <p className="mt-1 text-sm text-gray-700 break-words">
                            {selectedManga.summary || "No summary"}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t pt-4">
                          <div>
                            <p className="text-xs font-semibold uppercase text-gray-500">
                              Story Status
                            </p>
                            <Badge className="mt-1 capitalize">
                              {selectedManga.status}
                            </Badge>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase text-gray-500">
                              Views
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                              {selectedManga.views.toLocaleString()}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase text-gray-500">
                              Chapters
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                              {selectedManga.chaptersCount}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase text-gray-500">
                              Updated At
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                              {formatDate(selectedManga.updatedAt)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase text-gray-500">
                              Avg Rating
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                              {selectedManga.ratingSummary?.avgRating?.toFixed?.(
                                1
                              ) || "0.0"}{" "}
                              ({selectedManga.ratingSummary?.count || 0})
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase text-gray-500">
                              Created At
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                              {formatDate(selectedManga.createdAt)}
                            </p>
                          </div>
                        </div>

                        <div className="border-t pt-4 space-y-3">
                          <div>
                            <p className="text-xs font-semibold uppercase text-gray-500">
                              Genres
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {selectedManga.genres?.length ? (
                                selectedManga.genres.map((genre) => (
                                  <Badge key={genre._id} variant="secondary">
                                    {genre.name}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-sm text-gray-500">
                                  No genres
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase text-gray-500">
                              Styles
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {selectedManga.styles?.length ? (
                                selectedManga.styles.map((style) => (
                                  <Badge key={style._id} variant="secondary">
                                    {style.name}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-sm text-gray-500">
                                  No styles
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="license" className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          License Status
                        </p>
                        <Badge
                          variant="outline"
                          className={`mt-1 ${getLicenseStatusColor(
                            selectedManga.licenseStatus
                          )}`}
                        >
                          {selectedManga.licenseStatus}
                        </Badge>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          Submitted At
                        </p>
                        <p className="mt-1 text-sm">
                          {formatDate(selectedManga.licenseSubmittedAt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          License Note
                        </p>
                        <p className="mt-1 text-sm text-gray-700 break-words">
                          {selectedManga.licenseNote || "No note provided"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          License Files
                        </p>
                        <div className="mt-2 space-y-2">
                          {selectedManga.licenseFiles?.length ? (
                            selectedManga.licenseFiles.map((file, index) => (
                              <a
                                key={`${file}-${index}`}
                                href={
                                  file.startsWith("http")
                                    ? file
                                    : `${API_URL}${
                                        file.startsWith("/") ? file : `/${file}`
                                      }`
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="block text-sm text-blue-600 hover:underline break-all"
                              >
                                {file.split("/").pop()}
                              </a>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">
                              No files uploaded
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase text-gray-500">
                            Reviewed By
                          </p>
                          <p className="mt-1 text-sm">
                            {selectedManga.licenseReviewedBy?.username || "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase text-gray-500">
                            Reviewed At
                          </p>
                          <p className="mt-1 text-sm">
                            {formatDate(selectedManga.licenseReviewedAt)}
                          </p>
                        </div>
                      </div>

                      {selectedManga.licenseRejectReason && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                          <p className="text-xs font-semibold uppercase text-red-600">
                            Reject Reason
                          </p>
                          <p className="mt-1 text-sm text-red-700 break-words">
                            {selectedManga.licenseRejectReason}
                          </p>
                        </div>
                      )}

                      {selectedManga.licenseStatus === "pending" && (
                        <div className="space-y-2 border-t pt-4">
                          <Button
                            className="w-full"
                            onClick={() => setActionDialog("approve-license")}
                          >
                            <FileCheck className="h-4 w-4 mr-2" />
                            Approve License
                          </Button>

                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setActionDialog("reject-license")}
                          >
                            Reject License
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="publication" className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          Current State
                        </p>
                        <Badge
                          variant="outline"
                          className={`mt-1 ${getPublicationStatusColor(
                            selectedManga.publicationStatus
                          )}`}
                        >
                          {selectedManga.publicationStatus}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          Publish Rules
                        </p>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li>
                            License must be <strong>approved</strong>.
                          </li>
                          <li>
                            Enforcement must be <strong>normal</strong>.
                          </li>
                        </ul>
                      </div>

                      {!canPublish && !selectedManga.isPublish && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                          <p className="text-sm text-amber-800">
                            This story cannot be published yet because the
                            license is not approved or the story is currently
                            suspended/banned.
                          </p>
                        </div>
                      )}

                      <div className="space-y-2 border-t pt-4">
                        {!selectedManga.isPublish ? (
                          <Button
                            className="w-full"
                            disabled={!canPublish}
                            onClick={() => setActionDialog("publish")}
                          >
                            Publish
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setActionDialog("unpublish")}
                          >
                            <EyeOff className="h-4 w-4 mr-2" />
                            Unpublish
                          </Button>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="enforcement" className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          Current Status
                        </p>
                        <Badge
                          variant="outline"
                          className={`mt-1 ${getEnforcementStatusColor(
                            selectedManga.enforcementStatus
                          )}`}
                        >
                          {selectedManga.enforcementStatus}
                        </Badge>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          Reason
                        </p>
                        <p className="mt-1 text-sm text-gray-700 break-words">
                          {selectedManga.enforcementReason ||
                            "No enforcement reason"}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase text-gray-500">
                            Updated By
                          </p>
                          <p className="mt-1 text-sm">
                            {selectedManga.enforcementUpdatedBy?.username ||
                              "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase text-gray-500">
                            Updated At
                          </p>
                          <p className="mt-1 text-sm">
                            {formatDate(selectedManga.enforcementUpdatedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 border-t pt-4">
                        {selectedManga.enforcementStatus === "normal" ? (
                          <>
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => setActionDialog("suspend")}
                            >
                              <Zap className="h-4 w-4 mr-2" />
                              Suspend
                            </Button>

                            <Button
                              variant="destructive"
                              className="w-full"
                              onClick={() => setActionDialog("ban")}
                            >
                              <ShieldAlert className="h-4 w-4 mr-2" />
                              Ban Manga
                            </Button>
                          </>
                        ) : (
                          <Button
                            className="w-full"
                            onClick={() =>
                              setActionDialog("clear-enforcement")
                            }
                          >
                            Remove Restriction
                          </Button>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <div className="py-12 text-center text-gray-500">No data</div>
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