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
  FileText,
  ShieldCheck,
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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { buildHumanMessage, prettyAction, prettyRole } from "@/lib/audit-ui";
import { cn } from "@/lib/utils";

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

type PolicyStatus = "Draft" | "Active" | "Archived";
type PolicyRecord = {
  _id: string;
  title: string;
  slug: string;
  status: PolicyStatus;
  isPublic: boolean;
  updatedAt: string;
};

type PolicyDashboardSummary = {
  total: number;
  active: number;
  draft: number;
  archived: number;
};

type NotiStats = { total: number; unread: number; read: number };

type AuditDashboardSummary = {
  total: number;
  unseen: number;
  pendingApproval: number;
  highRisk: number;
};

type AuditLogApiRow = {
  _id?: string;
  id?: string;
  createdAt?: string;
  actor_id?: { username?: string; email?: string; role?: string };
  actor_name?: string;
  actor_email?: string;
  actor_role?: string;
  action?: string;
  summary?: string;
  target_id?: string;
  target_type?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

type AuditLogsResponse = {
  rows?: AuditLogApiRow[];
  summary?: Partial<AuditDashboardSummary>;
};

type RecentAuditItem = {
  id: string;
  time: string;
  actorName: string;
  actorRole: string;
  actionLabel: string;
  summary: string;
};

type DashboardLoadingState = {
  summary: boolean;
  weekly: boolean;
  recent: boolean;
  policies: boolean;
  audit: boolean;
  mangaSummary: boolean;
  mangaGrowth: boolean;
  notiStats: boolean;
};

type DashboardErrorState = {
  summary?: string;
  weekly?: string;
  recent?: string;
  policies?: string;
  audit?: string;
  mangaSummary?: string;
  mangaGrowth?: string;
  notiStats?: string;
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

type GovernanceMetric = {
  label: string;
  value: string;
  tone?: "default" | "good" | "warn" | "danger";
};

const surfaceCardClass =
  "rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/85";

const initialLoading: DashboardLoadingState = {
  summary: true,
  weekly: true,
  recent: true,
  policies: true,
  audit: true,
  mangaSummary: true,
  mangaGrowth: true,
  notiStats: true,
};

const emptyAuditSummary: AuditDashboardSummary = {
  total: 0,
  unseen: 0,
  pendingApproval: 0,
  highRisk: 0,
};

function formatMonthTick(value: string) {
  if (!value) return "Unknown";
  const parsed = /^\d{4}-\d{2}$/.test(value) ? `${value}-01T00:00:00` : value;
  const date = new Date(parsed);
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

function formatReadableDateTime(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDelta(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatRoleLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function clipText(value: string, limit = 120) {
  const safeValue = String(value || "").trim();
  if (!safeValue) return "-";
  return safeValue.length > limit
    ? `${safeValue.slice(0, limit - 1).trimEnd()}...`
    : safeValue;
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

function summarizePolicies(policies: PolicyRecord[]): PolicyDashboardSummary {
  return policies.reduce<PolicyDashboardSummary>(
    (accumulator, policy) => {
      accumulator.total += 1;
      if (policy.status === "Active") accumulator.active += 1;
      if (policy.status === "Draft") accumulator.draft += 1;
      if (policy.status === "Archived") accumulator.archived += 1;
      return accumulator;
    },
    { total: 0, active: 0, draft: 0, archived: 0 },
  );
}

function mapRecentAuditRows(rows: AuditLogApiRow[]) {
  return rows.map<RecentAuditItem>((row, index) => ({
    id: String(row._id || row.id || `audit-row-${index}`),
    time: formatReadableDateTime(row.createdAt),
    actorName:
      row.actor_id?.username || row.actor_name || row.actor_email || "System",
    actorRole: String(row.actor_role || row.actor_id?.role || "system"),
    actionLabel: prettyAction(row.action),
    summary: clipText(buildHumanMessage(row)),
  }));
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
  const palette =
    tone === "danger"
      ? {
          container:
            "border-red-200/80 bg-red-50/80 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200",
          icon: "text-red-500 dark:text-red-300",
          title: "text-red-900 dark:text-red-50",
        }
      : {
          container:
            "border-slate-200/80 bg-slate-50/80 text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300",
          icon: "text-slate-400 dark:text-slate-500",
          title: "text-slate-900 dark:text-slate-100",
        };

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
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10">
        <DataStateMessage title={title} description={description} tone={tone} />
      </TableCell>
    </TableRow>
  );
}

function ChartState({
  loading,
  error,
  hasData,
  emptyTitle,
  emptyDescription,
  children,
}: {
  loading: boolean;
  error?: string;
  hasData: boolean;
  emptyTitle: string;
  emptyDescription: string;
  children: React.ReactNode;
}) {
  if (loading) {
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

function GovernancePanel({
  title,
  description,
  metrics,
  loading,
  error,
  isEmpty,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  description: string;
  metrics: GovernanceMetric[];
  loading: boolean;
  error?: string;
  isEmpty: boolean;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const toneClass = (tone?: GovernanceMetric["tone"]) => {
    switch (tone) {
      case "good":
        return "border-emerald-200/80 bg-emerald-50/70 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200";
      case "warn":
        return "border-amber-200/80 bg-amber-50/75 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200";
      case "danger":
        return "border-red-200/80 bg-red-50/75 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200";
      default:
        return "border-slate-200/80 bg-slate-50/80 text-slate-800 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200";
    }
  };

  return (
    <Card className={surfaceCardClass}>
      <CardHeader className="space-y-2">
        <CardTitle className="text-base text-slate-950 dark:text-slate-50">
          {title}
        </CardTitle>
        <CardDescription className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`${title}-skeleton-${index}`}
                className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-4 h-8 w-16" />
              </div>
            ))}
          </div>
        ) : error ? (
          <DataStateMessage
            title="Unable to load this section"
            description={error}
            tone="danger"
          />
        ) : isEmpty ? (
          <DataStateMessage
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className={cn("rounded-xl border p-4", toneClass(metric.tone))}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">
                  {metric.label}
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [weeklyNew, setWeeklyNew] = useState<UsersWeeklyPoint[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUserRow[]>([]);
  const [policies, setPolicies] = useState<PolicyRecord[]>([]);
  const [auditSummary, setAuditSummary] =
    useState<AuditDashboardSummary>(emptyAuditSummary);
  const [recentAuditLogs, setRecentAuditLogs] = useState<RecentAuditItem[]>([]);
  const [mangaSummary, setMangaSummary] = useState<MangaSummary | null>(null);
  const [mangaGrowth, setMangaGrowth] = useState<MangaGrowthPoint[]>([]);
  const [notiStats, setNotiStats] = useState<NotiStats | null>(null);
  const [loading, setLoading] = useState<DashboardLoadingState>(initialLoading);
  const [error, setError] = useState<DashboardErrorState>({});

  useEffect(() => {
    let mounted = true;

    if (!API) {
      const message = "Missing NEXT_PUBLIC_API_URL.";
      setError({
        summary: message,
        weekly: message,
        recent: message,
        policies: message,
        audit: message,
        mangaSummary: message,
        mangaGrowth: message,
        notiStats: message,
      });
      setLoading({
        summary: false,
        weekly: false,
        recent: false,
        policies: false,
        audit: false,
        mangaSummary: false,
        mangaGrowth: false,
        notiStats: false,
      });
      return () => {
        mounted = false;
      };
    }

    const load = async <T,>(
      key: keyof DashboardLoadingState,
      task: () => Promise<T>,
      onSuccess: (value: T) => void,
    ) => {
      try {
        const result = await task();
        if (mounted) onSuccess(result);
      } catch (e: any) {
        if (mounted) {
          setError((state) => ({ ...state, [key]: e?.message || "Error" }));
        }
      } finally {
        if (mounted) {
          setLoading((state) => ({ ...state, [key]: false }));
        }
      }
    };

    load(
      "summary",
      () =>
        axios
          .get<UserSummary>(`${API}/api/user/admin/summary`, {
            withCredentials: true,
          })
          .then((response) => response.data),
      setSummary,
    );

    load(
      "weekly",
      () =>
        axios
          .get<UsersWeeklyPoint[]>(
            `${API}/api/user/admin/charts/weekly-new?weeks=4`,
            { withCredentials: true },
          )
          .then((response) => response.data || []),
      setWeeklyNew,
    );

    load(
      "recent",
      () =>
        axios
          .get<RecentUserRow[]>(`${API}/api/user/admin/recent?limit=5`, {
            withCredentials: true,
          })
          .then((response) => response.data || []),
      setRecentUsers,
    );

    load(
      "policies",
      () =>
        axios
          .get<PolicyRecord[]>(`${API}/api/policies`, {
            withCredentials: true,
          })
          .then((response) => (Array.isArray(response.data) ? response.data : [])),
      setPolicies,
    );

    load(
      "audit",
      () =>
        axios
          .get<AuditLogsResponse>(`${API}/api/audit-logs`, {
            params: { page: 1, limit: 5 },
            withCredentials: true,
          })
          .then((response) => response.data),
      (data) => {
        const rows = Array.isArray(data?.rows) ? data.rows : [];
        const nextSummary = data?.summary ?? emptyAuditSummary;
        setRecentAuditLogs(mapRecentAuditRows(rows));
        setAuditSummary({
          total: Number(nextSummary.total ?? 0),
          unseen: Number(nextSummary.unseen ?? 0),
          pendingApproval: Number(nextSummary.pendingApproval ?? 0),
          highRisk: Number(nextSummary.highRisk ?? 0),
        });
      },
    );

    load(
      "mangaSummary",
      () =>
        axios
          .get<MangaSummary>(`${API}/api/manga/admin/summary`, {
            withCredentials: true,
          })
          .then((response) => response.data),
      setMangaSummary,
    );

    load(
      "mangaGrowth",
      () =>
        axios
          .get<MangaGrowthPoint[]>(
            `${API}/api/manga/admin/charts/monthly-growth?months=6`,
            { withCredentials: true },
          )
          .then((response) => response.data || []),
      setMangaGrowth,
    );

    load(
      "notiStats",
      () =>
        axios
          .get<NotiStats>(`${API}/api/admin/notifications/stats`, {
            withCredentials: true,
          })
          .then((response) => response.data),
      setNotiStats,
    );

    return () => {
      mounted = false;
    };
  }, [API]);

  const policySummary = useMemo(() => summarizePolicies(policies), [policies]);
  const weeklyNewChartData = useMemo(
    () =>
      weeklyNew.map((point) => ({
        label: formatReadableDate(`${point.week}T00:00:00`),
        newUsers: point.new,
      })),
    [weeklyNew],
  );
  const storiesGrowthChartData = useMemo(
    () =>
      mangaGrowth.map((point) => ({
        label: formatMonthTick(point.month),
        stories: point.stories,
      })),
    [mangaGrowth],
  );

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
  const totalPolicies = loading.policies
    ? "0"
    : policySummary.total.toLocaleString();
  const activePolicies = loading.policies
    ? "0"
    : policySummary.active.toLocaleString();
  const draftPolicies = loading.policies
    ? "0"
    : policySummary.draft.toLocaleString();
  const archivedPolicies = loading.policies
    ? "0"
    : policySummary.archived.toLocaleString();
  const unseenAuditLogs = loading.audit
    ? "0"
    : auditSummary.unseen.toLocaleString();
  const pendingAuditApprovals = loading.audit
    ? "0"
    : auditSummary.pendingApproval.toLocaleString();
  const highRiskAuditLogs = loading.audit
    ? "0"
    : auditSummary.highRisk.toLocaleString();
  const totalAuditLogs = loading.audit
    ? "0"
    : auditSummary.total.toLocaleString();
  const unreadNotifications = loading.notiStats
    ? "0"
    : (notiStats?.unread ?? 0).toString();
  const readNotifications = loading.notiStats
    ? "0"
    : (notiStats?.read ?? 0).toString();

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
                Start with governance, audit visibility, and admin follow-up
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                This dashboard keeps policy upkeep, audit oversight, and notification
                follow-up aligned with what administrators can actually access.
              </p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <AttentionCard
              title="Policy library"
              subtitle="Track the current policy set and review drafts before they go live."
              value={totalPolicies}
              detail={`${activePolicies} active, ${draftPolicies} draft`}
              href="/admin/policies"
              actionLabel="Open policy library"
              icon={FileText}
              tone="info"
              loading={loading.policies}
              error={error.policies}
            />
            <AttentionCard
              title="Audit review"
              subtitle="Keep recent admin-visible activity and compliance follow-up in view."
              value={unseenAuditLogs}
              detail={`${pendingAuditApprovals} pending approval, ${highRiskAuditLogs} high risk`}
              href="/admin/audit-logs"
              actionLabel="Open audit logs"
              icon={ShieldCheck}
              tone="danger"
              loading={loading.audit}
              error={error.audit}
            />
            <AttentionCard
              title="Unread notifications"
              subtitle="Messages and announcements that still need attention."
              value={unreadNotifications}
              detail={`${readNotifications} already marked as read`}
              href="/admin/notifications"
              actionLabel="Open notifications center"
              icon={Bell}
              tone="amber"
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
              detail={
                loading.summary
                  ? "Loading user totals..."
                  : `${formatDelta(summary?.deltaPctMoM ?? 0)} from last month`
              }
              icon={Users}
              loading={loading.summary}
              error={error.summary}
            />
            <SnapshotCard
              title="Total stories"
              value={totalStories}
              detail={
                loading.mangaSummary
                  ? "Loading story totals..."
                  : `${formatDelta(mangaSummary?.deltaPctMoM ?? 0)} from last month`
              }
              icon={BookOpen}
              loading={loading.mangaSummary}
              error={error.mangaSummary}
            />
            <SnapshotCard
              title="Outside publish"
              value={loading.mangaSummary ? "0" : unpublishedStories.toLocaleString()}
              detail={
                loading.mangaSummary
                  ? "Loading publication split..."
                  : `${publishedStories} already published`
              }
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
                  <LineChart data={weeklyNewChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: 16, borderColor: "#e2e8f0", boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)" }} />
                    <Line type="monotone" dataKey="newUsers" name="New users" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#2563eb" }} />
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
                emptyDescription="Story growth will show here once monthly growth data is available."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={storiesGrowthChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="stories-growth-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.38} />
                        <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: 16, borderColor: "#e2e8f0", boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)" }} />
                    <Area type="monotone" dataKey="stories" name="Stories" stroke="#0f766e" strokeWidth={2.5} fill="url(#stories-growth-fill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartState>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Governance Snapshot
            </p>
            <h3 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              Policy lifecycle and audit log health
            </h3>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <GovernancePanel
              title="Policy lifecycle"
              description="See how many policy records are active, still in draft, or already archived."
              metrics={[
                { label: "Total", value: totalPolicies },
                { label: "Active", value: activePolicies, tone: "good" },
                { label: "Draft", value: draftPolicies, tone: "warn" },
                { label: "Archived", value: archivedPolicies, tone: "danger" },
              ]}
              loading={loading.policies}
              error={error.policies}
              isEmpty={!loading.policies && !error.policies && policySummary.total === 0}
              emptyTitle="No policies yet"
              emptyDescription="Policy counts will appear here once the policy library has records."
            />
            <GovernancePanel
              title="Audit log health"
              description="Keep admin-visible log volume, unseen entries, and approval follow-up in one place."
              metrics={[
                { label: "Total", value: totalAuditLogs },
                { label: "Unseen", value: unseenAuditLogs, tone: "warn" },
                { label: "Pending Approval", value: pendingAuditApprovals, tone: "warn" },
                { label: "High Risk", value: highRiskAuditLogs, tone: "danger" },
              ]}
              loading={loading.audit}
              error={error.audit}
              isEmpty={!loading.audit && !error.audit && auditSummary.total === 0 && recentAuditLogs.length === 0}
              emptyTitle="No audit activity yet"
              emptyDescription="Recent audit summaries will appear here once audit log data is available."
            />
          </div>
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
                        <TableCell><Skeleton className="h-4 w-28 rounded-md" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40 rounded-md" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24 rounded-md" /></TableCell>
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
                  Recent audit activity
                </CardTitle>
                <CardDescription className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  The latest admin-visible audit entries captured by the compliance trail.
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <Link href="/admin/audit-logs">
                  <Eye className="mr-2 h-4 w-4" />
                  View audit logs
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Summary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading.audit &&
                    Array.from({ length: 3 }).map((_, index) => (
                      <TableRow key={`audit-skeleton-${index}`}>
                        <TableCell><Skeleton className="h-4 w-20 rounded-md" /></TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24 rounded-md" />
                          <Skeleton className="mt-2 h-6 w-20 rounded-full" />
                        </TableCell>
                        <TableCell><Skeleton className="h-4 w-28 rounded-md" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-full rounded-md" /></TableCell>
                      </TableRow>
                    ))}

                  {!loading.audit && error.audit && (
                    <TableStateRow
                      colSpan={4}
                      title="Unable to load recent audit activity"
                      description={error.audit}
                      tone="danger"
                    />
                  )}

                  {!loading.audit && !error.audit && recentAuditLogs.length === 0 && (
                    <TableStateRow
                      colSpan={4}
                      title="No audit activity yet"
                      description="Recent audit entries will appear here once audit log data is available."
                    />
                  )}

                  {!loading.audit &&
                    !error.audit &&
                    recentAuditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                          {log.time}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {log.actorName}
                            </p>
                            <Badge
                              className={cn(
                                "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                                roleBadgeClass(log.actorRole),
                              )}
                            >
                              {prettyRole(log.actorRole)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {clipText(log.actionLabel, 40)}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                          {log.summary}
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
                These shortcuts keep user operations, policy upkeep, audit review,
                and notification follow-up one click away from the main admin dashboard.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Button asChild variant="outline" className="h-11 rounded-xl px-4">
                <Link href="/admin/policies">
                  Policy library
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-xl px-4">
                <Link href="/admin/audit-logs">
                  Audit logs
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
                <Link href="/admin/user">
                  User operations
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
