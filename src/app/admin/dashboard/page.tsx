"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Users,
  BookOpen,
  AlertCircle,
  Bell,
  Eye,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import Link from "next/link";
import AdminLayout from "../adminLayout/page";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { fetchQueue } from "@/lib/moderation";
import type { QueueItem } from "@/lib/typesLogs";
import { cn } from "@/lib/utils";

// ===== Types
type UserSummary = { total: number; deltaPctMoM: number };
type UsersWeeklyPoint = { week: string; new: number };
type RecentUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  joinDate: string;
};

type MangaSummary = {
  total: number;
  deltaPctMoM: number;
  published: number;
  byStatus: Record<string, number>;
};
type MangaGrowthPoint = { month: string; stories: number };
type TopStory = {
  id: string;
  title: string;
  views: number;
  author: string;
  status: string;
};

type ReportSummary = { open: number; new7d: number };

//  Notification stats from BE
type NotiStats = { total: number; unread: number; read: number };

//  Moderation chart type
type ModerationWeekPoint = { week: string; chapters: number; avgRisk: number };

type DashboardLoadingState = {
  summary: boolean;
  weekly: boolean;
  recent: boolean;
  report: boolean;
  mangaSummary: boolean;
  mangaGrowth: boolean;
  topStories: boolean;
  notiStats: boolean;
  modWeekly: boolean;
};

type DashboardErrorState = {
  summary?: string;
  weekly?: string;
  recent?: string;
  report?: string;
  mangaSummary?: string;
  mangaGrowth?: string;
  topStories?: string;
  notiStats?: string;
  modWeekly?: string;
};

type DataMessageTone = "default" | "danger";
type AttentionCardTone = "danger" | "info" | "amber";

type AttentionCardProps = {
  title: string;
  subtitle: string;
  value: string;
  detail: string;
  href: string;
  actionLabel: string;
  icon: LucideIcon;
  tone: AttentionCardTone;
  loading: boolean;
  error?: string;
};

type SnapshotCardProps = {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  loading: boolean;
  error?: string;
};

type ChartStateProps = {
  loading: boolean;
  error?: string;
  hasData: boolean;
  emptyTitle: string;
  emptyDescription: string;
  children: React.ReactNode;
};

const surfaceCardClass =
  "rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/85";

const initialLoading: DashboardLoadingState = {
  summary: true,
  weekly: true,
  recent: true,
  report: true,
  mangaSummary: true,
  mangaGrowth: true,
  topStories: true,
  notiStats: true,
  modWeekly: true,
};

// ===== Helper: updatedAt -> week label (Monday of that week)
function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "Unknown";

  const day = d.getDay(); // 0 = Sun, 1 = Mon, ...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // move to Monday
  const monday = new Date(d.setDate(diff));

  // format YYYY-MM-DD
  return monday.toLocaleDateString("en-CA");
}

function formatWeekTick(value: string) {
  if (!value || value === "Unknown") return value;

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatMonthTick(value: string) {
  if (!value) return "Unknown";

  const parsedValue = /^\d{4}-\d{2}$/.test(value)
    ? `${value}-01T00:00:00`
    : value;
  const date = new Date(parsedValue);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
}

function formatReadableDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDelta(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatRoleLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function dataMessagePalette(tone: DataMessageTone) {
  if (tone === "danger") {
    return {
      container:
        "border-red-200/80 bg-red-50/80 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200",
      icon: "text-red-500 dark:text-red-300",
      title: "text-red-900 dark:text-red-50",
    };
  }

  return {
    container:
      "border-slate-200/80 bg-slate-50/80 text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300",
    icon: "text-slate-400 dark:text-slate-500",
    title: "text-slate-900 dark:text-slate-100",
  };
}

function roleBadgeClass(role: string) {
  const normalized = role.toLowerCase();

  if (normalized === "admin") {
    return "border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
  }

  if (normalized === "author") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200";
  }

  if (normalized.includes("moderator") || normalized.includes("manager")) {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200";
  }

  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200";
}

function storyStatusBadgeClass(status: string) {
  if (status.toLowerCase() === "ongoing") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200";
  }

  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200";
}

function DataStateMessage({
  title,
  description,
  tone = "default",
}: {
  title: string;
  description: string;
  tone?: DataMessageTone;
}) {
  const palette = dataMessagePalette(tone);

  return (
    <div
      className={cn(
        "flex h-full min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center",
        palette.container,
      )}
    >
      <AlertCircle className={cn("mb-3 h-5 w-5", palette.icon)} />
      <p className={cn("text-sm font-semibold", palette.title)}>{title}</p>
      <p className="mt-1 max-w-sm text-sm leading-6">{description}</p>
    </div>
  );
}

function ChartSkeletonState() {
  return (
    <div className="flex h-full flex-col justify-end gap-4 rounded-xl border border-slate-200/80 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex items-end gap-3">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
      <div className="flex justify-between gap-2">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

function ChartState({
  loading,
  error,
  hasData,
  emptyTitle,
  emptyDescription,
  children,
}: ChartStateProps) {
  if (loading) return <ChartSkeletonState />;

  if (error) {
    return (
      <DataStateMessage
        title="Unable to load chart"
        description={error}
        tone="danger"
      />
    );
  }

  if (!hasData) {
    return (
      <DataStateMessage
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return <>{children}</>;
}

function TableStateRow({
  colSpan,
  title,
  description,
  tone = "default",
}: {
  colSpan: number;
  title: string;
  description: string;
  tone?: DataMessageTone;
}) {
  const palette = dataMessagePalette(tone);

  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10">
        <div
          className={cn(
            "mx-auto flex max-w-md flex-col items-center rounded-xl border border-dashed px-4 py-6 text-center",
            palette.container,
          )}
        >
          <AlertCircle className={cn("mb-2 h-4 w-4", palette.icon)} />
          <p className={cn("text-sm font-semibold", palette.title)}>{title}</p>
          <p className="mt-1 text-sm">{description}</p>
        </div>
      </TableCell>
    </TableRow>
  );
}

function AttentionCard({
  title,
  subtitle,
  value,
  detail,
  href,
  actionLabel,
  icon: Icon,
  tone,
  loading,
  error,
}: AttentionCardProps) {
  const toneStyles = {
    danger: {
      card:
        "border-red-200/80 bg-red-50/75 dark:border-red-900/50 dark:bg-red-950/20",
      icon:
        "border-red-200/80 bg-white text-red-500 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300",
      label: "text-red-600 dark:text-red-300",
    },
    info: {
      card:
        "border-blue-200/80 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/20",
      icon:
        "border-blue-200/80 bg-white text-blue-500 dark:border-blue-900/50 dark:bg-blue-950/50 dark:text-blue-300",
      label: "text-blue-600 dark:text-blue-300",
    },
    amber: {
      card:
        "border-amber-200/80 bg-amber-50/75 dark:border-amber-900/50 dark:bg-amber-950/20",
      icon:
        "border-amber-200/80 bg-white text-amber-500 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-300",
      label: "text-amber-700 dark:text-amber-300",
    },
  }[tone];

  return (
    <Card className={cn(surfaceCardClass, toneStyles.card)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base text-slate-950 dark:text-slate-50">
              {title}
            </CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              {subtitle}
            </CardDescription>
          </div>

          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
              toneStyles.icon,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-4 w-40" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200/80 bg-white/70 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-slate-950/40 dark:text-red-200">
            Unable to load this panel right now.
          </div>
        ) : (
          <div className="space-y-1">
            <div className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              {value}
            </div>
            <p className={cn("text-sm font-medium", toneStyles.label)}>{detail}</p>
          </div>
        )}

        <Button
          asChild
          variant="outline"
          className="h-10 w-full justify-between rounded-xl border-white/70 bg-white/75 px-3 text-slate-900 hover:bg-white dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-100 dark:hover:bg-slate-950/80"
        >
          <Link href={href}>
            {actionLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function SnapshotCard({
  title,
  value,
  detail,
  icon: Icon,
  loading,
  error,
}: SnapshotCardProps) {
  return (
    <Card className={surfaceCardClass}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {title}
          </CardTitle>
          <CardDescription className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Snapshot for the current dashboard context
          </CardDescription>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-4 w-36" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200/80 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-200">
            Unable to load this metric.
          </div>
        ) : (
          <>
            <div className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              {value}
            </div>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              {detail}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const API = process.env.NEXT_PUBLIC_API_URL;

  // ===== User states
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [weeklyNew, setWeeklyNew] = useState<UsersWeeklyPoint[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUserRow[]>([]);

  // ===== Report state
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null);

  // ===== MANGA states
  const [mangaSummary, setMangaSummary] = useState<MangaSummary | null>(null);
  const [mangaGrowth, setMangaGrowth] = useState<MangaGrowthPoint[]>([]);
  const [topStories, setTopStories] = useState<TopStory[]>([]);

  //  Notification stats
  const [notiStats, setNotiStats] = useState<NotiStats | null>(null);

  // ===== Moderation (queue -> weekly chart)
  const [modWeekly, setModWeekly] = useState<ModerationWeekPoint[]>([]);

  const [loading, setLoading] = useState<DashboardLoadingState>(initialLoading);
  const [error, setError] = useState<DashboardErrorState>({});

  useEffect(() => {
    let mounted = true;

    if (!API) {
      const missingApiMessage = "Missing NEXT_PUBLIC_API_URL.";
      if (mounted) {
        setError({
          summary: missingApiMessage,
          weekly: missingApiMessage,
          recent: missingApiMessage,
          report: missingApiMessage,
          mangaSummary: missingApiMessage,
          mangaGrowth: missingApiMessage,
          topStories: missingApiMessage,
          notiStats: missingApiMessage,
          modWeekly: missingApiMessage,
        });
        setLoading({
          summary: false,
          weekly: false,
          recent: false,
          report: false,
          mangaSummary: false,
          mangaGrowth: false,
          topStories: false,
          notiStats: false,
          modWeekly: false,
        });
      }

      return () => {
        mounted = false;
      };
    }

    // ====== Users
    const fetchSummary = async () => {
      try {
        const res = await axios.get<UserSummary>(`${API}/api/user/admin/summary`, {
          withCredentials: true,
        });
        if (mounted) setSummary(res.data);
      } catch (e: any) {
        if (mounted) setError((s) => ({ ...s, summary: e?.message || "Error" }));
      } finally {
        if (mounted) setLoading((s) => ({ ...s, summary: false }));
      }
    };

    const fetchWeekly = async () => {
      try {
        const res = await axios.get<UsersWeeklyPoint[]>(
          `${API}/api/user/admin/charts/weekly-new?weeks=4`,
          { withCredentials: true }
        );
        if (mounted) setWeeklyNew(res.data || []);
      } catch (e: any) {
        if (mounted) setError((s) => ({ ...s, weekly: e?.message || "Error" }));
      } finally {
        if (mounted) setLoading((s) => ({ ...s, weekly: false }));
      }
    };

    const fetchRecent = async () => {
      try {
        const res = await axios.get<RecentUserRow[]>(
          `${API}/api/user/admin/recent?limit=5`,
          { withCredentials: true }
        );
        if (mounted) setRecentUsers(res.data || []);
      } catch (e: any) {
        if (mounted) setError((s) => ({ ...s, recent: e?.message || "Error" }));
      } finally {
        if (mounted) setLoading((s) => ({ ...s, recent: false }));
      }
    };

    // ====== Reports
    const fetchReportSummary = async () => {
      try {
        const res = await axios.get<ReportSummary>(`${API}/api/reports/admin/summary`, {
          withCredentials: true,
        });
        if (mounted) setReportSummary(res.data);
      } catch (e: any) {
        if (mounted) setError((s) => ({ ...s, report: e?.message || "Error" }));
      } finally {
        if (mounted) setLoading((s) => ({ ...s, report: false }));
      }
    };

    // ====== MANGA
    const fetchMangaSummary = async () => {
      try {
        const res = await axios.get<MangaSummary>(`${API}/api/manga/admin/summary`, {
          withCredentials: true,
        });
        if (mounted) setMangaSummary(res.data);
      } catch (e: any) {
        if (mounted)
          setError((s) => ({
            ...s,
            mangaSummary: e?.message || "Error",
          }));
      } finally {
        if (mounted) setLoading((s) => ({ ...s, mangaSummary: false }));
      }
    };

    const fetchMangaGrowth = async () => {
      try {
        const res = await axios.get<MangaGrowthPoint[]>(
          `${API}/api/manga/admin/charts/monthly-growth?months=6`,
          { withCredentials: true }
        );
        if (mounted) setMangaGrowth(res.data || []);
      } catch (e: any) {
        if (mounted) setError((s) => ({ ...s, mangaGrowth: e?.message || "Error" }));
      } finally {
        if (mounted) setLoading((s) => ({ ...s, mangaGrowth: false }));
      }
    };

    const fetchTopStories = async () => {
      try {
        const res = await axios.get<TopStory[]>(`${API}/api/manga/admin/top?limit=5&by=views`, {
          withCredentials: true,
        });
        if (mounted) setTopStories(res.data || []);
      } catch (e: any) {
        if (mounted) setError((s) => ({ ...s, topStories: e?.message || "Error" }));
      } finally {
        if (mounted) setLoading((s) => ({ ...s, topStories: false }));
      }
    };

    //  Notifications stats
    const fetchNotiStats = async () => {
      try {
        const res = await axios.get<NotiStats>(`${API}/api/admin/notifications/stats`, {
          withCredentials: true,
        });
        if (mounted) setNotiStats(res.data);
      } catch (e: any) {
        if (mounted) setError((s) => ({ ...s, notiStats: e?.message || "Error" }));
      } finally {
        if (mounted) setLoading((s) => ({ ...s, notiStats: false }));
      }
    };

    // ====== Moderation weekly (from queue)
    const fetchModWeekly = async () => {
      try {
        const rows: QueueItem[] = await fetchQueue({ limit: 200 });
        if (!mounted) return;

        const buckets: Record<string, { totalRisk: number; count: number }> = {};

        rows.forEach((item) => {
          const key = getWeekLabel(item.updatedAt);
          if (!buckets[key]) buckets[key] = { totalRisk: 0, count: 0 };
          buckets[key].totalRisk += item.risk_score ?? 0;
          buckets[key].count += 1;
        });

        const list: ModerationWeekPoint[] = Object.entries(buckets)
          .map(([week, { totalRisk, count }]) => ({
            week,
            chapters: count,
            avgRisk: count ? Math.round(totalRisk / count) : 0,
          }))
          .sort((a, b) => a.week.localeCompare(b.week));

        setModWeekly(list);
      } catch (e: any) {
        if (mounted) setError((s) => ({ ...s, modWeekly: e?.message || "Error" }));
      } finally {
        if (mounted) setLoading((s) => ({ ...s, modWeekly: false }));
      }
    };

    // run all fetchers
    fetchSummary();
    fetchWeekly();
    fetchRecent();
    fetchReportSummary();
    fetchMangaSummary();
    fetchMangaGrowth();
    fetchTopStories();
    fetchNotiStats();
    fetchModWeekly();

    return () => {
      mounted = false;
    };
  }, [API]);

  const weeklyNewChartData = useMemo(
    () =>
      weeklyNew.map((point) => ({
        week: point.week,
        label: formatWeekTick(point.week),
        newUsers: point.new,
      })),
    [weeklyNew],
  );

  const storiesGrowthChartData = useMemo(
    () =>
      mangaGrowth.map((point) => ({
        month: point.month,
        label: formatMonthTick(point.month),
        stories: point.stories,
      })),
    [mangaGrowth],
  );

  const moderationChartData = useMemo(
    () =>
      modWeekly.map((point) => ({
        week: point.week,
        label: formatWeekTick(point.week),
        chapters: point.chapters,
        avgRisk: point.avgRisk,
      })),
    [modWeekly],
  );

  const latestModerationPoint = modWeekly[modWeekly.length - 1];
  const unpublishedStories = Math.max(
    0,
    (mangaSummary?.total ?? 0) - (mangaSummary?.published ?? 0),
  );

  const totalUsers = loading.summary ? "0" : (summary?.total ?? 0).toLocaleString();
  const totalStories = loading.mangaSummary
    ? "0"
    : (mangaSummary?.total ?? 0).toLocaleString();
  const publishedStories = loading.mangaSummary
    ? "0"
    : (mangaSummary?.published ?? 0).toLocaleString();
  const pendingReports = loading.report ? "0" : (reportSummary?.open ?? 0).toString();
  const newReports7d = loading.report ? "0" : (reportSummary?.new7d ?? 0).toString();
  const unreadNotifications = loading.notiStats
    ? "0"
    : (notiStats?.unread ?? 0).toString();
  const readNotifications = loading.notiStats
    ? "0"
    : (notiStats?.read ?? 0).toString();
  const moderationLatestCount = loading.modWeekly
    ? "0"
    : (latestModerationPoint?.chapters ?? 0).toString();
  const moderationLatestDetail = latestModerationPoint
    ? `Avg risk ${latestModerationPoint.avgRisk}/100 in the week of ${formatWeekTick(latestModerationPoint.week)}`
    : "No reviewed chapters captured yet.";
  const totalUsersDetail = loading.summary
    ? "Loading user totals..."
    : `${formatDelta(summary?.deltaPctMoM ?? 0)} from last month`;
  const totalStoriesDetail = loading.mangaSummary
    ? "Loading story totals..."
    : `${formatDelta(mangaSummary?.deltaPctMoM ?? 0)} from last month`;
  const outsidePublishDetail = loading.mangaSummary
    ? "Loading publication split..."
    : `${publishedStories} already published`;

  return (
    <AdminLayout>
      <div className="space-y-8">
        <section className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Needs Attention Now
            </p>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                Start with the queues that can block moderation and publishing
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                This dashboard prioritizes operational risk first, then follows with the
                trends and activity that support the next decision.
              </p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <AttentionCard
              title="Pending reports"
              subtitle="Open cases that still need triage or resolution."
              value={pendingReports}
              detail={`${newReports7d} new reports in the last 7 days`}
              href="/admin/report"
              actionLabel="Open report workspace"
              icon={AlertCircle}
              tone="danger"
              loading={loading.report}
              error={error.report}
            />
            <AttentionCard
              title="Moderation review"
              subtitle="Latest chapter reviews from the moderation queue."
              value={moderationLatestCount}
              detail={moderationLatestDetail}
              href="/admin/moderation/queue"
              actionLabel="Open moderation queue"
              icon={Eye}
              tone="amber"
              loading={loading.modWeekly}
              error={error.modWeekly}
            />
            <AttentionCard
              title="Unread notifications"
              subtitle="Messages and announcements that still need attention."
              value={unreadNotifications}
              detail={`${readNotifications} already marked as read`}
              href="/admin/notifications"
              actionLabel="Open notifications center"
              icon={Bell}
              tone="info"
              loading={loading.notiStats}
              error={error.notiStats}
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Operational Snapshot
            </p>
            <h3 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              Core totals for people, stories, and publication status
            </h3>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <SnapshotCard
              title="Total users"
              value={totalUsers}
              detail={totalUsersDetail}
              icon={Users}
              loading={loading.summary}
              error={error.summary}
            />
            <SnapshotCard
              title="Total stories"
              value={totalStories}
              detail={totalStoriesDetail}
              icon={BookOpen}
              loading={loading.mangaSummary}
              error={error.mangaSummary}
            />
            <SnapshotCard
              title="Outside publish"
              value={loading.mangaSummary ? "0" : unpublishedStories.toLocaleString()}
              detail={outsidePublishDetail}
              icon={TrendingUp}
              loading={loading.mangaSummary}
              error={error.mangaSummary}
            />
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Card className={surfaceCardClass}>
            <CardHeader className="space-y-2">
              <CardTitle className="text-base text-slate-950 dark:text-slate-50">
                New users by week
              </CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                Fresh registrations over the latest four-week window.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ChartState
                loading={loading.weekly}
                error={error.weekly}
                hasData={weeklyNewChartData.length > 0}
                emptyTitle="No new-user trend yet"
                emptyDescription="New registrations will appear here once the API returns weekly data."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={weeklyNewChartData}
                    margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ stroke: "#cbd5e1", strokeDasharray: "4 4" }}
                      contentStyle={{
                        borderRadius: 16,
                        borderColor: "#e2e8f0",
                        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
                      }}
                      labelFormatter={(label) => `Week of ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="newUsers"
                      name="New users"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: "#2563eb" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartState>
            </CardContent>
          </Card>

          <Card className={surfaceCardClass}>
            <CardHeader className="space-y-2">
              <CardTitle className="text-base text-slate-950 dark:text-slate-50">
                Stories growth
              </CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                Monthly additions to the story catalog across the past six months.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ChartState
                loading={loading.mangaGrowth}
                error={error.mangaGrowth}
                hasData={storiesGrowthChartData.length > 0}
                emptyTitle="No story growth trend yet"
                emptyDescription="Story growth will show here once monthly reporting data is available."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={storiesGrowthChartData}
                    margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="stories-growth-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.38} />
                        <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 16,
                        borderColor: "#e2e8f0",
                        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="stories"
                      name="Stories"
                      stroke="#0f766e"
                      strokeWidth={2.5}
                      fill="url(#stories-growth-fill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartState>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className={surfaceCardClass}>
            <CardHeader className="space-y-2">
              <CardTitle className="text-base text-slate-950 dark:text-slate-50">
                Moderation review by week
              </CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                Weekly review volume and average risk score from the moderation queue.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ChartState
                loading={loading.modWeekly}
                error={error.modWeekly}
                hasData={moderationChartData.length > 0}
                emptyTitle="No moderation trend yet"
                emptyDescription="Reviewed chapters will appear here after moderation activity is recorded."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={moderationChartData}
                    margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                    barGap={10}
                  >
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 16,
                        borderColor: "#e2e8f0",
                        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
                      }}
                    />
                    <Bar
                      dataKey="chapters"
                      name="Reviewed chapters"
                      fill="#334155"
                      radius={[10, 10, 0, 0]}
                    />
                    <Bar
                      dataKey="avgRisk"
                      name="Average risk"
                      fill="#f59e0b"
                      radius={[10, 10, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartState>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Card className={surfaceCardClass}>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <CardTitle className="text-base text-slate-950 dark:text-slate-50">
                  Recently registered users
                </CardTitle>
                <CardDescription className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  The latest five accounts created on the platform.
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <Link href="/admin/user">
                  <Eye className="mr-2 h-4 w-4" />
                  View all users
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Join date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading.recent &&
                    Array.from({ length: 3 }).map((_, index) => (
                      <TableRow key={`recent-skeleton-${index}`}>
                        <TableCell>
                          <Skeleton className="h-4 w-28 rounded-md" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-40 rounded-md" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-24 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24 rounded-md" />
                        </TableCell>
                      </TableRow>
                    ))}

                  {!loading.recent && error.recent && (
                    <TableStateRow
                      colSpan={4}
                      title="Unable to load recent users"
                      description={error.recent}
                      tone="danger"
                    />
                  )}

                  {!loading.recent && !error.recent && recentUsers.length === 0 && (
                    <TableStateRow
                      colSpan={4}
                      title="No recent users yet"
                      description="Newly created accounts will appear here once the API returns results."
                    />
                  )}

                  {!loading.recent &&
                    !error.recent &&
                    recentUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                          {user.name}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                              roleBadgeClass(user.role),
                            )}
                          >
                            {formatRoleLabel(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                          {formatReadableDate(user.joinDate)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className={surfaceCardClass}>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <CardTitle className="text-base text-slate-950 dark:text-slate-50">
                  Top stories by views
                </CardTitle>
                <CardDescription className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  High-traffic titles worth checking for performance and moderation context.
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <Link href="/admin/manga">
                  <Eye className="mr-2 h-4 w-4" />
                  View all stories
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading.topStories &&
                    Array.from({ length: 3 }).map((_, index) => (
                      <TableRow key={`top-story-skeleton-${index}`}>
                        <TableCell>
                          <Skeleton className="h-4 w-32 rounded-md" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24 rounded-md" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16 rounded-md" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </TableCell>
                      </TableRow>
                    ))}

                  {!loading.topStories && error.topStories && (
                    <TableStateRow
                      colSpan={4}
                      title="Unable to load top stories"
                      description={error.topStories}
                      tone="danger"
                    />
                  )}

                  {!loading.topStories && !error.topStories && topStories.length === 0 && (
                    <TableStateRow
                      colSpan={4}
                      title="No top stories yet"
                      description="Top-viewed stories will appear here once the analytics endpoint returns data."
                    />
                  )}

                  {!loading.topStories &&
                    !error.topStories &&
                    topStories.map((story) => (
                      <TableRow key={story.id}>
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                          {story.title}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                          {story.author}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                            {story.views.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                              storyStatusBadgeClass(story.status),
                            )}
                          >
                            {formatRoleLabel(story.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        <section className={cn(surfaceCardClass, "p-5 sm:p-6")}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Quick Actions
              </p>
              <h3 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                Jump into the admin workspaces you use most
              </h3>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                These shortcuts keep the main operational flows one click away when you
                are moving between reports, moderation, notifications, and catalog work.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Button asChild variant="outline" className="h-11 rounded-xl px-4">
                <Link href="/admin/report">
                  Report workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-xl px-4">
                <Link href="/admin/moderation/queue">
                  Moderation queue
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-xl px-4">
                <Link href="/admin/notifications">
                  Notifications center
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-xl px-4">
                <Link href="/admin/manga">
                  Manga management
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

