"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Navbar } from "@/components/navbar";
import { Star, Eye, BookOpen } from "lucide-react";
import { MangaCard } from "@/components/MangaCard";
import { Footer } from "@/components/footer";
import { useTheme } from "next-themes";
import StoryRecomment from "@/components/StoryRecomment";

// ================= Types
type Genre = { _id: string; name: string };
type StyleItem = { _id: string; name: string };

type MangaRaw = {
  _id: string;
  title: string;
  authorId?: string;
  summary?: string;
  coverImage?: string;
  isPublish?: boolean;
  styles?: StyleItem[];
  genres?: Genre[];
  status?: "ongoing" | "completed" | string;
  views?: number;
  createdAt?: string;
  updatedAt?: string;
  chapters_count?: number;
  rating_avg?: number;
};

type Card = {
  key: string;
  href: string;
  title: string;
  coverUrl?: string;
  published: boolean;
  status?: string;
  genres: string[];
  styles: string[];
  views: number;
  chapters: number;
  rating: number;
  updatedAtMs?: number;
};

// ================= Helpers
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
const IMAGE_BASE = `${API_BASE}/uploads`;

function normalizeToArray<T = unknown>(input: any): T[] {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.data)) return input.data;
  if (Array.isArray(input?.items)) return input.items;
  if (Array.isArray(input?.results)) return input.results;
  return [];
}

function normalizePath(path?: string) {
  if (!path) return "";
  return path
    .trim()
    .replace(/\\/g, "/")
    .replace(/^public\//, "")
    .replace(/^\/+/, "");
}

function isAbsoluteUrl(path: string) {
  return /^https?:\/\//i.test(path);
}

function buildCoverUrl(filename?: string) {
  if (!filename) return undefined;

  const cleaned = normalizePath(filename);
  if (!cleaned) return undefined;
  if (isAbsoluteUrl(cleaned)) return cleaned;

  const api = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

  if (cleaned.startsWith("assets/")) {
    return `${api}/${cleaned}`.replace(/([^:]\/)\/+/g, "$1");
  }

  return `${api}/assets/coverImages/${cleaned}`.replace(/([^:]\/)\/+/g, "$1");
}

function getKey(x: MangaRaw) {
  return x._id || x.title;
}

function getHref(x: MangaRaw) {
  return `/story/${x._id}`;
}

function timeAgo(inputMs?: number) {
  if (!inputMs) return undefined;
  const diff = Math.max(0, Date.now() - inputMs);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minutes ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hours ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} days ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} months ago`;
  return `${Math.floor(mo / 12)} years ago`;
}

function fmtViews(n?: number) {
  const v = n ?? 0;
  if (v >= 1_000_000) {
    return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (v >= 1_000) {
    return `${(v / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return `${v}`;
}

function toSafeNumber(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mapToCard(x: MangaRaw): Card {
  const updatedAtMs = x.updatedAt
    ? new Date(x.updatedAt).getTime()
    : x.createdAt
      ? new Date(x.createdAt).getTime()
      : undefined;

  return {
    key: getKey(x),
    href: getHref(x),
    title: x.title || "Unknown title",
    coverUrl: buildCoverUrl(x.coverImage),
    published: !!x.isPublish,
    status: x.status,
    genres: (x.genres || []).map((g) => g.name).slice(0, 3),
    styles: (x.styles || []).map((s) => s.name).slice(0, 2),
    views: x.views ?? 0,
    chapters: x.chapters_count ?? 0,
    rating: x.rating_avg ?? 0,
    updatedAtMs,
  };
}

function withinDays(ms?: number, days = 7) {
  if (!ms) return false;
  const delta = Date.now() - ms;
  return delta <= days * 24 * 60 * 60 * 1000;
}

// ---- Parse common API list shapes to get pagination info
function parseListResponse(
  data: any,
  fallbackLimit: number
): {
  array: MangaRaw[];
  page: number;
  limit: number;
  total?: number;
  totalPages: number;
} {
  const root = data?.data ?? data;
  const array = normalizeToArray<MangaRaw>(root);
  const p = data?.pagination ?? data?.meta ?? {};

  const page = toSafeNumber(p.page ?? data?.page, 1);
  const limit = toSafeNumber(p.limit ?? data?.limit, fallbackLimit);

  const totalRaw = p.total ?? data?.total ?? data?.count;
  const total =
    totalRaw !== undefined && Number.isFinite(Number(totalRaw))
      ? Number(totalRaw)
      : undefined;

  const totalPagesRaw =
    p.totalPages ??
    data?.totalPages ??
    (typeof total === "number" ? Math.ceil(total / Math.max(limit, 1)) : undefined);

  let totalPages = toSafeNumber(totalPagesRaw, 1);

  if (totalPages < 1) totalPages = 1;

  return {
    array,
    page: page > 0 ? page : 1,
    limit: limit > 0 ? limit : fallbackLimit,
    total,
    totalPages,
  };
}

// ================= API utils
async function fetchSummary(signal?: AbortSignal) {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const url = `${api}/api/manga/get/all?page=1&limit=200`;
  const res = await axios.get(url, { withCredentials: true, signal });
  const raw = normalizeToArray<MangaRaw>(res.data?.data ?? res.data);
  return raw.map(mapToCard);
}

async function fetchLatestPage(
  page: number,
  limit: number,
  signal?: AbortSignal
) {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const url = `${api}/api/manga/get/all?page=${page}&limit=${limit}`;
  const res = await axios.get(url, { withCredentials: true, signal });
  const parsed = parseListResponse(res.data, limit);
  console.log("fetchLatestPage", { url, parsed });
  return {
    items: parsed.array.map(mapToCard),
    page: parsed.page > 0 ? parsed.page : page,
    limit: parsed.limit > 0 ? parsed.limit : limit,
    totalPages: parsed.totalPages > 0 ? parsed.totalPages : 1,
  };
}

async function fetchFilters(signal?: AbortSignal) {
  const [genresRes, stylesRes] = await Promise.all([
    axios.get(`${API_BASE}/api/genre/`),
    axios.get(`${API_BASE}/api/styles/active`),
  ]);

  const genres: Genre[] = Array.isArray(genresRes.data) ? genresRes.data : [];
  const styles: StyleItem[] = Array.isArray(stylesRes.data)
    ? stylesRes.data
    : [];

  return { genres, styles };
}

type RankTab = "day" | "week" | "month";

// ---- Pagination UI helper
function buildPageWindow(current: number, total: number, window: number = 1) {
  const safeCurrent = Number.isFinite(current) && current > 0 ? current : 1;
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 1;

  if (safeTotal <= 9) {
    return Array.from({ length: safeTotal }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(2);
  pages.add(safeTotal);
  pages.add(Math.max(1, safeTotal - 1));

  for (let i = safeCurrent - window; i <= safeCurrent + window; i++) {
    if (i >= 1 && i <= safeTotal) pages.add(i);
  }

  const arr = Array.from(pages)
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= safeTotal)
    .sort((a, b) => a - b);

  const out: (number | "...")[] = [];

  for (let i = 0; i < arr.length; i++) {
    out.push(arr[i]);
    if (i < arr.length - 1 && arr[i + 1] !== arr[i] + 1) {
      out.push("...");
    }
  }

  return out;
}

function NumberPager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safeTotalPages =
    Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1;

  const windowed = buildPageWindow(safePage, safeTotalPages, 1);
  const btn =
    "min-w-8 h-8 px-2 inline-flex items-center justify-center rounded border text-sm";

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button
        className={`${btn} ${safePage === 1 ? "cursor-not-allowed opacity-50" : ""}`}
        onClick={() => safePage > 1 && onChange(1)}
        disabled={safePage === 1}
        aria-label="First page"
      >
        «
      </button>

      <button
        className={`${btn} ${safePage === 1 ? "cursor-not-allowed opacity-50" : ""}`}
        onClick={() => safePage > 1 && onChange(safePage - 1)}
        disabled={safePage === 1}
        aria-label="Previous page"
      >
        ‹
      </button>

      {windowed.map((it, idx) =>
        it === "..." ? (
          <span
            key={`ellipsis-${idx}`}
            className="px-1 text-gray-500 dark:text-muted-foreground"
          >
            …
          </span>
        ) : (
          <button
            key={it}
            onClick={() => onChange(it)}
            className={`${btn} ${it === safePage
                ? "bg-[#0D0D0D] dark:bg-primary text-white dark:text-primary-foreground border-black dark:border-primary"
                : "border-gray-300 dark:border-input hover:bg-gray-50 dark:hover:bg-accent"
              }`}
            aria-current={it === safePage ? "page" : undefined}
          >
            {String(it)}
          </button>
        )
      )}

      <button
        className={`${btn} ${safePage === safeTotalPages ? "cursor-not-allowed opacity-50" : ""
          }`}
        onClick={() => safePage < safeTotalPages && onChange(safePage + 1)}
        disabled={safePage === safeTotalPages}
        aria-label="Next page"
      >
        ›
      </button>

      <button
        className={`${btn} ${safePage === safeTotalPages ? "cursor-not-allowed opacity-50" : ""
          }`}
        onClick={() => safePage < safeTotalPages && onChange(safeTotalPages)}
        disabled={safePage === safeTotalPages}
        aria-label="Last page"
      >
        »
      </button>
    </div>
  );
}

// ================= Page
export default function HomePage() {
  const [summaryItems, setSummaryItems] = useState<Card[]>([]);
  const [latestItems, setLatestItems] = useState<Card[]>([]);
  const [latestPage, setLatestPage] = useState(1);
  const [latestTotalPages, setLatestTotalPages] = useState(1);
  const LATEST_LIMIT = 24;

  const [loading, setLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [genres, setGenres] = useState<Genre[]>([]);
  const [styles, setStyles] = useState<StyleItem[]>([]);
  const [tab, setTab] = useState<RankTab>("day");
  const { theme } = useTheme();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setErr(null);

    Promise.all([
      fetchSummary(controller.signal),
      fetchFilters(controller.signal),
      fetchLatestPage(1, LATEST_LIMIT, controller.signal),
    ])
      .then(([summary, { genres, styles }, latest]) => {
        setSummaryItems(summary);
        setGenres(genres);
        setStyles(styles);
        setLatestItems(latest.items);
        setLatestPage(
          Number.isFinite(latest.page) && latest.page > 0 ? latest.page : 1
        );
        setLatestTotalPages(
          Number.isFinite(latest.totalPages) && latest.totalPages > 0
            ? latest.totalPages
            : 1
        );
      })
      .catch((e) => {
        setErr(e?.response?.data?.message || e?.message || "Error loading page");
        setLatestPage(1);
        setLatestTotalPages(1);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const changeLatestPage = (page: number) => {
    const safeTargetPage =
      Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

    if (
      safeTargetPage === latestPage ||
      safeTargetPage < 1 ||
      safeTargetPage > latestTotalPages
    ) {
      return;
    }

    const controller = new AbortController();
    setLoadingPage(true);
    setErr(null);

    fetchLatestPage(safeTargetPage, LATEST_LIMIT, controller.signal)
      .then((res) => {
        setLatestItems(res.items);
        setLatestPage(
          Number.isFinite(res.page) && res.page > 0 ? res.page : safeTargetPage
        );
        setLatestTotalPages(
          Number.isFinite(res.totalPages) && res.totalPages > 0
            ? res.totalPages
            : 1
        );

        const el = document.getElementById("latest");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      })
      .catch((e) =>
        setErr(e?.response?.data?.message || e?.message || "Error loading page")
      )
      .finally(() => setLoadingPage(false));
  };

  const featured = useMemo(
    () =>
      [...summaryItems]
        .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
        .slice(0, 10),
    [summaryItems]
  );

  const hotViews = useMemo(() => {
    const windowDays = tab === "day" ? 1 : tab === "week" ? 7 : 30;
    const pool = summaryItems.filter((it) => withinDays(it.updatedAtMs, windowDays));
    const base = pool.length ? pool : summaryItems;

    return [...base]
      .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
      .slice(0, 10);
  }, [summaryItems, tab]);

  const topFollows = useMemo(
    () =>
      [...summaryItems]
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        .slice(0, 10),
    [summaryItems]
  );

  if (!mounted) return null;

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-[#1F1F1F]" : "bg-white"}`}>
      <Navbar />

      <main className="mx-auto max-w-6xl p-4 space-y-8 pt-30">
        {err && (
          <div className="rounded border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-3 text-red-700 dark:text-red-400">
            {err}
          </div>
        )}

        {loading && !summaryItems.length && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div
                  className="relative w-full overflow-hidden rounded-lg bg-gray-200 dark:bg-muted"
                  style={{ paddingBottom: "133%" }}
                />
                <div className="mt-2 h-4 w-3/4 rounded bg-gray-200 dark:bg-muted" />
                <div className="mt-1 h-3 w-1/2 rounded bg-gray-200 dark:bg-muted" />
              </div>
            ))}
          </div>
        )}

        <StoryRecomment />

        {!loading && featured.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Featured</h2>
              <Link
                href="/stories"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View more
              </Link>
            </div>

            <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto">
              {featured.map((m) => (
                <div key={m.key} className="snap-start w-48 shrink-0">
                  <MangaCard item={m} compact />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-9" id="latest">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Recently updated
              </h2>
              <Link
                href="/stories"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View more
              </Link>
            </div>

            {loading && !latestItems.length ? (
              <div className="grid [grid-template-columns:repeat(auto-fill,minmax(192px,1fr))] gap-3 sm:gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div
                      className="relative w-full overflow-hidden rounded-lg bg-gray-200 dark:bg-muted"
                      style={{ paddingBottom: "133%" }}
                    />
                    <div className="mt-2 h-4 w-3/4 rounded bg-gray-200 dark:bg-muted" />
                    <div className="mt-1 h-3 w-1/2 rounded bg-gray-200 dark:bg-muted" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <ul className="grid [grid-template-columns:repeat(auto-fill,minmax(192px,1fr))] gap-3 sm:gap-4">
                  {latestItems.map((m) => (
                    <li key={m.key} className="min-w-0">
                      <MangaCard item={m} compact />
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-600 dark:text-muted-foreground">
                    Page {Number.isFinite(latestPage) ? latestPage : 1} /{" "}
                    {Number.isFinite(latestTotalPages) ? latestTotalPages : 1}
                  </div>

                  <NumberPager
                    page={latestPage}
                    totalPages={latestTotalPages}
                    onChange={changeLatestPage}
                  />
                </div>

                {loadingPage && (
                  <div className="mt-3 text-sm text-gray-500 dark:text-muted-foreground">
                    Loading page…
                  </div>
                )}
              </>
            )}
          </div>

          <aside className="lg:col-span-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Ranking</h2>

              <div className="flex gap-1 rounded-full border border-gray-300 dark:border-input p-1 bg-background">
                {(["day", "week", "month"] as RankTab[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setTab(k)}
                    className={`rounded-full px-3 py-1 text-xs ${tab === k
                        ? "bg-black dark:bg-primary text-white dark:text-primary-foreground"
                        : "bg-white dark:bg-card text-gray-800 dark:text-foreground"
                      }`}
                  >
                    {k === "day" ? "Day" : k === "week" ? "Week" : "Month"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {hotViews.map((m, idx) => (
                <Link
                  href={m.href}
                  key={m.key}
                  className="flex items-center gap-3 rounded border border-gray-200 dark:border-input p-2 hover:bg-gray-50 dark:hover:bg-accent"
                >
                  <div className="relative h-16 w-12 overflow-hidden rounded">
                    {m.coverUrl ? (
                      <img
                        src={m.coverUrl}
                        alt={m.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-muted text-[10px] text-gray-500 dark:text-muted-foreground">
                        No cover
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {idx + 1}. {m.title}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between text-xs text-gray-600 dark:text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" /> {m.chapters} chapters
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" /> {fmtViews(m.views)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                Top rated
              </h3>

              <div className="space-y-2">
                {topFollows.map((m) => (
                  <Link
                    href={m.href}
                    key={m.key}
                    className="flex items-center gap-3 rounded border border-gray-200 dark:border-input p-2 hover:bg-gray-50 dark:hover:bg-accent"
                  >
                    <div className="relative h-12 w-9 overflow-hidden rounded">
                      {m.coverUrl ? (
                        <img
                          src={m.coverUrl}
                          alt={m.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-muted text-[10px] text-gray-500 dark:text-muted-foreground">
                          No cover
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-foreground">{m.title}</div>
                      <div className="text-xs text-gray-600 dark:text-muted-foreground flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 stroke-yellow-400" />
                        {(m.rating || 0).toFixed(1)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  );
}