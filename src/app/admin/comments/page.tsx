"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  Clock3,
  Eye,
  EyeOff,
  MessageSquare,
} from "lucide-react";

import AdminLayout from "../adminLayout/page";
import {
  CommentFilters,
  type FilterState,
} from "@/components/comment/comment-filters";
import { CommentModal } from "@/components/comment/comment-modal";
import {
  CommentTable,
  type Comment,
  type CommentSortColumn,
  type SortDirection,
} from "@/components/comment/comment-table";
import { formatRoleLabel } from "@/components/admin/users/user-management.utils";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 10;

const ALL = {
  MANGA: "",
  CHAPTER: "",
  STATUS: "",
} as const;

type Me = {
  userId?: string;
  email?: string;
  role?: string;
};

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

function extractPlainText(content: string) {
  return String(content || "")
    .replace(/<div><br\s*\/?><\/div>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/div>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  activeColumn: CommentSortColumn,
  currentColumn: CommentSortColumn,
  currentDirection: SortDirection
): SortDirection {
  if (activeColumn !== currentColumn) return "asc";
  return currentDirection === "asc" ? "desc" : "asc";
}

function StatsCard({
  title,
  value,
  hint,
  accent,
  icon,
}: {
  title: string;
  value: number;
  hint: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              {value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{hint}</p>
          </div>

          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accent}`}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickFilterButton({
  active,
  label,
  count,
  onClick,
  icon,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span>{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs ${
          active
            ? "bg-white text-sky-700"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

export default function CommentsPage() {
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [me, setMe] = useState<Me | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [mangas, setMangas] = useState<{ id: string; title: string }[]>([]);
  const [chapters, setChapters] = useState<{ id: string; title: string }[]>([]);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<CommentSortColumn>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filters, setFilters] = useState<FilterState>({
    manga: ALL.MANGA,
    chapter: ALL.CHAPTER,
    user: "",
    status: ALL.STATUS,
    search: "",
  });
  const [onlyNewest24h, setOnlyNewest24h] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const roleNormalized = useMemo(
    () => String(me?.role || "").toLowerCase(),
    [me?.role]
  );

  useEffect(() => {
    if (!API) return;

    axios
      .get(`${API}/api/auth/me`, { withCredentials: true })
      .then((res) => setMe(res.data))
      .catch(() => setMe(null));
  }, [API]);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      if (!API) {
        setError("Missing NEXT_PUBLIC_API_URL");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [commentRes, mangaRes] = await Promise.all([
          axios.get(`${API}/api/comment/all`, {
            withCredentials: true,
            signal: controller.signal,
          }),
          axios.get(`${API}/api/manga`, {
            withCredentials: true,
            signal: controller.signal,
          }),
        ]);

        const mappedComments: Comment[] = (commentRes.data || []).map(
          (comment: any) => ({
            id: comment._id,
            commentId: comment._id?.slice(-6)?.toUpperCase?.() ?? "N/A",
            username: comment.user_id?.username || "Unknown",
            userEmail: comment.user_id?.email || "",
            userRole: comment.user_id?.role || "",
            userAvatar: resolveAvatarUrl(comment.user_id?.avatar, API),
            storyTitle: comment.chapter_id?.manga_id?.title || "Unknown",
            storyId: comment.chapter_id?.manga_id?._id || "",
            chapter: comment.chapter_id?.title || "N/A",
            chapterId: comment.chapter_id?._id || "",
            content: comment.content ?? "",
            plainContent: extractPlainText(comment.content ?? ""),
            createdAt: comment.createdAt,
            date: (() => {
              const date = new Date(comment.createdAt);
              return Number.isNaN(date.getTime())
                ? "N/A"
                : date.toLocaleString("vi-VN", { hour12: false });
            })(),
            status: comment.is_delete ? "hidden" : "visible",
            replyCount: Number(comment.replyCount ?? 0),
            replyUsernames: Array.isArray(comment.replyUsernames)
              ? comment.replyUsernames
              : [],
          })
        );

        const mappedManga = (mangaRes.data || []).map((manga: any) => ({
          id: manga._id,
          title: manga.title,
        }));

        setComments(mappedComments);
        setMangas(mappedManga);
      } catch (err: any) {
        if (axios.isCancel(err)) return;

        console.error(
          "[Admin Comments] Load error:",
          err.response?.status,
          err.response?.data || err.message
        );
        setError(
          `Unable to load comments. ${err.response?.status || ""} ${err.message}`
        );
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [API]);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      if (!API) return;

      if (!filters.manga || filters.manga === ALL.MANGA) {
        setChapters([]);
        return;
      }

      try {
        const res = await axios.get(
          `${API}/api/chapter/by-manga/${filters.manga}`,
          {
            withCredentials: true,
            signal: controller.signal,
          }
        );

        const list = (res.data || []).map((chapter: any) => ({
          id: chapter._id?.toString?.() ?? chapter._id,
          title: chapter.title,
        }));

        setChapters(list);
      } catch (err) {
        console.error("[Admin Comments] Load chapters error:", err);
        setChapters([]);
      }
    })();

    return () => controller.abort();
  }, [API, filters.manga]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortColumn, sortDirection, onlyNewest24h]);

  const handleFiltersChange = (nextFilters: FilterState) => {
    if (!nextFilters.manga || nextFilters.manga === ALL.MANGA) {
      nextFilters = { ...nextFilters, chapter: ALL.CHAPTER };
    }

    setFilters(nextFilters);
  };

  const handleResetFilters = () => {
    setFilters({
      manga: ALL.MANGA,
      chapter: ALL.CHAPTER,
      user: "",
      status: ALL.STATUS,
      search: "",
    });
    setOnlyNewest24h(false);
  };

  const filteredComments = useMemo(() => {
    return comments.filter((comment) => {
      if (filters.manga !== ALL.MANGA && comment.storyId !== filters.manga) {
        return false;
      }

      if (
        filters.chapter !== ALL.CHAPTER &&
        comment.chapterId !== filters.chapter
      ) {
        return false;
      }

      if (filters.status !== ALL.STATUS && comment.status !== filters.status) {
        return false;
      }

      if (filters.user) {
        const query = filters.user.toLowerCase();
        if (!comment.username.toLowerCase().includes(query)) {
          return false;
        }
      }

      if (filters.search) {
        const query = filters.search.toLowerCase();
        const searchableValues = [
          comment.plainContent,
          comment.username,
          comment.userEmail,
          comment.storyTitle,
          comment.chapter,
          comment.commentId,
        ]
          .join(" ")
          .toLowerCase();

        if (!searchableValues.includes(query)) {
          return false;
        }
      }

      if (onlyNewest24h) {
        const createdAt = comment.createdAt
          ? new Date(comment.createdAt).getTime()
          : 0;

        if (!createdAt) return false;

        const twentyFourHours = 24 * 60 * 60 * 1000;
        if (Date.now() - createdAt > twentyFourHours) {
          return false;
        }
      }

      return true;
    });
  }, [comments, filters, onlyNewest24h]);

  const sortedComments = useMemo(() => {
    const statusPriority: Record<Comment["status"], number> = {
      visible: 0,
      hidden: 1,
    };

    const sorted = [...filteredComments];

    sorted.sort((first, second) => {
      let result = 0;

      switch (sortColumn) {
        case "commentId":
          result = compareStrings(first.commentId, second.commentId);
          break;
        case "user":
          result = compareStrings(first.username, second.username);
          break;
        case "manga":
          result = compareStrings(first.storyTitle, second.storyTitle);
          break;
        case "chapter":
          result = compareStrings(first.chapter, second.chapter);
          break;
        case "status":
          result =
            statusPriority[first.status] - statusPriority[second.status];
          break;
        case "date":
          result = compareDates(first.createdAt, second.createdAt);
          break;
        default:
          result = 0;
      }

      return sortDirection === "asc" ? result : -result;
    });

    return sorted;
  }, [filteredComments, sortColumn, sortDirection]);

  useEffect(() => {
    if (!selectedComment) return;

    const updatedSelected = sortedComments.find(
      (comment) => comment.id === selectedComment.id
    );

    if (!updatedSelected) {
      setSelectedComment(null);
      setPanelOpen(false);
      return;
    }

    if (updatedSelected !== selectedComment) {
      setSelectedComment(updatedSelected);
    }
  }, [selectedComment, sortedComments]);

  const totalPages = Math.max(1, Math.ceil(sortedComments.length / ITEMS_PER_PAGE));
  const paginatedComments = sortedComments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSort = (column: CommentSortColumn) => {
    setSortDirection((currentDirection) =>
      nextSortDirection(column, sortColumn, currentDirection)
    );
    setSortColumn(column);
  };

  const handleViewDetails = (comment: Comment) => {
    setSelectedComment(comment);
    setPanelOpen(true);
  };

  const handleToggleVisibility = async (id: string, currentStatus: string) => {
    try {
      if (!API) return;
      setActionLoading(id);

      await axios.patch(`${API}/api/comment/toggle/${id}`, {}, {
        withCredentials: true,
      });

      setComments((prev) =>
        prev.map((comment) =>
          comment.id === id
            ? {
                ...comment,
                status: currentStatus === "visible" ? "hidden" : "visible",
              }
            : comment
        )
      );

      toast.success("Comment status updated successfully.");
    } catch (err) {
      console.error("[Admin Comments] Toggle error:", err);
      toast.error("Could not update comment status.");
    } finally {
      setActionLoading(null);
    }
  };

  const visibleCount = comments.filter(
    (comment) => comment.status === "visible"
  ).length;
  const hiddenCount = comments.filter(
    (comment) => comment.status === "hidden"
  ).length;
  const newest24hCount = comments.filter((comment) => {
    const createdAt = comment.createdAt
      ? new Date(comment.createdAt).getTime()
      : 0;
    return createdAt > 0 && Date.now() - createdAt <= 24 * 60 * 60 * 1000;
  }).length;

  const quickMangaChips = useMemo(() => {
    const counts = new Map<string, { title: string; count: number }>();

    comments.forEach((comment) => {
      if (!comment.storyId) return;

      const current = counts.get(comment.storyId);
      counts.set(comment.storyId, {
        title: comment.storyTitle,
        count: (current?.count || 0) + 1,
      });
    });

    return Array.from(counts.entries())
      .map(([id, value]) => ({ id, ...value }))
      .sort((first, second) => second.count - first.count)
      .slice(0, 3);
  }, [comments]);

  const selectedCommentIndex = selectedComment
    ? sortedComments.findIndex((comment) => comment.id === selectedComment.id)
    : -1;

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CardContent className="flex min-h-[280px] items-center justify-center text-slate-500">
              Loading comments...
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="p-6">
          <Card className="rounded-2xl border-red-200 bg-red-50/60">
            <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <h2 className="text-lg font-semibold text-red-700">
                Unable to load comments
              </h2>
              <p className="max-w-xl text-sm text-red-700/90">{error}</p>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Comment Management
            </h1>
            <p className="mt-1 text-slate-600">
              Review discussion activity, inspect context faster, and moderate
              comment visibility without leaving the workspace.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Quick presets, preview cards, context links, and a side review
              panel are now tuned for moderation flow instead of plain CRUD.
            </p>
          </div>

          <div className="rounded-lg border bg-white px-3 py-2 text-sm text-slate-600">
            Signed in as:{" "}
            <span className="font-semibold text-slate-900">
              {me?.role ? formatRoleLabel(roleNormalized) : "Unknown"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatsCard
            title="Total Comments"
            value={comments.length}
            hint="All comments currently available in the system"
            accent="bg-sky-100 text-sky-700"
            icon={<MessageSquare className="h-5 w-5" />}
          />

          <StatsCard
            title="Visible Comments"
            value={visibleCount}
            hint="Comments that readers can currently see"
            accent="bg-emerald-100 text-emerald-700"
            icon={<Eye className="h-5 w-5" />}
          />

          <StatsCard
            title="Hidden Comments"
            value={hiddenCount}
            hint="Comments currently hidden during moderation"
            accent="bg-amber-100 text-amber-700"
            icon={<EyeOff className="h-5 w-5" />}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-medium text-slate-600">
            Quick Filters
          </p>

          <div className="flex flex-wrap gap-2">
            <QuickFilterButton
              active={
                !filters.manga &&
                !filters.chapter &&
                !filters.status &&
                !filters.search &&
                !onlyNewest24h
              }
              label="All"
              count={comments.length}
              onClick={handleResetFilters}
            />
            <QuickFilterButton
              active={filters.status === "visible" && !onlyNewest24h}
              label="Visible"
              count={visibleCount}
              icon={<Eye className="h-4 w-4" />}
              onClick={() => {
                setOnlyNewest24h(false);
                handleFiltersChange({ ...filters, status: "visible" });
              }}
            />
            <QuickFilterButton
              active={filters.status === "hidden" && !onlyNewest24h}
              label="Hidden"
              count={hiddenCount}
              icon={<EyeOff className="h-4 w-4" />}
              onClick={() => {
                setOnlyNewest24h(false);
                handleFiltersChange({ ...filters, status: "hidden" });
              }}
            />
            <QuickFilterButton
              active={onlyNewest24h}
              label="Newest 24h"
              count={newest24hCount}
              icon={<Clock3 className="h-4 w-4" />}
              onClick={() => setOnlyNewest24h((current) => !current)}
            />
            {quickMangaChips.map((manga) => (
              <QuickFilterButton
                key={manga.id}
                active={filters.manga === manga.id}
                label={manga.title}
                count={manga.count}
                onClick={() => {
                  setOnlyNewest24h(false);
                  handleFiltersChange({
                    ...filters,
                    manga: manga.id,
                    chapter: ALL.CHAPTER,
                  });
                }}
              />
            ))}
          </div>
        </div>

        <CommentFilters
          filters={filters}
          onChange={handleFiltersChange}
          onReset={handleResetFilters}
          mangas={mangas}
          chapters={chapters}
        />

        <CommentTable
          comments={paginatedComments}
          onViewDetails={handleViewDetails}
          onToggleVisibility={handleToggleVisibility}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedComments.length}
          onPageChange={setCurrentPage}
          actionLoading={actionLoading}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          selectedCommentId={selectedComment?.id || null}
        />

        <CommentModal
          open={panelOpen}
          comment={selectedComment}
          onClose={() => {
            setPanelOpen(false);
            setSelectedComment(null);
          }}
          onToggleVisibility={handleToggleVisibility}
          actionLoadingId={actionLoading}
          onPrevious={
            selectedCommentIndex > 0
              ? () => setSelectedComment(sortedComments[selectedCommentIndex - 1])
              : undefined
          }
          onNext={
            selectedCommentIndex >= 0 &&
            selectedCommentIndex < sortedComments.length - 1
              ? () => setSelectedComment(sortedComments[selectedCommentIndex + 1])
              : undefined
          }
          hasPrevious={selectedCommentIndex > 0}
          hasNext={
            selectedCommentIndex >= 0 &&
            selectedCommentIndex < sortedComments.length - 1
          }
        />
      </div>
    </AdminLayout>
  );
}
