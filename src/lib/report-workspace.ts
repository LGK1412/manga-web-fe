export type ReportStatus = "new" | "in-progress" | "resolved" | "rejected";
export type ReportResolutionAction =
  | "none"
  | "warning_sent"
  | "user_banned"
  | "user_muted";
export type ReportTargetType = "Manga" | "Chapter" | "Comment" | "Reply";
export type ContentTargetKind = "manga" | "chapter";
export type CommunityTargetKind = "comment" | "reply";

export interface ReportTimelineEntry {
  type?: string;
  message?: string;
  createdAt?: string;
  meta?: Record<string, unknown> | null;
}

export interface ReportUserSnapshot {
  _id?: string;
  username?: string;
  email?: string;
  role?: string;
  avatar?: string;
}

export interface ReportTargetSnapshot {
  _id?: string;
  title?: string;
  content?: string;
  manga_id?: string | { _id?: string; title?: string } | null;
  chapter_number?: number;
  order?: number;
  authorId?: { username?: string; email?: string };
  user?: { username?: string; email?: string };
  user_id?:
    | string
    | {
        _id?: string;
        username?: string;
        email?: string;
        avatar?: string;
      }
    | null;
  comment_id?: string | { _id?: string } | null;
}

export interface ReportTargetHuman {
  user_id?: string | null;
  username?: string;
  email?: string;
  avatar?: string;
}

export interface ReportTargetDetail {
  title?: string;
  content?: string;
  target_human?: ReportTargetHuman | null;
}

export interface ReportContentContext {
  manga_id?: string | null;
  manga_title?: string | null;
  target_kind?: ContentTargetKind | null;
  chapter_id?: string | null;
  chapter_number?: number | null;
  chapter_title?: string | null;
}

export interface WorkspaceReport {
  _id: string;
  reportCode?: string;
  reporter_id?: ReportUserSnapshot;
  target_type: ReportTargetType | string;
  target_id?: ReportTargetSnapshot;
  target_detail?: ReportTargetDetail;
  content_context?: ReportContentContext | null;
  reason: string;
  description?: string;
  status: ReportStatus | string;
  createdAt?: string;
  updatedAt?: string;
  resolver_id?: string;
  resolution_note?: string;
  timeline?: ReportTimelineEntry[];
  allowed_resolution_actions?: Array<ReportResolutionAction | string>;
}

export type ContentReport = WorkspaceReport;

export interface ReportedAgainstMeta {
  key: string;
  userId?: string | null;
  name: string;
  email: string | null;
  avatar?: string;
}

export interface ReporterMeta {
  key: string;
  userId?: string | null;
  name: string;
  email: string | null;
  avatar?: string;
  role?: string;
}

export interface MergedReportMoment {
  reportId: string;
  reportCode?: string;
  createdAt?: string;
  status: string;
}

export interface MergedReportItem {
  key: string;
  reason: string;
  reporter: ReporterMeta;
  reports: WorkspaceReport[];
  status: ReportStatus;
  isDone: boolean;
  latestActivityAt?: string;
  latestReportAt?: string;
  latestReport: WorkspaceReport;
  latestDescription?: string;
  latestResolutionNote?: string;
  moments: MergedReportMoment[];
}

export interface ReportTargetBucket {
  key: string;
  kind: ContentTargetKind;
  label: string;
  subtitle?: string;
  chapterId?: string;
  chapterNumber?: number | null;
  mangaId: string;
  mangaTitle: string;
  reports: WorkspaceReport[];
  mergedItems: MergedReportItem[];
  latestActivityAt?: string;
  doneCount: number;
  totalCount: number;
}

export interface ReportMangaBucket {
  key: string;
  mangaId: string;
  mangaTitle: string;
  reports: WorkspaceReport[];
  targetBuckets: ReportTargetBucket[];
  latestActivityAt?: string;
  doneCount: number;
  totalCount: number;
}

export interface ReportAgainstGroup {
  key: string;
  meta: ReportedAgainstMeta;
  reports: WorkspaceReport[];
  mangaBuckets: ReportMangaBucket[];
  latestActivityAt?: string;
  doneCount: number;
  totalCount: number;
  mangaCount: number;
  status: "done" | "in-progress";
}

export interface CommunityReportTargetBucket {
  key: string;
  targetId: string;
  kind: CommunityTargetKind;
  label: string;
  excerpt: string;
  content: string;
  reports: WorkspaceReport[];
  mergedItems: MergedReportItem[];
  latestActivityAt?: string;
  doneCount: number;
  totalCount: number;
}

export interface CommunityReportKindSection {
  key: CommunityTargetKind;
  label: string;
  targetBuckets: CommunityReportTargetBucket[];
  latestActivityAt?: string;
  doneCount: number;
  totalCount: number;
  targetCount: number;
}

export interface CommunityReportAgainstGroup {
  key: string;
  meta: ReportedAgainstMeta;
  reports: WorkspaceReport[];
  sections: CommunityReportKindSection[];
  latestActivityAt?: string;
  doneCount: number;
  totalCount: number;
  targetCount: number;
  commentCount: number;
  replyCount: number;
  status: "done" | "in-progress";
}

function toIdString(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "_id" in (value as any)) {
    return String((value as any)._id || "");
  }
  return String(value);
}

function compareDatesDesc(a?: string | null, b?: string | null) {
  const first = a ? new Date(a).getTime() : 0;
  const second = b ? new Date(b).getTime() : 0;
  return second - first;
}

function safeCompareStrings(a?: string | null, b?: string | null) {
  return String(a || "").localeCompare(String(b || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
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

function truncateText(content: string, maxLength = 84) {
  const normalized = extractPlainText(content);
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function getCommunityTargetKind(
  report: WorkspaceReport
): CommunityTargetKind | null {
  if (report.target_type === "Comment") return "comment";
  if (report.target_type === "Reply") return "reply";
  return null;
}

function getCommunityTargetContent(report: WorkspaceReport) {
  return String(
    report.target_detail?.content || report.target_id?.content || ""
  ).trim();
}

function getMergedStatus(reports: WorkspaceReport[]): ReportStatus {
  const unresolved = [...reports]
    .filter((report) => !isDoneStatus(report.status))
    .sort((first, second) =>
      compareDatesDesc(getLatestActivityAt(first), getLatestActivityAt(second))
    );

  if (unresolved.length > 0) {
    const status = unresolved[0]?.status;
    if (status === "in-progress") return "in-progress";
    return "new";
  }

  const latestResolved = [...reports].sort((first, second) =>
    compareDatesDesc(getLatestActivityAt(first), getLatestActivityAt(second))
  )[0];

  return latestResolved?.status === "rejected" ? "rejected" : "resolved";
}

function buildMergedItems(
  reports: WorkspaceReport[],
  getMergeKey: (report: WorkspaceReport) => string
) {
  const mergedMap = new Map<string, WorkspaceReport[]>();

  reports.forEach((report) => {
    const mergedKey = getMergeKey(report);
    const existing = mergedMap.get(mergedKey);

    if (existing) {
      existing.push(report);
      return;
    }

    mergedMap.set(mergedKey, [report]);
  });

  return Array.from(mergedMap.entries())
    .map(([mergedKey, mergedReports]) => {
      const reportsByLatest = [...mergedReports].sort((first, second) =>
        compareDatesDesc(getLatestActivityAt(first), getLatestActivityAt(second))
      );
      const reporter = getReporterMeta(reportsByLatest[0]);
      const latestReport = reportsByLatest[0];
      const done = reportsByLatest.every((report) => isDoneStatus(report.status));

      return {
        key: mergedKey,
        reason: latestReport.reason,
        reporter,
        reports: reportsByLatest,
        status: getMergedStatus(reportsByLatest),
        isDone: done,
        latestActivityAt: getLatestActivityAt(latestReport),
        latestReportAt: latestReport.createdAt,
        latestReport,
        latestDescription:
          reportsByLatest.find((report) => report.description?.trim())
            ?.description || "",
        latestResolutionNote:
          reportsByLatest.find((report) => report.resolution_note?.trim())
            ?.resolution_note || "",
        moments: reportsByLatest
          .map((report) => ({
            reportId: report._id,
            reportCode: report.reportCode,
            createdAt: report.createdAt,
            status: String(report.status || "new"),
          }))
          .sort((first, second) =>
            compareDatesDesc(first.createdAt, second.createdAt)
          ),
      } satisfies MergedReportItem;
    })
    .sort((first, second) =>
      compareDatesDesc(first.latestActivityAt, second.latestActivityAt)
    );
}

export function isAbsoluteUrl(value: string) {
  return /^(?:[a-z]+:)?\/\//i.test(value) || value.startsWith("data:");
}

export function resolveAvatarUrl(rawAvatar?: string, apiUrl?: string) {
  if (!rawAvatar) return undefined;
  if (isAbsoluteUrl(rawAvatar)) return rawAvatar;
  if (!apiUrl) return undefined;

  const normalizedApi = apiUrl.replace(/\/+$/, "");
  const normalizedAvatar = rawAvatar.replace(/^\/+/, "");
  return `${normalizedApi}/assets/avatars/${normalizedAvatar}`;
}

export function getInitial(value?: string) {
  return value?.trim()?.charAt(0)?.toUpperCase() || "U";
}

export function isDoneStatus(status?: string) {
  return status === "resolved" || status === "rejected";
}

export function isContentReport(report: WorkspaceReport) {
  return report.target_type === "Manga" || report.target_type === "Chapter";
}

export function isCommunityReport(report: WorkspaceReport) {
  return report.target_type === "Comment" || report.target_type === "Reply";
}

export function getReportedAgainstMeta(
  report: WorkspaceReport
): ReportedAgainstMeta {
  const userId = report.target_detail?.target_human?.user_id || null;
  const name =
    report.target_detail?.target_human?.username ||
    report.target_id?.authorId?.username ||
    report.target_id?.user?.username ||
    (typeof report.target_id?.user_id === "object"
      ? report.target_id.user_id?.username
      : undefined) ||
    "Unknown user";
  const email =
    report.target_detail?.target_human?.email ||
    report.target_id?.authorId?.email ||
    report.target_id?.user?.email ||
    (typeof report.target_id?.user_id === "object"
      ? report.target_id.user_id?.email
      : undefined) ||
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
    avatar:
      report.target_detail?.target_human?.avatar ||
      (typeof report.target_id?.user_id === "object"
        ? report.target_id.user_id?.avatar
        : undefined),
  };
}

export function getReporterMeta(report: WorkspaceReport): ReporterMeta {
  const userId = report.reporter_id?._id || null;
  const name = report.reporter_id?.username || "Unknown reporter";
  const email = report.reporter_id?.email || null;

  return {
    key: userId
      ? `user:${userId}`
      : email
        ? `email:${email.toLowerCase()}`
        : `reporter:${report._id}`,
    userId,
    name,
    email,
    avatar: report.reporter_id?.avatar,
    role: report.reporter_id?.role,
  };
}

export function getLatestActivityAt(report: WorkspaceReport) {
  return report.updatedAt || report.createdAt;
}

export function normalizeContentContext(
  report: WorkspaceReport
): ReportContentContext | null {
  const context = report.content_context || null;

  if (context?.manga_id && context?.target_kind) {
    return {
      manga_id: context.manga_id,
      manga_title: context.manga_title || null,
      target_kind: context.target_kind,
      chapter_id: context.chapter_id || null,
      chapter_number:
        typeof context.chapter_number === "number"
          ? context.chapter_number
          : null,
      chapter_title: context.chapter_title || null,
    };
  }

  if (report.target_type === "Manga") {
    const mangaId = toIdString(report.target_id?._id);
    if (!mangaId) return null;

    return {
      manga_id: mangaId,
      manga_title:
        report.target_detail?.title || report.target_id?.title || null,
      target_kind: "manga",
      chapter_id: null,
      chapter_number: null,
      chapter_title: null,
    };
  }

  if (report.target_type === "Chapter") {
    const chapterId = toIdString(report.target_id?._id);
    const mangaId = toIdString(report.target_id?.manga_id);
    if (!chapterId || !mangaId) return null;

    const rawChapterNumber =
      typeof report.target_id?.chapter_number === "number"
        ? report.target_id.chapter_number
        : typeof report.target_id?.order === "number"
          ? report.target_id.order
          : null;

    return {
      manga_id: mangaId,
      manga_title: null,
      target_kind: "chapter",
      chapter_id: chapterId,
      chapter_number: rawChapterNumber,
      chapter_title:
        report.target_id?.title || report.target_detail?.title || null,
    };
  }

  return null;
}

export function getAllowedResolutionActions(reports: WorkspaceReport[]) {
  const seen = new Set<ReportResolutionAction>();

  reports.forEach((report) => {
    report.allowed_resolution_actions?.forEach((action) => {
      if (
        action === "none" ||
        action === "warning_sent" ||
        action === "user_banned" ||
        action === "user_muted"
      ) {
        seen.add(action);
      }
    });
  });

  return ["none", "warning_sent", "user_banned", "user_muted"].filter((action) =>
    seen.has(action as ReportResolutionAction)
  ) as ReportResolutionAction[];
}

export function getCommunityTargetExcerpt(report: WorkspaceReport, maxLength = 84) {
  const preview = truncateText(getCommunityTargetContent(report), maxLength);
  if (preview) return preview;

  const kind = getCommunityTargetKind(report);
  return kind === "reply" ? "Reply content unavailable" : "Comment content unavailable";
}

export function buildContentReportGroups(
  reports: WorkspaceReport[]
): ReportAgainstGroup[] {
  const outerGroups = new Map<
    string,
    {
      meta: ReportedAgainstMeta;
      reports: WorkspaceReport[];
      mangas: Map<
        string,
        {
          mangaId: string;
          mangaTitle: string;
          reports: WorkspaceReport[];
          targets: Map<
            string,
            {
              key: string;
              kind: ContentTargetKind;
              label: string;
              subtitle?: string;
              mangaId: string;
              mangaTitle: string;
              chapterId?: string;
              chapterNumber?: number | null;
              reports: WorkspaceReport[];
            }
          >;
        }
      >;
    }
  >();

  reports.filter(isContentReport).forEach((report) => {
    const context = normalizeContentContext(report);
    if (!context?.manga_id || !context.target_kind) return;

    const meta = getReportedAgainstMeta(report);
    const mangaTitle =
      context.manga_title ||
      (context.target_kind === "manga"
        ? report.target_detail?.title || report.target_id?.title || "Untitled manga"
        : "Untitled manga");

    const outer =
      outerGroups.get(meta.key) ||
      (() => {
        const next = {
          meta,
          reports: [] as WorkspaceReport[],
          mangas: new Map(),
        };
        outerGroups.set(meta.key, next);
        return next;
      })();

    outer.reports.push(report);

    const mangaBucket =
      outer.mangas.get(context.manga_id) ||
      (() => {
        const next = {
          mangaId: context.manga_id as string,
          mangaTitle,
          reports: [] as WorkspaceReport[],
          targets: new Map(),
        };
        outer.mangas.set(context.manga_id as string, next);
        return next;
      })();

    mangaBucket.mangaTitle = mangaBucket.mangaTitle || mangaTitle;
    mangaBucket.reports.push(report);

    const targetKey =
      context.target_kind === "manga"
        ? `manga:${context.manga_id}`
        : `chapter:${context.chapter_id || report._id}`;
    const targetLabel =
      context.target_kind === "manga"
        ? "Only manga"
        : `Chapter ${context.chapter_number ?? "?"}`;
    const targetSubtitle =
      context.target_kind === "chapter" && context.chapter_title
        ? context.chapter_title
        : undefined;

    const targetBucket =
      mangaBucket.targets.get(targetKey) ||
      (() => {
        const next = {
          key: targetKey,
          kind: context.target_kind as ContentTargetKind,
          label: targetLabel,
          subtitle: targetSubtitle,
          mangaId: context.manga_id as string,
          mangaTitle,
          chapterId: context.chapter_id || undefined,
          chapterNumber:
            typeof context.chapter_number === "number"
              ? context.chapter_number
              : null,
          reports: [] as WorkspaceReport[],
        };
        mangaBucket.targets.set(targetKey, next);
        return next;
      })();

    targetBucket.subtitle = targetBucket.subtitle || targetSubtitle;
    targetBucket.reports.push(report);
  });

  const groups = Array.from(outerGroups.entries()).map(([key, value]) => {
    const mangaBuckets = Array.from(value.mangas.values()).map((manga) => {
      const targetBuckets = Array.from(manga.targets.values()).map((target) => {
        const mergedItems = buildMergedItems(target.reports, (report) => {
          const reporter = getReporterMeta(report);
          return `${reporter.key}::${report.reason.toLowerCase()}::${target.key}`;
        });

        const doneCount = mergedItems.filter((item) => item.isDone).length;

        return {
          key: target.key,
          kind: target.kind,
          label: target.label,
          subtitle: target.subtitle,
          chapterId: target.chapterId,
          chapterNumber: target.chapterNumber,
          mangaId: target.mangaId,
          mangaTitle: target.mangaTitle,
          reports: [...target.reports].sort((first, second) =>
            compareDatesDesc(getLatestActivityAt(first), getLatestActivityAt(second))
          ),
          mergedItems,
          latestActivityAt: mergedItems[0]?.latestActivityAt,
          doneCount,
          totalCount: mergedItems.length,
        } satisfies ReportTargetBucket;
      });

      targetBuckets.sort((first, second) => {
        if (first.kind !== second.kind) {
          return first.kind === "manga" ? -1 : 1;
        }

        if (first.kind === "chapter" && second.kind === "chapter") {
          return (first.chapterNumber ?? Number.MAX_SAFE_INTEGER) -
            (second.chapterNumber ?? Number.MAX_SAFE_INTEGER);
        }

        return safeCompareStrings(first.label, second.label);
      });

      const doneCount = targetBuckets.reduce(
        (total, bucket) => total + bucket.doneCount,
        0
      );
      const totalCount = targetBuckets.reduce(
        (total, bucket) => total + bucket.totalCount,
        0
      );

      return {
        key: manga.mangaId,
        mangaId: manga.mangaId,
        mangaTitle: manga.mangaTitle,
        reports: [...manga.reports].sort((first, second) =>
          compareDatesDesc(getLatestActivityAt(first), getLatestActivityAt(second))
        ),
        targetBuckets,
        latestActivityAt: [...targetBuckets].sort((first, second) =>
          compareDatesDesc(first.latestActivityAt, second.latestActivityAt)
        )[0]?.latestActivityAt,
        doneCount,
        totalCount,
      } satisfies ReportMangaBucket;
    });

    mangaBuckets.sort((first, second) =>
      compareDatesDesc(first.latestActivityAt, second.latestActivityAt)
    );

    const doneCount = mangaBuckets.reduce(
      (total, bucket) => total + bucket.doneCount,
      0
    );
    const totalCount = mangaBuckets.reduce(
      (total, bucket) => total + bucket.totalCount,
      0
    );

    return {
      key,
      meta: value.meta,
      reports: [...value.reports].sort((first, second) =>
        compareDatesDesc(getLatestActivityAt(first), getLatestActivityAt(second))
      ),
      mangaBuckets,
      latestActivityAt: mangaBuckets[0]?.latestActivityAt,
      doneCount,
      totalCount,
      mangaCount: mangaBuckets.length,
      status: doneCount === totalCount && totalCount > 0 ? "done" : "in-progress",
    } satisfies ReportAgainstGroup;
  });

  return groups.sort((first, second) =>
    compareDatesDesc(first.latestActivityAt, second.latestActivityAt)
  );
}

export function buildCommunityReportGroups(
  reports: WorkspaceReport[]
): CommunityReportAgainstGroup[] {
  const outerGroups = new Map<
    string,
    {
      meta: ReportedAgainstMeta;
      reports: WorkspaceReport[];
      targets: Map<
        string,
        {
          key: string;
          targetId: string;
          kind: CommunityTargetKind;
          label: string;
          excerpt: string;
          content: string;
          reports: WorkspaceReport[];
        }
      >;
    }
  >();

  reports.filter(isCommunityReport).forEach((report) => {
    const kind = getCommunityTargetKind(report);
    if (!kind) return;

    const meta = getReportedAgainstMeta(report);
    const targetId = toIdString(report.target_id?._id) || report._id;
    const targetKey = `${kind}:${targetId}`;
    const content = getCommunityTargetContent(report);
    const excerpt = getCommunityTargetExcerpt(report);
    const label = kind === "reply" ? "Reply" : "Comment";

    const outer =
      outerGroups.get(meta.key) ||
      (() => {
        const next = {
          meta,
          reports: [] as WorkspaceReport[],
          targets: new Map(),
        };
        outerGroups.set(meta.key, next);
        return next;
      })();

    outer.reports.push(report);

    const targetBucket =
      outer.targets.get(targetKey) ||
      (() => {
        const next = {
          key: targetKey,
          targetId,
          kind,
          label,
          excerpt,
          content,
          reports: [] as WorkspaceReport[],
        };
        outer.targets.set(targetKey, next);
        return next;
      })();

    targetBucket.excerpt = targetBucket.excerpt || excerpt;
    targetBucket.content = targetBucket.content || content;
    targetBucket.reports.push(report);
  });

  const groups = Array.from(outerGroups.entries()).map(([key, value]) => {
    const targetBuckets = Array.from(value.targets.values()).map((target) => {
      const mergedItems = buildMergedItems(target.reports, (report) => {
        const reporter = getReporterMeta(report);
        return `${reporter.key}::${report.reason.toLowerCase()}::${target.key}`;
      });

      const doneCount = mergedItems.filter((item) => item.isDone).length;

      return {
        key: target.key,
        targetId: target.targetId,
        kind: target.kind,
        label: target.label,
        excerpt: target.excerpt,
        content: target.content,
        reports: [...target.reports].sort((first, second) =>
          compareDatesDesc(getLatestActivityAt(first), getLatestActivityAt(second))
        ),
        mergedItems,
        latestActivityAt: mergedItems[0]?.latestActivityAt,
        doneCount,
        totalCount: mergedItems.length,
      } satisfies CommunityReportTargetBucket;
    });

    targetBuckets.sort((first, second) =>
      compareDatesDesc(first.latestActivityAt, second.latestActivityAt)
    );

    const sections = (["comment", "reply"] as CommunityTargetKind[])
      .map((kind) => {
        const buckets = targetBuckets.filter((bucket) => bucket.kind === kind);
        if (!buckets.length) return null;

        const doneCount = buckets.reduce(
          (total, bucket) => total + bucket.doneCount,
          0
        );
        const totalCount = buckets.reduce(
          (total, bucket) => total + bucket.totalCount,
          0
        );

        return {
          key: kind,
          label: kind === "reply" ? "Replies" : "Comments",
          targetBuckets: buckets,
          latestActivityAt: buckets[0]?.latestActivityAt,
          doneCount,
          totalCount,
          targetCount: buckets.length,
        } satisfies CommunityReportKindSection;
      })
      .filter(Boolean) as CommunityReportKindSection[];

    const doneCount = sections.reduce(
      (total, section) => total + section.doneCount,
      0
    );
    const totalCount = sections.reduce(
      (total, section) => total + section.totalCount,
      0
    );
    const commentCount =
      sections.find((section) => section.key === "comment")?.targetCount || 0;
    const replyCount =
      sections.find((section) => section.key === "reply")?.targetCount || 0;

    return {
      key,
      meta: value.meta,
      reports: [...value.reports].sort((first, second) =>
        compareDatesDesc(getLatestActivityAt(first), getLatestActivityAt(second))
      ),
      sections,
      latestActivityAt: sections[0]?.latestActivityAt,
      doneCount,
      totalCount,
      targetCount: targetBuckets.length,
      commentCount,
      replyCount,
      status: doneCount === totalCount && totalCount > 0 ? "done" : "in-progress",
    } satisfies CommunityReportAgainstGroup;
  });

  return groups.sort((first, second) =>
    compareDatesDesc(first.latestActivityAt, second.latestActivityAt)
  );
}

export const buildReportAgainstGroups = buildContentReportGroups;

export function findReportLocation(
  groups: ReportAgainstGroup[],
  reportId: string
) {
  for (const group of groups) {
    for (const manga of group.mangaBuckets) {
      for (const target of manga.targetBuckets) {
        for (const item of target.mergedItems) {
          if (item.reports.some((report) => report._id === reportId)) {
            return {
              groupKey: group.key,
              mangaId: manga.mangaId,
              targetKey: target.key,
              itemKey: item.key,
            };
          }
        }
      }
    }
  }

  return null;
}

export function findCommunityReportLocation(
  groups: CommunityReportAgainstGroup[],
  reportId: string
) {
  for (const group of groups) {
    for (const section of group.sections) {
      for (const target of section.targetBuckets) {
        for (const item of target.mergedItems) {
          if (item.reports.some((report) => report._id === reportId)) {
            return {
              groupKey: group.key,
              sectionKey: section.key,
              targetKey: target.key,
              itemKey: item.key,
            };
          }
        }
      }
    }
  }

  return null;
}

export function getPageNumbers(totalPages: number, currentPage: number) {
  if (totalPages <= 1) return [1];

  const pages = new Set<number>([1, totalPages, currentPage]);
  if (currentPage > 1) pages.add(currentPage - 1);
  if (currentPage < totalPages) pages.add(currentPage + 1);

  return Array.from(pages).sort((first, second) => first - second);
}

export function formatReportDateTime(isoString?: string) {
  if (!isoString) return "N/A";

  return new Date(isoString).toLocaleString("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour12: false,
  });
}

export function formatReasonLabel(reason?: string) {
  const normalized = String(reason || "").trim();
  return normalized || "Other";
}

export function formatResolutionActionLabel(action?: ReportResolutionAction | string) {
  switch (action) {
    case "warning_sent":
      return "Send Warning & Resolve";
    case "user_banned":
      return "Ban User & Resolve";
    case "user_muted":
      return "Mute User & Resolve";
    default:
      return "Resolve";
  }
}
