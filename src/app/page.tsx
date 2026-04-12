"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import axios from "axios";
import { Navbar } from "@/components/navbar";
import { Star, Eye, BookOpen, ChevronLeft, ChevronRight, TrendingUp, Clock, Award } from "lucide-react";
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
    <div className="flex flex-wrap items-center gap-2">
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
              ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
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
  const LATEST_LIMIT = 16;

  const [loading, setLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [genres, setGenres] = useState<Genre[]>([]);
  const [styles, setStyles] = useState<StyleItem[]>([]);
  const [tab, setTab] = useState<RankTab>("day");
  const { theme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({
        left: -260,   // tuned for w-48 + gap-3
        behavior: "smooth",
      });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({
        left: 260,
        behavior: "smooth",
      });
    }
  };
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

  if (!mounted) return null;

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-[#1F1F1F]" : "bg-white"}`}>
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12 pt-30">
        {err && (
          <div className="rounded-xl border-2 border-red-200 dark:border-red-900/50 bg-gradient-to-r from-red-50 to-red-50/50 dark:from-red-950/30 dark:to-red-900/20 p-4 text-red-700 dark:text-red-400 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 text-red-500">⚠️</div>
              <p className="font-medium">{err}</p>
            </div>
          </div>
        )}

        {loading && !summaryItems.length && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div
                    className="relative w-full overflow-hidden rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800"
                    style={{ paddingBottom: "133%" }}
                  />
                  <div className="mt-3 h-4 w-3/4 rounded-lg bg-gray-200 dark:bg-gray-700" />
                  <div className="mt-2 h-3 w-1/2 rounded-lg bg-gray-200 dark:bg-gray-700" />
                </div>
              ))}
            </div>
          </div>
        )}

        <StoryRecomment />

        {!loading && featured.length > 0 && (
          <section className="space-y-6">
            {/* SectionLabel: icon + gradient line */}
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">Featured Stories</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Handpicked stories you'll love</p>
                  </div>
                </div>
                <Link
                  href="/stories"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:scale-105 transition-all duration-200"
                >
                  View more
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-4 h-1.5 w-24 bg-gradient-to-r from-amber-500 to-orange-400 rounded-full"></div>
            </div>

            {/* CAROUSEL WRAPPER WITH NAVIGATION BUTTONS */}
            <div className="relative group">
              {/* Scrollable carousel */}
              <div
                ref={carouselRef}
                className="no-scrollbar flex snap-x gap-4 overflow-x-auto flex-nowrap snap-mandatory scroll-smooth py-6 px-2"
              >
                {featured.map((m) => (
                  <div key={m.key} className="snap-start w-48 shrink-0">
                    <MangaCard item={m} compact />
                  </div>
                ))}
              </div>

              {/* Desktop navigation buttons (hidden on mobile) */}
              <button
                onClick={scrollLeft}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 hover:shadow-xl rounded-full border-0 transition-all active:scale-95 shadow-lg opacity-0 group-hover:opacity-100"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-6 w-6 text-white" />
              </button>

              <button
                onClick={scrollRight}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 hover:shadow-xl rounded-full border-0 transition-all active:scale-95 shadow-lg opacity-0 group-hover:opacity-100"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-6 w-6 text-white" />
              </button>
            </div>
          </section>
        )}

        <section className="grid gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-[1fr_320px]">
          <div id="latest">
            {/* SectionLabel: icon + gradient line */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 text-white shadow-lg">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">Recently Updated</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Fresh content waiting for you</p>
                  </div>
                </div>
                <Link
                  href="/stories"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg hover:scale-105 transition-all duration-200"
                >
                  View more
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="h-1.5 w-24 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"></div>
            </div>

            {loading && !latestItems.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 pt-4">
                {Array.from({ length: LATEST_LIMIT }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div
                      className="relative w-full overflow-hidden rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800"
                      style={{ paddingBottom: "133%" }}
                    />
                    <div className="mt-3 h-4 w-3/4 rounded-lg bg-gray-200 dark:bg-gray-700" />
                    <div className="mt-2 h-3 w-1/2 rounded-lg bg-gray-200 dark:bg-gray-700" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div
                  className={`transition-opacity duration-300 ${loadingPage ? "opacity-50 pointer-events-none" : ""
                    }`}
                >
                  <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
                    {latestItems.map((m) => (
                      <li key={m.key} className="min-w-0">
                        <MangaCard item={m} compact />
                      </li>
                    ))}
                  </ul>

                  {/* Pagination centered + gradient active */}
                  <div className="pt-12 flex flex-col items-center gap-4">
                    <NumberPager
                      page={latestPage}
                      totalPages={latestTotalPages}
                      onChange={changeLatestPage}
                    />
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Page {Number.isFinite(latestPage) ? latestPage : 1} of{" "}
                      {Number.isFinite(latestTotalPages) ? latestTotalPages : 1}
                    </div>
                  </div>
                </div>

                {loadingPage && (
                  <div className="mt-8 flex justify-center items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-3 border-blue-300 dark:border-blue-700 border-t-blue-500 dark:border-t-blue-400"></div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Loading page…</span>
                  </div>
                )}
              </>
            )}
          </div>

          <aside>
            {/* SectionLabel: icon + gradient line */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 text-white shadow-lg">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">Top Ranked</h2>
                </div>
              </div>

              {/* Redesigned tab pills - gradient active */}
              <div className="flex gap-2 rounded-full border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-gray-800">
                {(["day", "week", "month"] as RankTab[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setTab(k)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${tab === k
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                      : "bg-transparent hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                      }`}
                  >
                    {k === "day" ? "Today" : k === "week" ? "Week" : "Month"}
                  </button>
                ))}
              </div>
            </div>

            {/* Sidebar card: modern border + gradient background */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-6 shadow-lg mt-6">
              {/* Ranking rows with medal + gradient hover */}
              <div className="space-y-3 mt-4">
                {hotViews.map((m, idx) => (
                  <Link
                    href={m.href}
                    key={m.key}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-3 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md hover:bg-gradient-to-r hover:from-purple-50 dark:hover:from-purple-950/20 hover:to-pink-50 dark:hover:to-pink-950/20 transition-all duration-200 group"
                  >
                    <div className="relative h-16 w-12 overflow-hidden rounded-lg flex-shrink-0 shadow-md">
                      {m.coverUrl ? (
                        <img
                          src={m.coverUrl}
                          alt={m.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 text-[10px] text-gray-500 dark:text-gray-400">
                          No cover
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-foreground flex items-center gap-2">
                        {idx === 0 ? (
                          <span className="text-lg">🥇</span>
                        ) : idx === 1 ? (
                          <span className="text-lg">🥈</span>
                        ) : idx === 2 ? (
                          <span className="text-lg">🥉</span>
                        ) : (
                          <span className="font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent w-6">{idx + 1}</span>
                        )}
                        <span className="group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{m.title}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1 line-clamp-1">
                          <BookOpen className="h-3.5 w-3.5 flex-shrink-0" /> {m.chapters}
                        </span>
                        <span className="flex items-center gap-1 flex-shrink-0 font-medium text-purple-600 dark:text-purple-400">
                          <Eye className="h-3.5 w-3.5" /> {fmtViews(m.views)}
                        </span>
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