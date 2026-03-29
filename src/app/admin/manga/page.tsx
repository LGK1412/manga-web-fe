"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BadgeCheck,
  BookOpen,
  CalendarDays,
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
import type { LucideIcon } from "lucide-react";

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
import {
  getLatestRejectReason,
  normalizeRejectReasonHistory,
} from "@/lib/story-rights";

type LicenseStatus = "none" | "pending" | "approved" | "rejected";
type PublicationStatus = "draft" | "published" | "unpublished";
type EnforcementStatus = "normal" | "suspended" | "banned";
type StoryStatus = "ongoing" | "completed" | "hiatus";
type DetailTab = "overview" | "enforcement";
type SortField =
  | "title"
  | "licenseStatus"
  | "publicationStatus"
  | "enforcementStatus"
  | "chaptersCount"
  | "updatedAt";
type SortOrder = "asc" | "desc";
type QuickFilterKey =
  | "all"
  | "pendingLicense"
  | "published"
  | "suspended"
  | "banned";

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
  licenseRejectReasons?: string[];

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
  const [sortBy, setSortBy] = useState<SortField>("updatedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState("10");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedMangaId, setSelectedMangaId] = useState<string | null>(null);
  const [selectedManga, setSelectedManga] = useState<MangaDetail | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");

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

  const getReviewLaneLabel = (manga: {
    licenseStatus: LicenseStatus;
    publicationStatus: PublicationStatus;
    enforcementStatus: EnforcementStatus;
  }) => {
    if (manga.enforcementStatus !== "normal") return "Enforcement follow-up";
    if (manga.licenseStatus === "pending") return "License review";
    if (
      manga.publicationStatus !== "published" &&
      manga.licenseStatus === "approved"
    ) {
      return "Publish ready";
    }
    if (manga.publicationStatus === "published") return "Live on platform";
    return "Catalog draft";
  };

  const getReviewLaneColor = (manga: {
    licenseStatus: LicenseStatus;
    publicationStatus: PublicationStatus;
    enforcementStatus: EnforcementStatus;
  }) => {
    if (manga.enforcementStatus !== "normal") {
      return "border-red-200 bg-red-50 text-red-700";
    }
    if (manga.licenseStatus === "pending") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }
    if (
      manga.publicationStatus !== "published" &&
      manga.licenseStatus === "approved"
    ) {
      return "border-blue-200 bg-blue-50 text-blue-700";
    }
    if (manga.publicationStatus === "published") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    return "border-slate-200 bg-slate-100 text-slate-700";
  };

  const getListSignal = (manga: MangaListItem) => {
    if (manga.enforcementStatus !== "normal") {
      return manga.enforcementReason
        ? `Restriction note: ${truncateText(manga.enforcementReason, 110)}`
        : `This story is currently marked as ${manga.enforcementStatus} and needs moderation follow-up.`;
    }

    if (manga.licenseStatus === "pending") {
      return `License was submitted ${formatDate(manga.licenseSubmittedAt)} and is waiting for moderator review.`;
    }

    if (manga.licenseStatus === "rejected") {
      return "License review was rejected. Re-check the submission before any publication action.";
    }

    if (
      manga.publicationStatus !== "published" &&
      manga.licenseStatus === "approved"
    ) {
      return "Approved license is in place. This story is ready for publication review.";
    }

    return (
      truncateText(manga.summary, 140) ||
      "No summary provided yet for this story."
    );
  };

  const getDetailSignal = (manga: MangaDetail) => {
    if (manga.enforcementStatus !== "normal") {
      return manga.enforcementReason
        ? truncateText(manga.enforcementReason, 180)
        : "This story has an active moderation restriction and should be reviewed carefully before any follow-up action.";
    }

    if (manga.licenseStatus === "pending") {
      return `License review is still pending. Submitted ${formatDate(
        manga.licenseSubmittedAt
      )}.`;
    }

    if (manga.licenseStatus === "rejected") {
      const latestRejectReason = getLatestRejectReason(manga);
      return latestRejectReason
        ? truncateText(latestRejectReason, 180)
        : "The last license review was rejected. Check the supporting note and files before proceeding.";
    }

    if (
      manga.publicationStatus !== "published" &&
      manga.licenseStatus === "approved"
    ) {
      return "Rights review is approved and enforcement is normal. This story is ready for publication review.";
    }

    return manga.summary
      ? truncateText(manga.summary, 180)
      : "No summary provided for this story.";
  };

  const getSecondaryAction = (
    manga: MangaListItem
  ):
    | {
        label: string;
        tab: DetailTab;
        icon: LucideIcon;
        className: string;
      }
    | null => {
    if (manga.licenseStatus === "pending") {
      return {
        label: "Review license",
        tab: "overview",
        icon: FileCheck,
        className:
          "border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800",
      };
    }

    if (manga.enforcementStatus !== "normal") {
      return {
        label: "Enforcement",
        tab: "enforcement",
        icon: ShieldAlert,
        className:
          "border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800",
      };
    }

    return null;
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

  const activeQuickFilter = useMemo<QuickFilterKey | null>(() => {
    if (
      licenseFilter === "all" &&
      publicationFilter === "all" &&
      enforcementFilter === "all"
    ) {
      return "all";
    }

    if (
      licenseFilter === "pending" &&
      publicationFilter === "all" &&
      enforcementFilter === "all"
    ) {
      return "pendingLicense";
    }

    if (
      licenseFilter === "all" &&
      publicationFilter === "published" &&
      enforcementFilter === "all"
    ) {
      return "published";
    }

    if (
      licenseFilter === "all" &&
      publicationFilter === "all" &&
      enforcementFilter === "suspended"
    ) {
      return "suspended";
    }

    if (
      licenseFilter === "all" &&
      publicationFilter === "all" &&
      enforcementFilter === "banned"
    ) {
      return "banned";
    }

    return null;
  }, [licenseFilter, publicationFilter, enforcementFilter]);

  const quickFilterButtons: Array<{
    key: QuickFilterKey;
    label: string;
    icon: LucideIcon;
    count?: number;
  }> = [
    { key: "all", label: "All stories", icon: BookOpen, count: stats.total },
    {
      key: "pendingLicense",
      label: "Pending license",
      icon: FileCheck,
      count: stats.pendingLicense,
    },
    {
      key: "published",
      label: "Published",
      icon: Eye,
      count: stats.published,
    },
    {
      key: "suspended",
      label: "Suspended",
      icon: Zap,
    },
    {
      key: "banned",
      label: "Banned",
      icon: ShieldAlert,
    },
  ];

  const applyQuickFilter = (key: QuickFilterKey) => {
    setPage(1);

    switch (key) {
      case "pendingLicense":
        setLicenseFilter("pending");
        setPublicationFilter("all");
        setEnforcementFilter("all");
        break;
      case "published":
        setLicenseFilter("all");
        setPublicationFilter("published");
        setEnforcementFilter("all");
        break;
      case "suspended":
        setLicenseFilter("all");
        setPublicationFilter("all");
        setEnforcementFilter("suspended");
        break;
      case "banned":
        setLicenseFilter("all");
        setPublicationFilter("all");
        setEnforcementFilter("banned");
        break;
      default:
        setLicenseFilter("all");
        setPublicationFilter("all");
        setEnforcementFilter("all");
        break;
    }
  };

  const handleSortChange = (field: SortField) => {
    setPage(1);

    if (sortBy === field) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(field);
    setSortOrder(field === "updatedAt" ? "desc" : "asc");
  };

  const currentSortLabel = useMemo(() => {
    const fieldLabels: Record<SortField, string> = {
      title: "Story",
      licenseStatus: "License",
      publicationStatus: "Publication",
      enforcementStatus: "Enforcement",
      chaptersCount: "Chapters",
      updatedAt: "Updated",
    };

    return `${fieldLabels[sortBy]} • ${
      sortOrder === "asc" ? "ascending" : "descending"
    }`;
  }, [sortBy, sortOrder]);

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
            sortBy,
            sortOrder,
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
    sortBy,
    sortOrder,
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

  const openDetail = async (
    mangaId: string,
    initialTab: DetailTab = "overview"
  ) => {
    setSelectedMangaId(mangaId);
    setSelectedManga(null);
    setDetailTab(initialTab);
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

  const renderSortIcon = (field: SortField) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3.5 w-3.5" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" />
    );
  };

  const renderSortHeader = (
    field: SortField,
    label: string,
    className = ""
  ) => (
    <button
      type="button"
      onClick={() => handleSortChange(field)}
      className={`inline-flex items-center gap-2 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 transition hover:text-slate-900 ${className}`}
    >
      <span>{label}</span>
      <span
        className={
          sortBy === field
            ? "text-slate-900 dark:text-slate-100"
            : "text-slate-400 dark:text-slate-500"
        }
      >
        {renderSortIcon(field)}
      </span>
    </button>
  );

  const canPublish =
    selectedManga?.licenseStatus === "approved" &&
    selectedManga?.enforcementStatus === "normal";
  const selectedRejectReasonHistory = useMemo(
    () => normalizeRejectReasonHistory(selectedManga),
    [selectedManga],
  );
  const selectedLatestRejectReason = useMemo(
    () => getLatestRejectReason(selectedManga),
    [selectedManga],
  );
  const previousSelectedRejectReasons = useMemo(
    () =>
      selectedRejectReasonHistory.length > 1
        ? selectedRejectReasonHistory
            .slice(0, selectedRejectReasonHistory.length - 1)
            .reverse()
        : [],
    [selectedRejectReasonHistory],
  );

  const dialogStoryTitle = truncateText(selectedManga?.title, 55);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-3xl border-slate-200/80 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-sm font-medium text-slate-600">
                  Total stories
                </CardTitle>
                <CardDescription className="mt-1 text-xs">
                  Full moderation queue
                </CardDescription>
              </div>
              <div className="rounded-2xl bg-slate-100 p-2 text-slate-600">
                <BookOpen className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {stats.total}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-amber-200/80 bg-amber-50/60 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-sm font-medium text-amber-800">
                  Pending license
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-amber-700/80">
                  Waiting for review
                </CardDescription>
              </div>
              <div className="rounded-2xl bg-white/90 p-2 text-amber-700 shadow-sm">
                <FileCheck className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-800">
                {stats.pendingLicense}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-blue-200/80 bg-blue-50/60 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-sm font-medium text-blue-800">
                  Published
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-blue-700/80">
                  Visible on platform
                </CardDescription>
              </div>
              <div className="rounded-2xl bg-white/90 p-2 text-blue-700 shadow-sm">
                <Eye className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-800">
                {stats.published}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-red-200/80 bg-red-50/70 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-sm font-medium text-red-800">
                  Restricted
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-red-700/80">
                  Suspended or banned
                </CardDescription>
              </div>
              <div className="rounded-2xl bg-white/90 p-2 text-red-700 shadow-sm">
                <ShieldAlert className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-800">
                {stats.enforcementIssues}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl border-slate-200/80 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg text-slate-900">
                  Review lanes
                </CardTitle>
                <CardDescription className="max-w-2xl text-sm leading-6">
                  Jump into the stories that need attention first, then narrow
                  the queue with filters below.
                </CardDescription>
              </div>

              <div className="flex flex-wrap gap-2">
                {quickFilterButtons.map((filter) => {
                  const Icon = filter.icon;
                  const active = activeQuickFilter === filter.key;

                  return (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => applyQuickFilter(filter.key)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{filter.label}</span>
                      {typeof filter.count === "number" && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            active
                              ? "bg-white/15 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {filter.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by title or author..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="h-11 rounded-2xl border-slate-200 pl-10"
                />
              </div>

              <Button
                variant="outline"
                className="h-11 rounded-2xl"
                onClick={() => {
                  setSearchQuery("");
                  setLicenseFilter("all");
                  setPublicationFilter("all");
                  setEnforcementFilter("all");
                  setAuthorFilter("all");
                  setSortBy("updatedAt");
                  setSortOrder("desc");
                  setPage(1);
                  setLimit("10");
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset all
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Select
                value={licenseFilter}
                onValueChange={(value) => {
                  setLicenseFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="rounded-2xl">
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
                <SelectTrigger className="rounded-2xl">
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
                <SelectTrigger className="rounded-2xl">
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
                <SelectTrigger className="rounded-2xl">
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
                <SelectTrigger className="rounded-2xl">
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

        <Card className="rounded-3xl border-slate-200/80 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg text-slate-900">
                  Manga review queue
                </CardTitle>
                <CardDescription className="max-w-2xl text-sm leading-6">
                  Scan rights readiness, publication state, and moderation
                  pressure before opening the full workspace.
                </CardDescription>
              </div>

              <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                Sorted by {currentSortLabel}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="min-w-[1180px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[470px]">
                      {renderSortHeader("title", "Story")}
                    </TableHead>
                    <TableHead className="w-[130px]">
                      {renderSortHeader("licenseStatus", "License")}
                    </TableHead>
                    <TableHead className="w-[140px]">
                      {renderSortHeader("publicationStatus", "Publication")}
                    </TableHead>
                    <TableHead className="w-[140px]">
                      {renderSortHeader("enforcementStatus", "Enforcement")}
                    </TableHead>
                    <TableHead className="w-[110px] text-center">
                      {renderSortHeader(
                        "chaptersCount",
                        "Chapters",
                        "justify-center w-full"
                      )}
                    </TableHead>
                    <TableHead className="w-[130px]">
                      {renderSortHeader("updatedAt", "Updated")}
                    </TableHead>
                    <TableHead className="w-[190px] text-center">
                      Workspace
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loadingList ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-12 text-center text-slate-500"
                      >
                        <div className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading manga management data...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : mangaList.length > 0 ? (
                    mangaList.map((manga) => {
                      const secondaryAction = getSecondaryAction(manga);
                      const SecondaryIcon = secondaryAction?.icon;

                      return (
                        <TableRow
                          key={manga.id}
                          className={`align-top ${
                            selectedMangaId === manga.id
                              ? "bg-blue-50/40"
                              : "bg-white"
                          }`}
                        >
                          <TableCell className="max-w-[470px]">
                            <div className="flex items-start gap-4">
                              <div className="h-20 w-14 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
                                {manga.coverImage ? (
                                  <img
                                    src={resolveImageUrl(manga.coverImage)}
                                    alt={manga.title}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-[10px] font-medium text-slate-400">
                                    N/A
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p
                                    className="truncate text-sm font-semibold text-slate-900"
                                    title={manga.title}
                                  >
                                    {manga.title}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className={`rounded-full px-2.5 py-0.5 text-[11px] capitalize ${getStoryStatusColor(
                                      manga.status
                                    )}`}
                                  >
                                    {manga.status}
                                  </Badge>
                                  <span
                                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${getReviewLaneColor(
                                      manga
                                    )}`}
                                  >
                                    {getReviewLaneLabel(manga)}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                  <span className="inline-flex items-center gap-1.5">
                                    <User2 className="h-3.5 w-3.5" />
                                    <span className="truncate" title={manga.author}>
                                      {manga.author}
                                    </span>
                                  </span>
                                  <span className="inline-flex items-center gap-1.5">
                                    <Eye className="h-3.5 w-3.5" />
                                    {manga.views.toLocaleString()} views
                                  </span>
                                </div>

                                <p className="text-xs leading-5 text-slate-600">
                                  {getListSignal(manga)}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`rounded-full capitalize ${getLicenseStatusColor(
                                manga.licenseStatus
                              )}`}
                            >
                              {manga.licenseStatus}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`rounded-full capitalize ${getPublicationStatusColor(
                                manga.publicationStatus
                              )}`}
                            >
                              {manga.publicationStatus}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`rounded-full capitalize ${getEnforcementStatusColor(
                                manga.enforcementStatus
                              )}`}
                            >
                              {manga.enforcementStatus}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-center text-sm font-semibold text-slate-700">
                            {manga.chaptersCount}
                          </TableCell>

                          <TableCell className="text-sm text-slate-500">
                            {formatDate(manga.updatedAt)}
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-col items-center gap-2">
                              <Button
                                size="sm"
                                className="min-w-[156px] rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                                onClick={() => openDetail(manga.id, "overview")}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Open workspace
                              </Button>

                              {secondaryAction && SecondaryIcon && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={`min-w-[156px] rounded-xl ${secondaryAction.className}`}
                                  onClick={() =>
                                    openDetail(manga.id, secondaryAction.tab)
                                  }
                                >
                                  <SecondaryIcon className="mr-2 h-4 w-4" />
                                  {secondaryAction.label}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-12 text-center text-slate-500"
                      >
                        No manga found matching your filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing {mangaList.length} stories, page {page} of {totalPages}
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
              setDetailTab("overview");
            }
          }}
        >
          <SheetContent className="w-screen max-w-none overflow-y-auto border-l border-slate-200 bg-slate-50 p-0 sm:max-w-[90vw] sm:rounded-l-[30px] lg:max-w-[80vw] xl:max-w-[70vw] 2xl:max-w-[64vw]">
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
                <div className="min-h-full animate-pulse p-6 xl:p-8">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 h-8 w-1/3 rounded-xl bg-slate-200" />
                    <div className="mb-5 flex flex-wrap gap-2">
                      <div className="h-7 w-24 rounded-full bg-slate-200" />
                      <div className="h-7 w-28 rounded-full bg-slate-200" />
                      <div className="h-7 w-24 rounded-full bg-slate-200" />
                    </div>
                    <div className="h-14 rounded-[22px] bg-slate-100" />
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="h-36 rounded-[24px] border border-slate-200 bg-white shadow-sm"
                      />
                    ))}
                  </div>

                  <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                    <div className="h-80 rounded-[24px] border border-slate-200 bg-white shadow-sm" />
                    <div className="h-80 rounded-[24px] border border-slate-200 bg-white shadow-sm" />
                  </div>
                </div>
              </div>
            ) : selectedManga ? (
              <div className="min-h-full bg-slate-50">
                <div className="min-h-full p-4 xl:p-5">
                  <Tabs
                    value={detailTab}
                    onValueChange={(value) => setDetailTab(value as DetailTab)}
                    className="min-h-full space-y-4"
                  >
                    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm xl:p-5">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                            Review workspace
                          </div>

                          <h2 className="mt-3 text-xl font-bold leading-tight text-slate-900 break-words xl:text-[22px]">
                            {selectedManga.title}
                          </h2>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700">
                              <User2 className="h-4 w-4 text-slate-500" />
                              {selectedManga.author?.username ||
                                "Unknown author"}
                            </div>
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getReviewLaneColor(
                                selectedManga
                              )}`}
                            >
                              {getReviewLaneLabel(selectedManga)}
                            </span>
                          </div>

                          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                            {getDetailSignal(selectedManga)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 xl:max-w-sm xl:justify-end">
                          <Badge
                            variant="outline"
                            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${getStoryStatusColor(
                              selectedManga.status
                            )}`}
                          >
                            Story: {selectedManga.status}
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
                      </div>

                      <TabsList className="mt-4 grid h-11 w-full max-w-[18rem] grid-cols-2 rounded-[18px] border border-slate-200 bg-slate-50 p-1 shadow-sm">
                        <TabsTrigger
                          value="overview"
                          className="rounded-[14px] text-sm font-medium"
                        >
                          Overview
                        </TabsTrigger>
                        <TabsTrigger
                          value="enforcement"
                          className="rounded-[14px] text-sm font-medium"
                        >
                          Enforcement
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <div className="space-y-4">
                        <TabsContent value="overview" className="mt-0 space-y-4">
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            <Card className="rounded-2xl border-slate-200 shadow-sm">
                              <CardContent className="flex min-h-[112px] items-start gap-3 p-4">
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
                              <CardContent className="flex min-h-[112px] items-start gap-3 p-4">
                                <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
                                  <Star className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Avg Rating
                                  </p>
                                  <p className="mt-2.5 text-2xl font-bold text-slate-900">
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
                              <CardContent className="flex min-h-[112px] items-start gap-3 p-4">
                                <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                                  <CalendarDays className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Created At
                                  </p>
                                  <p className="mt-2.5 text-xl font-bold text-slate-900">
                                    {formatDate(selectedManga.createdAt)}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="rounded-2xl border-slate-200 shadow-sm">
                              <CardContent className="flex min-h-[112px] items-start gap-3 p-4">
                                <div className="rounded-xl bg-cyan-50 p-2 text-cyan-600">
                                  <Eye className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Views
                                  </p>
                                  <p className="mt-2.5 text-2xl font-bold text-slate-900">
                                    {selectedManga.views.toLocaleString()}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="rounded-2xl border-slate-200 shadow-sm">
                              <CardContent className="flex min-h-[112px] items-start gap-3 p-4">
                                <div className="rounded-xl bg-violet-50 p-2 text-violet-600">
                                  <FileText className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Chapters
                                  </p>
                                  <p className="mt-2.5 text-2xl font-bold text-slate-900">
                                    {selectedManga.chaptersCount}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="rounded-2xl border-slate-200 shadow-sm">
                              <CardContent className="flex min-h-[112px] items-start gap-3 p-4">
                                <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
                                  <CalendarDays className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Updated At
                                  </p>
                                  <p className="mt-2.5 text-xl font-bold text-slate-900">
                                    {formatDate(selectedManga.updatedAt)}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
                            <div className="space-y-4">
                              <Card className="rounded-2xl border-slate-200 shadow-sm">
                                <CardHeader className="pb-3">
                                  <CardTitle className="flex items-center gap-2 text-base">
                                    <MessageSquareText className="h-5 w-5 text-slate-500" />
                                    Story Summary
                                  </CardTitle>
                                  <CardDescription className="text-sm">
                                    Main description shown for internal review.
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="min-h-[176px] p-5 pt-0">
                                  <p className="text-sm leading-6 text-slate-700 break-words">
                                    {selectedManga.summary ||
                                      "No summary provided."}
                                  </p>
                                </CardContent>
                              </Card>

                              <Card className="rounded-2xl border-slate-200 shadow-sm">
                                <CardHeader className="pb-3">
                                  <CardTitle className="flex items-center gap-2 text-base">
                                    <Tags className="h-5 w-5 text-slate-500" />
                                    Classification
                                  </CardTitle>
                                  <CardDescription className="text-sm">
                                    Genres and styles associated with this story.
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-5 p-5 pt-0 min-h-[176px]">
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
                                <CardHeader className="pb-3">
                                  <CardTitle className="flex items-center gap-2 text-base">
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

                              <Card className="rounded-[22px] border-slate-200 shadow-sm">
                                <CardHeader className="pb-3">
                                  <CardTitle className="flex items-center gap-2 text-base">
                                    <ShieldCheck className="h-5 w-5 text-slate-500" />
                                    Queue Context
                                  </CardTitle>
                                  <CardDescription className="text-sm">
                                    Quick context for where this story currently
                                    sits in review.
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 p-5 pt-0 min-h-[176px]">
                                  <div className="grid gap-3">
                                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Review lane
                                      </p>
                                      <p className="mt-2 text-sm font-semibold text-slate-900">
                                        {getReviewLaneLabel(selectedManga)}
                                      </p>
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

                          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                            <Card className="rounded-[24px] border-slate-200 shadow-sm">
                              <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                  <BadgeCheck className="h-5 w-5 text-slate-500" />
                                  Submission Status
                                </CardTitle>
                                <CardDescription className="text-sm">
                                  Review state and audit trail for the current
                                  rights submission.
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-4 p-6 pt-0 min-h-[220px]">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Review Status
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

                            <Card className="rounded-[24px] border-slate-200 shadow-sm">
                              <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                  <FileText className="h-5 w-5 text-slate-500" />
                                  Supporting Note
                                </CardTitle>
                                <CardDescription className="text-sm">
                                  Context submitted alongside the current rights
                                  review.
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

                          <Card className="rounded-[24px] border-slate-200 shadow-sm">
                            <CardHeader className="pb-4">
                              <CardTitle className="flex items-center gap-2 text-lg">
                                <FileText className="h-5 w-5 text-slate-500" />
                                Supporting Files
                              </CardTitle>
                              <CardDescription className="text-sm">
                                Uploaded documents attached to this review.
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
                                                Open supporting document
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
                                    This submission does not contain supporting
                                    attachments.
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          {selectedLatestRejectReason ||
                          selectedRejectReasonHistory.length > 0 ? (
                            <Card className="rounded-[24px] border-red-200 bg-red-50 shadow-sm">
                              <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg text-red-700">
                                  <AlertTriangle className="h-5 w-5" />
                                  {selectedManga.licenseStatus === "rejected"
                                    ? "Latest Review Note"
                                    : "Review History"}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3 p-6 pt-0">
                                {selectedLatestRejectReason ? (
                                  <p className="text-sm leading-7 text-red-700 break-words">
                                    {selectedLatestRejectReason}
                                  </p>
                                ) : null}
                                {previousSelectedRejectReasons.length > 0 ? (
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-red-700/80">
                                      Earlier review notes
                                    </p>
                                    <div className="space-y-2">
                                      {previousSelectedRejectReasons.map((reason, index) => (
                                        <div
                                          key={`${reason}-${index}`}
                                          className="rounded-xl border border-red-200/80 bg-white/70 px-3 py-2"
                                        >
                                          <p className="text-sm leading-7 text-red-700 break-words">
                                            {reason}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                              </CardContent>
                            </Card>
                          ) : null}

                          {selectedManga.licenseStatus === "pending" && (
                            <Card className="rounded-[24px] border-slate-200 shadow-sm">
                              <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                  <FileCheck className="h-5 w-5 text-slate-500" />
                                  Follow-up Actions
                                </CardTitle>
                                <CardDescription className="text-sm">
                                  Choose how to proceed with the pending review.
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

                        <TabsContent value="license" className="mt-0 space-y-4">
                          <div className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
                            <Card className="rounded-2xl border-slate-200 shadow-sm">
                              <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                  <BadgeCheck className="h-5 w-5 text-slate-500" />
                                  Review Status
                                </CardTitle>
                                <CardDescription className="text-sm">
                                  Approval state and audit information for the
                                  license submission.
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-3 p-5 pt-0 min-h-[176px]">
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

                          {selectedLatestRejectReason ||
                          selectedRejectReasonHistory.length > 0 ? (
                            <Card className="rounded-2xl border-red-200 bg-red-50 shadow-sm">
                              <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg text-red-700">
                                  <AlertTriangle className="h-5 w-5" />
                                  {selectedManga.licenseStatus === "rejected"
                                    ? "Latest Reject Reason"
                                    : "Reject History"}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3 p-6 pt-0">
                                {selectedLatestRejectReason ? (
                                  <p className="text-sm leading-7 text-red-700 break-words">
                                    {selectedLatestRejectReason}
                                  </p>
                                ) : null}
                                {previousSelectedRejectReasons.length > 0 ? (
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-red-700/80">
                                      Earlier review notes
                                    </p>
                                    <div className="space-y-2">
                                      {previousSelectedRejectReasons.map((reason, index) => (
                                        <div
                                          key={`${reason}-${index}`}
                                          className="rounded-xl border border-red-200/80 bg-white/70 px-3 py-2"
                                        >
                                          <p className="text-sm leading-7 text-red-700 break-words">
                                            {reason}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                              </CardContent>
                            </Card>
                          ) : null}

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
                                  <p className="mt-2 text-sm leading-6 text-slate-700 break-words">
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
                              <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                  <ShieldAlert className="h-5 w-5 text-slate-500" />
                                  Moderation Actions
                                </CardTitle>
                                <CardDescription className="text-sm">
                                  Apply temporary or permanent moderation
                                  actions.
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-3 p-5 pt-0 min-h-[176px]">
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
