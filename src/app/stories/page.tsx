// app/stories/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Navbar } from "@/components/navbar";
import { MangaCard } from "@/components/MangaCard";

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

const PAGE_SIZE = 24;

// ===== API utils
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
        (it._styleIds || []).some((id) => selectedStyleIds.includes(id)))
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
        (it._genreIds || []).some((id) => selectedGenreIds.includes(id)))
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

  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<CardItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [firstLoaded, setFirstLoaded] = useState(false);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const syncQ = () => {
      try {
        const v = sessionStorage.getItem("stories:q") || "";
        if (v) setQ(v);
      } catch {}
    };

    syncQ();
    window.addEventListener("stories:syncQ", syncQ);

    return () => {
      window.removeEventListener("stories:syncQ", syncQ);
      try {
        sessionStorage.removeItem("stories:q");
        sessionStorage.removeItem("stories:q:ts");
      } catch {}
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
    setPage(1);
    setAllItems([]);
    setHasMore(true);
    setErr(null);
    setTotal(null);
    setFirstLoaded(false);
  }, []);

  useEffect(() => {
    if (!hasMore) return;

    const controller = new AbortController();
    let cancelled = false;

    const fetchPage = async () => {
      setLoading(true);
      try {
        const url = buildGetAllUrl(page, PAGE_SIZE);
        const res = await axios.get(url, {
          withCredentials: true,
          signal: controller.signal,
        });

        const payload = res.data;
        const raw = normalizeToArray<MangaRaw>(payload?.data ?? payload);
        const mapped = raw.map(mapToCard);

        setAllItems((prev) => (page === 1 ? mapped : prev.concat(mapped)));

        if (typeof payload?.total === "number") {
          setTotal(payload.total);
          setHasMore(page * PAGE_SIZE < payload.total);
        } else {
          setHasMore(mapped.length >= PAGE_SIZE);
        }

        if (page === 1) setFirstLoaded(true);
      } catch (e: any) {
        if (axios.isCancel(e)) return;
        if (!cancelled) {
          setErr(
            e?.response?.data?.message || e?.message || "Failed to load data"
          );
        }
        setHasMore(false);
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
  }, [page, hasMore]);

  useEffect(() => {
    if (!loadMoreRef.current || !firstLoaded) return;

    const node = loadMoreRef.current;

    const io = new IntersectionObserver(
      (entries) => {
        const [ent] = entries;
        if (ent.isIntersecting && !loading && hasMore) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "400px 0px" }
    );

    io.observe(node);
    return () => io.disconnect();
  }, [firstLoaded, loading, hasMore]);

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
    } catch {}
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
        (it._genreIds || []).some((id) => selectedGenreIds.includes(id))
      );
    }

    if (selectedStyleIds.length) {
      list = list.filter((it) =>
        (it._styleIds || []).some((id) => selectedStyleIds.includes(id))
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <br />
      <br />
      <br />

      <div className="mx-auto max-w-6xl p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold text-foreground">
            {q ? (
              <>
                Results for <span className="italic">"{q}"</span>
              </>
            ) : (
              "All Stories"
            )}
            <span className="ml-2 text-sm text-muted-foreground">
              ({filteredSorted.length.toLocaleString("en-US")} items)
            </span>
          </h1>

          <div className="flex flex-wrap items-center gap-2">
            {SORTS.map((s) => {
              const active = s.key === sortKey;
              return (
                <button
                  key={s.key}
                  onClick={() => setSortKey(s.key)}
                  className={`rounded-full px-3 py-1 text-sm border transition ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-border bg-muted p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium text-foreground">
              Filter by{activeFiltersCount ? ` (${activeFiltersCount})` : ""}
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={loadingFilters}
                onClick={clearFilters}
                className="rounded border border-border px-3 py-1 text-xs hover:bg-background disabled:opacity-50 text-foreground"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="mb-2">
            <div className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Category
            </div>
            <div className="flex flex-wrap gap-2">
              {loadingFilters && (
                <div className="text-xs text-muted-foreground">
                  Loading category…
                </div>
              )}

              {!loadingFilters &&
                (availableGenres.length ? (
                  availableGenres.map((g) => {
                    const active = selectedGenreIds.includes(g._id);
                    const count = byGenre[g._id] || 0;
                    const disabled = !active && count === 0;

                    return (
                      <button
                        key={g._id}
                        onClick={() => !disabled && toggleGenre(g._id)}
                        disabled={disabled}
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition
                          ${
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-foreground hover:bg-muted"
                          }
                          ${
                            disabled
                              ? "opacity-50 cursor-not-allowed hover:bg-background"
                              : ""
                          }`}
                        title={g.description || g.name}
                      >
                        <span>{g.name}</span>
                        <span
                          className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
                            active
                              ? "bg-primary-foreground/20"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Không có category khả dụng
                  </div>
                ))}
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Style
            </div>
            <div className="flex flex-wrap gap-2">
              {loadingFilters && (
                <div className="text-xs text-muted-foreground">
                  Loading style…
                </div>
              )}

              {!loadingFilters &&
                (availableStyles.length ? (
                  availableStyles.map((s) => {
                    const active = selectedStyleIds.includes(s._id);
                    const count = byStyle[s._id] || 0;
                    const disabled = !active && count === 0;

                    return (
                      <button
                        key={s._id}
                        onClick={() => !disabled && toggleStyle(s._id)}
                        disabled={disabled}
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition
                          ${
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-foreground hover:bg-muted"
                          }
                          ${
                            disabled
                              ? "opacity-50 cursor-not-allowed hover:bg-background"
                              : ""
                          }`}
                        title={s.description || s.name}
                      >
                        <span>{s.name}</span>
                        <span
                          className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
                            active
                              ? "bg-primary-foreground/20"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Không có style khả dụng
                  </div>
                ))}
            </div>
          </div>
        </div>

        {err && <p className="mb-3 text-destructive">Error: {err}</p>}

        {!err && !loading && filteredSorted.length === 0 && (
          <p className="mb-3 text-muted-foreground">
            No matching results (try changing filters).
          </p>
        )}

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-4">
          {loading &&
            allItems.length === 0 &&
            Array.from({ length: 12 }).map((_, i) => (
              <li key={`sk-${i}`} className="animate-pulse">
                <div
                  className="relative w-full overflow-hidden rounded-xl bg-muted ring-1 ring-inset ring-border"
                  style={{ paddingBottom: "150%" }}
                />
                <div className="mt-2 h-4 w-5/6 rounded bg-muted" />
                <div className="mt-1 h-3 w-1/3 rounded bg-muted" />
              </li>
            ))}

          {(Array.isArray(filteredSorted) ? filteredSorted : []).map((m) => (
            <li key={m.key} className="min-w-0">
              <MangaCard item={m} compact />
            </li>
          ))}
        </ul>

        <div ref={loadMoreRef} className="h-12" />

        {!loading && hasMore && allItems.length > 0 && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-border px-4 py-2 text-sm hover:bg-muted text-foreground"
            >
              Tải thêm
            </button>
          </div>
        )}

        {loading && allItems.length > 0 && (
          <div className="mt-4 flex justify-center text-sm text-muted-foreground">
            Loading more…
          </div>
        )}
      </div>
    </div>
  );
}
