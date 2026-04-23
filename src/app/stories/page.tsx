// app/stories/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Navbar } from "@/components/navbar";
import { MangaCard } from "@/components/MangaCard";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react";

// ===== Types
type Genre = { _id: string; name: string; description?: string };
type StyleItem = { _id: string; name: string; description?: string };

type MangaRaw = {
  _id: string | number;
  id?: string | number;
  slug?: string;
  title?: string;
  name?: string;

  coverUrl?: string;
  cover?: string;
  coverImage?: string;
  thumbnail?: string;
  thumb?: string;
  image_url?: string;

  latest_chapter?: { title?: string; order?: number; createdAt?: string };
  latestChapter?: { number?: number; name?: string; createdAt?: string } | null;
  lastChapter?: number | string;

  updatedAt?: string | number | Date;
  createdAt?: string | number | Date;
  views?: number;
  viewCount?: number;
  follows?: number;
  status?: "ongoing" | "completed" | string;

  genres?: { _id: string; name: string }[] | string[];
  styles?: { _id: string; name: string }[] | string[];

  chapters_count?: number;
  rating_avg?: number;
  isPublish?: boolean;
  licenseStatus?: string;
};

type CardItem = {
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
  licenseStatus?: string;

  _genreIds?: string[];
  _styleIds?: string[];
  _views?: number;
  _follows?: number;
  _updatedAt?: number;
};

// ===== Helpers
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

function normalizeToArray<T = unknown>(input: any): T[] {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.data)) return input.data;
  if (Array.isArray(input?.items)) return input.items;
  if (Array.isArray(input?.results)) return input.results;
  return [];
}

function toNumber(n: any): number | undefined {
  const x = typeof n === "string" ? Number(n) : n;
  return Number.isFinite(x) ? (x as number) : undefined;
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

  if (cleaned.startsWith("assets/")) {
    return `${API_BASE}/${cleaned}`.replace(/([^:]\/)\/+/g, "$1");
  }

  return `${API_BASE}/assets/coverImages/${cleaned}`.replace(
    /([^:]\/)\/+/g,
    "$1"
  );
}

function getTitle(x: MangaRaw) {
  return (x.title || x.name || "Unknown title").toString();
}

function getKey(x: MangaRaw) {
  return String(x._id ?? x.id ?? x.slug ?? getTitle(x));
}

function getHref(x: MangaRaw) {
  if (x.slug) return `/story/${encodeURIComponent(x.slug)}`;
  const id = x._id ?? x.id;
  if (id !== undefined && id !== null) {
    return `/story/${encodeURIComponent(String(id))}`;
  }
  return `/stories`;
}

function extractIds(arr: any): string[] | undefined {
  if (!Array.isArray(arr)) return undefined;
  const ids = arr
    .map((g) => (typeof g === "string" ? g : g?._id))
    .filter(Boolean) as string[];
  return ids.length ? ids : undefined;
}

function mapToCard(x: MangaRaw): CardItem {
  const updatedAtMs = x.updatedAt
    ? new Date(x.updatedAt as any).getTime()
    : x.createdAt
      ? new Date(x.createdAt as any).getTime()
      : undefined;

  const views = toNumber(x.views ?? x.viewCount) ?? 0;
  const follows = toNumber(x.follows) ?? 0;

  const genresText: string[] = Array.isArray(x.genres)
    ? (x.genres as any[])
      .map((g) => (typeof g === "string" ? g : g?.name))
      .filter(Boolean)
    : [];

  const stylesText: string[] = Array.isArray(x.styles)
    ? (x.styles as any[])
      .map((s) => (typeof s === "string" ? s : s?.name))
      .filter(Boolean)
    : [];

  const statusNorm = x.status
    ? /complete|hoàn/i.test(x.status)
      ? "complete"
      : /ongoing|đang/i.test(x.status)
        ? "ongoing"
        : x.status
    : undefined;

  return {
    key: getKey(x),
    href: getHref(x),
    title: getTitle(x),
    coverUrl: buildCoverUrl(
      x.coverImage ||
      x.coverUrl ||
      x.cover ||
      x.thumbnail ||
      x.thumb ||
      x.image_url
    ),
    published: x.isPublish ?? true,
    status: statusNorm,
    genres: genresText.slice(0, 3),
    styles: stylesText.slice(0, 2),
    views,
    chapters: x.chapters_count ?? 0,
    rating: x.rating_avg ?? 0,
    updatedAtMs,
    licenseStatus: x.licenseStatus,

    _genreIds: extractIds(x.genres),
    _styleIds: extractIds(x.styles),
    _views: views,
    _follows: follows,
    _updatedAt: updatedAtMs,
  };
}

// ===== UI constants
const SORTS: { key: "updated" | "views" | "follows"; label: string }[] = [
  { key: "updated", label: "Recently Updated" },
  { key: "views", label: "Most Viewed" },
  { key: "follows", label: "Most Followed" },
];

const PAGE_SIZE = 20;

function buildGetAllUrl(page: number, limit: number) {
  const base = `${API_BASE}/api/manga/get/all`;
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("limit", String(limit));
  return `${base}?${p.toString()}`;
}

async function fetchFilters(signal?: AbortSignal) {
  const [genresRes, stylesRes] = await Promise.all([
    axios.get(`${API_BASE}/api/genre/`, { withCredentials: true, signal }),
    axios.get(`${API_BASE}/api/styles/active`, {
      withCredentials: true,
      signal,
    }),
  ]);

  const genres: Genre[] = Array.isArray(genresRes.data) ? genresRes.data : [];
  const styles: StyleItem[] = Array.isArray(stylesRes.data)
    ? stylesRes.data
    : [];

  return { genres, styles };
}

// ===== Facet helpers
function buildFacetCounts(
  items: CardItem[],
  q: string,
  selectedGenreIds: string[],
  selectedStyleIds: string[]
) {
  const qLower = q.trim().toLowerCase();

  const matchQ = (it: CardItem) =>
    !qLower || it.title.toLowerCase().includes(qLower);

  const byGenre: Record<string, number> = {};
  const baseForGenre = items.filter(
    (it) =>
      matchQ(it) &&
      (!selectedStyleIds.length ||
        selectedStyleIds.every((id) => (it._styleIds || []).includes(id))) // SỬA: dùng every
  );

  for (const it of baseForGenre) {
    for (const gid of it._genreIds || []) {
      byGenre[gid] = (byGenre[gid] || 0) + 1;
    }
  }

  const byStyle: Record<string, number> = {};
  const baseForStyle = items.filter(
    (it) =>
      matchQ(it) &&
      (!selectedGenreIds.length ||
        selectedGenreIds.every((id) => (it._genreIds || []).includes(id))) // SỬA: dùng every
  );

  for (const it of baseForStyle) {
    for (const sid of it._styleIds || []) {
      byStyle[sid] = (byStyle[sid] || 0) + 1;
    }
  }

  return { byGenre, byStyle };
}

export default function StoriesPage() {
  const [q, setQ] = useState("");

  const [sortKey, setSortKey] = useState<"updated" | "views" | "follows">(
    "updated"
  );
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>([]);

  const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);
  const [availableStyles, setAvailableStyles] = useState<StyleItem[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [allItems, setAllItems] = useState<CardItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [goToPageOpen, setGoToPageOpen] = useState(false);
  const [goToPageInput, setGoToPageInput] = useState("");
  const goToPageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const syncQ = () => {
      try {
        const v = sessionStorage.getItem("stories:q") || "";
        if (v) setQ(v);
      } catch { }
    };

    syncQ();
    window.addEventListener("stories:syncQ", syncQ);

    return () => {
      window.removeEventListener("stories:syncQ", syncQ);
      try {
        sessionStorage.removeItem("stories:q");
        sessionStorage.removeItem("stories:q:ts");
      } catch { }
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingFilters(true);

    fetchFilters(controller.signal)
      .then(({ genres, styles }) => {
        setAvailableGenres(genres);
        setAvailableStyles(styles);
      })
      .catch((e) => console.error("Load filters failed:", e?.message || e))
      .finally(() => setLoadingFilters(false));

    return () => controller.abort();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [q, selectedGenreIds.join(","), selectedStyleIds.join(","), sortKey]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const fetchPage = async () => {
      setLoading(true);
      try {
        const url = buildGetAllUrl(currentPage, PAGE_SIZE);
        const res = await axios.get(url, {
          withCredentials: true,
          signal: controller.signal,
        });

        const payload = res.data;
        const raw = normalizeToArray<MangaRaw>(payload?.data ?? payload);
        const mapped = raw.map(mapToCard);

        if (!cancelled) {
          setErr(null);
          setAllItems(mapped);
          if (typeof payload?.total === "number") {
            setTotal(payload.total);
          }
        }
      } catch (e: any) {
        if (axios.isCancel(e)) return;
        if (!cancelled) {
          setErr(
            e?.response?.data?.message || e?.message || "Failed to load data"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const t = setTimeout(fetchPage, 120);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(t);
    };
  }, [currentPage]);

  useEffect(() => {
    if (total === null) return;
    const max = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > max) setCurrentPage(max);
  }, [total, currentPage]);

  useEffect(() => {
    if (!goToPageOpen) return;
    const id = requestAnimationFrame(() => {
      goToPageInputRef.current?.focus();
      goToPageInputRef.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, [goToPageOpen]);

  const submitGoToPage = () => {
    const n = parseInt(goToPageInput.trim(), 10);
    if (!Number.isFinite(n) || n < 1 || n > totalPages) return;
    setCurrentPage(n);
    setGoToPageOpen(false);
    setGoToPageInput("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleGenre = (id: string) => {
    setSelectedGenreIds((prev) => {
      const set = new Set(prev);
      set.has(id) ? set.delete(id) : set.add(id);
      return Array.from(set);
    });
  };

  const toggleStyle = (id: string) => {
    setSelectedStyleIds((prev) => {
      const set = new Set(prev);
      set.has(id) ? set.delete(id) : set.add(id);
      return Array.from(set);
    });
  };

  const clearFilters = () => {
    setSelectedGenreIds([]);
    setSelectedStyleIds([]);
    setSortKey("updated");
    try {
      sessionStorage.removeItem("stories:q");
    } catch { }
    setQ("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredSorted = useMemo(() => {
    let list = allItems;

    if (q) {
      const qLower = q.toLowerCase();
      list = list.filter((it) => it.title.toLowerCase().includes(qLower));
    }

    if (selectedGenreIds.length) {
      list = list.filter((it) =>
        selectedGenreIds.every((id) => (it._genreIds || []).includes(id))
      );
    }
    if (selectedStyleIds.length) {
      list = list.filter((it) =>
        selectedStyleIds.every((id) => (it._styleIds || []).includes(id))
      );
    }

    const arr = [...list];

    if (sortKey === "updated") {
      arr.sort((a, b) => (b._updatedAt ?? 0) - (a._updatedAt ?? 0));
    } else if (sortKey === "views") {
      arr.sort((a, b) => (b._views ?? 0) - (a._views ?? 0));
    } else if (sortKey === "follows") {
      arr.sort((a, b) => (b._follows ?? 0) - (a._follows ?? 0));
    }

    return arr;
  }, [
    allItems,
    q,
    selectedGenreIds.join(","),
    selectedStyleIds.join(","),
    sortKey,
  ]);

  const { byGenre, byStyle } = useMemo(
    () => buildFacetCounts(allItems, q, selectedGenreIds, selectedStyleIds),
    [allItems, q, selectedGenreIds.join(","), selectedStyleIds.join(",")]
  );

  const activeFiltersCount =
    selectedGenreIds.length + selectedStyleIds.length + (q ? 1 : 0);

  const hasClientFilters =
    Boolean(q.trim()) ||
    selectedGenreIds.length > 0 ||
    selectedStyleIds.length > 0;

  // SỬA TẠI ĐÂY: Nếu có filter thì chia trang theo độ dài mảng đã filter, nếu không thì lấy tổng (total) từ server
  const totalPages = hasClientFilters
    ? Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE))
    : total !== null && total > 0
      ? Math.max(1, Math.ceil(total / PAGE_SIZE))
      : 1;
  const storiesCountDisplay = hasClientFilters
    ? filteredSorted.length.toLocaleString("en-US")
    : (total ?? filteredSorted.length).toLocaleString("en-US");

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="h-32"></div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        {/* Header Section */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                {q ? (
                  <>
                    Search results for <span className="italic">"{q}"</span>
                  </>
                ) : (
                  "All Stories"
                )}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                <span className="font-semibold">{storiesCountDisplay}</span>{" "}
                stories found
                {hasClientFilters && (
                  <span className="text-gray-500 dark:text-gray-500">
                    {" "}
                    (on this page)
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {SORTS.map((s) => {
                const active = s.key === sortKey;
                return (
                  <button
                    key={s.key}
                    onClick={() => setSortKey(s.key)}
                    className={`rounded-full px-4 py-2 text-sm font-medium border transition-all ${active
                      ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-transparent shadow-md"
                      : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700 text-foreground"
                      }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="md:hidden w-full flex items-center justify-between px-4 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold shadow-md hover:shadow-lg transition-all"
          >
            <span>🔍 {activeFiltersCount ? `Filters (${activeFiltersCount})` : "Filters"}</span>
            <ChevronDown className={`h-5 w-5 transition-transform ${mobileFilterOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Main Layout: Filters + Content */}
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 lg:gap-8">
          {/* Left Sidebar - Filters (Desktop) / Collapsible (Mobile) */}
          <div>
            {/* Desktop Sidebar */}
            <div className="hidden md:block">
              <FilterSidebar
                loadingFilters={loadingFilters}
                availableGenres={availableGenres}
                availableStyles={availableStyles}
                selectedGenreIds={selectedGenreIds}
                selectedStyleIds={selectedStyleIds}
                byGenre={byGenre}
                byStyle={byStyle}
                activeFiltersCount={activeFiltersCount}
                toggleGenre={toggleGenre}
                toggleStyle={toggleStyle}
                clearFilters={clearFilters}
              />
            </div>

            {/* Mobile Filter Modal */}
            {mobileFilterOpen && (
              <div className="fixed inset-0 z-50 md:hidden">
                {/* Backdrop */}
                <div
                  className="absolute inset-0 bg-black/50"
                  onClick={() => setMobileFilterOpen(false)}
                />

                {/* Modal */}
                <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-t-2xl shadow-lg p-6 space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Filters</h3>
                    <button
                      onClick={() => setMobileFilterOpen(false)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <FilterSidebar
                    loadingFilters={loadingFilters}
                    availableGenres={availableGenres}
                    availableStyles={availableStyles}
                    selectedGenreIds={selectedGenreIds}
                    selectedStyleIds={selectedStyleIds}
                    byGenre={byGenre}
                    byStyle={byStyle}
                    activeFiltersCount={activeFiltersCount}
                    toggleGenre={toggleGenre}
                    toggleStyle={toggleStyle}
                    clearFilters={clearFilters}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Content - Stories */}
          <div className="space-y-8">
            {err && (
              <div className="rounded-xl border-2 border-red-200 dark:border-red-900/50 bg-gradient-to-r from-red-50 to-red-50/50 dark:from-red-950/30 dark:to-red-900/20 p-4 text-red-700 dark:text-red-400 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 text-2xl">⚠️</div>
                  <div>
                    <p className="font-semibold">Error loading stories</p>
                    <p className="text-sm mt-1">{err}</p>
                  </div>
                </div>
              </div>
            )}

            {!err && !loading && filteredSorted.length === 0 && (
              <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
                <div className="text-5xl mb-3">📭</div>
                <p className="text-lg font-semibold text-foreground mb-2">No stories found</p>
                <p className="text-gray-600 dark:text-gray-400">Try adjusting your filters or search terms</p>
              </div>
            )}

            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4 md:gap-5">
              {loading &&
                allItems.length === 0 &&
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <li key={`sk-${i}`} className="animate-pulse">
                    <div
                      className="relative w-full overflow-hidden rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 shadow-sm"
                      style={{ paddingBottom: "150%" }}
                    />
                    <div className="mt-3 h-4 w-5/6 rounded-lg bg-gray-200 dark:bg-gray-700" />
                    <div className="mt-2 h-3 w-1/3 rounded-lg bg-gray-200 dark:bg-gray-700" />
                  </li>
                ))}

              {(Array.isArray(filteredSorted) ? filteredSorted : []).map((m) => (
                <li key={m.key} className="min-w-0">
                  <MangaCard item={m} compact />
                </li>
              ))}
            </ul>

            {!err && (total !== null ? total > 0 : allItems.length > 0) && (
              <nav
                className="mt-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3"
                aria-label="Story pages"
              >
                <button
                  type="button"
                  aria-label="First page"
                  disabled={!canPrev || loading}
                  onClick={() => {
                    setCurrentPage(1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-foreground shadow-sm transition-all hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                >
                  <ChevronsLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={!canPrev || loading}
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-foreground shadow-sm transition-all hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGoToPageInput(String(currentPage));
                    setGoToPageOpen(true);
                  }}
                  disabled={loading}
                  className="min-w-[8.5rem] rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold tabular-nums text-foreground shadow-sm transition-all hover:bg-gray-50 hover:ring-2 hover:ring-blue-400/40 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                >
                  Page {currentPage} / {totalPages}
                </button>

                <button
                  type="button"
                  aria-label="Next page"
                  disabled={!canNext || loading}
                  onClick={() => {
                    setCurrentPage((p) => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-foreground shadow-sm transition-all hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Last page"
                  disabled={!canNext || loading}
                  onClick={() => {
                    setCurrentPage(totalPages);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-foreground shadow-sm transition-all hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                >
                  <ChevronsRight className="h-5 w-5" />
                </button>
              </nav>
            )}

            {goToPageOpen && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <div
                  className="absolute inset-0 bg-black/50"
                  onClick={() => {
                    setGoToPageOpen(false);
                    setGoToPageInput("");
                  }}
                  aria-hidden
                />
                <div
                  className="relative z-10 w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="goto-page-title"
                >
                  <h2
                    id="goto-page-title"
                    className="text-lg font-bold text-foreground"
                  >
                    Go to page
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Enter a page between 1 and {totalPages}.
                  </p>
                  <input
                    ref={goToPageInputRef}
                    type="text"
                    inputMode="numeric"
                    value={goToPageInput}
                    onChange={(e) => setGoToPageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        submitGoToPage();
                      }
                      if (e.key === "Escape") {
                        setGoToPageOpen(false);
                        setGoToPageInput("");
                      }
                    }}
                    className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-foreground outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-gray-600 dark:bg-gray-800"
                    placeholder={`1–${totalPages}`}
                  />
                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setGoToPageOpen(false);
                        setGoToPageInput("");
                      }}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={submitGoToPage}
                      className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md"
                    >
                      Go
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Filter Sidebar Component
function FilterSidebar({
  loadingFilters,
  availableGenres,
  availableStyles,
  selectedGenreIds,
  selectedStyleIds,
  byGenre,
  byStyle,
  activeFiltersCount,
  toggleGenre,
  toggleStyle,
  clearFilters,
}: {
  loadingFilters: boolean;
  availableGenres: Genre[];
  availableStyles: StyleItem[];
  selectedGenreIds: string[];
  selectedStyleIds: string[];
  byGenre: Record<string, number>;
  byStyle: Record<string, number>;
  activeFiltersCount: number;
  toggleGenre: (id: string) => void;
  toggleStyle: (id: string) => void;
  clearFilters: () => void;
}) {
  return (
    <div className="space-y-6 sticky top-24">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground">
          Filters
          {activeFiltersCount > 0 && (
            <span className="ml-2 inline-block px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold">
              {activeFiltersCount}
            </span>
          )}
        </h3>
        {activeFiltersCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">📚 Category</h4>
        <div className="space-y-2">
          {loadingFilters ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading…</div>
          ) : availableGenres.length ? (
            availableGenres.map((g) => {
              const active = selectedGenreIds.includes(g._id);
              const count = byGenre[g._id] || 0;
              const disabled = !active && count === 0;

              return (
                <button
                  key={g._id}
                  onClick={() => !disabled && toggleGenre(g._id)}
                  disabled={disabled}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${active
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm"
                    : "bg-gray-100 dark:bg-gray-800 text-foreground hover:bg-gray-200 dark:hover:bg-gray-700"
                    }
                  ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  title={g.description || g.name}
                >
                  <span className="truncate">{g.name}</span>
                  <span className="text-xs font-bold ml-2 flex-shrink-0">
                    {count}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">No categories</div>
          )}
        </div>
      </div>

      {/* Style Filter */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">🎨 Style</h4>
        <div className="space-y-2">
          {loadingFilters ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading…</div>
          ) : availableStyles.length ? (
            availableStyles.map((s) => {
              const active = selectedStyleIds.includes(s._id);
              const count = byStyle[s._id] || 0;
              const disabled = !active && count === 0;

              return (
                <button
                  key={s._id}
                  onClick={() => !disabled && toggleStyle(s._id)}
                  disabled={disabled}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${active
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm"
                    : "bg-gray-100 dark:bg-gray-800 text-foreground hover:bg-gray-200 dark:hover:bg-gray-700"
                    }
                  ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  title={s.description || s.name}
                >
                  <span className="truncate">{s.name}</span>
                  <span className="text-xs font-bold ml-2 flex-shrink-0">
                    {count}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">No styles</div>
          )}
        </div>
      </div>
    </div>
  );
}
