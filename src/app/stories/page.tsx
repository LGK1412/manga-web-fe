// app/stories/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Navbar } from "@/components/navbar";
import { Star, Eye, BookOpen, Pencil } from "lucide-react";
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

  // cover variants
  coverUrl?: string;
  cover?: string;
  coverImage?: string; // "1758388183093-xxx.webp"
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

  // private fields for local filter/sort
  _genreIds?: string[];
  _styleIds?: string[];
  _views?: number;
  _follows?: number;
  _updatedAt?: number;
};

// ===== Helpers (đồng bộ với trang Home)
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
const IMAGE_BASE = `${API_BASE}/uploads`;

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
function fmtViews(n?: number) {
  const v = n ?? 0;
  if (v >= 1_000_000)
    return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${v}`;
}
function timeAgo(inputMs?: number) {
  if (!inputMs) return undefined;
  const diff = Math.max(0, Date.now() - inputMs);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s trước`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ngày trước`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} tháng trước`;
  return `${Math.floor(mo / 12)} năm trước`;
}
function buildCoverUrl(filename?: string) {
  if (!filename) return undefined;
  if (/^https?:\/\//i.test(filename)) return filename;
  const api = process.env.NEXT_PUBLIC_API_URL || "";
  return `${api}/assets/coverImages/${filename}`.replace(/([^:]\/)\/+/g, "$1");
}
function getTitle(x: MangaRaw) {
  return (x.title || x.name || "Không rõ tiêu đề").toString();
}
function getKey(x: MangaRaw) {
  return String(x._id ?? x.id ?? x.slug ?? getTitle(x));
}
function getHref(x: MangaRaw) {
  // ưu tiên slug
  if (x.slug) return `/story/${encodeURIComponent(x.slug)}`;

  // fallback qua id
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

  const item: CardItem = {
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
    published: (x as any).isPublish ?? true, // backend của bạn có trường này
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
  return item;
}

function highlight(text: string, query: string) {
  if (!query) return text;
  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${escaped})`, "ig");
    return text.replace(re, "<mark>$1</mark>");
  } catch {
    return text;
  }
}

// ===== API utils
const PAGE_SIZE = 24;

function buildGetAllUrl(page: number, limit: number) {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const base = `${api}/api/manga/get/all`;
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("limit", String(limit));
  return `${base}?${p.toString()}`;
}

async function fetchFilters(signal?: AbortSignal) {
  const [genresRes, stylesRes] = await Promise.all([
    axios.get(`${API_BASE}/api/genre/`, {
      withCredentials: true,
      signal,
    }),
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

// ===== UI constants
const SORTS: { key: "updated" | "views" | "follows"; label: string }[] = [
  { key: "updated", label: "Mới cập nhật" },
  { key: "views", label: "Xem nhiều" },
  { key: "follows", label: "Theo dõi nhiều" },
];

export default function StoriesPage() {
  // search lưu trong sessionStorage
  const [q, setQ] = useState("");

  // Helper: cập nhật cả state và sessionStorage
  const setSearch = (value: string) => {
    setQ(value);
    try {
      const v = value.trim();
      if (v) sessionStorage.setItem("stories:q", v);
      else sessionStorage.removeItem("stories:q");
    } catch {}
  };

  // Client filters (state local)
  const [sortKey, setSortKey] = useState<"updated" | "views" | "follows">(
    "updated"
  );
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>([]);

  // Options
  const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);
  const [availableStyles, setAvailableStyles] = useState<StyleItem[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

  // Data
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<CardItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [firstLoaded, setFirstLoaded] = useState(false);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // đọc search khi vào trang + khi focus window
  useEffect(() => {
    const syncQ = () => {
      try {
        const v = sessionStorage.getItem("stories:q") || "";
        setQ(v);
      } catch {}
    };
    syncQ();
    window.addEventListener("focus", syncQ);

    // ✅ clear search khi rời trang (unmount / đóng tab / reload)
    const clearQ = () => {
      try {
        sessionStorage.removeItem("stories:q");
      } catch {}
    };
    window.addEventListener("beforeunload", clearQ);

    return () => {
      window.removeEventListener("focus", syncQ);
      window.removeEventListener("beforeunload", clearQ);
      clearQ(); // cũng clear khi unmount do chuyển route nội bộ
    };
  }, []);

  // load genres/styles
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

  // reset list once
  useEffect(() => {
    setPage(1);
    setAllItems([]);
    setHasMore(true);
    setErr(null);
    setTotal(null);
    setFirstLoaded(false);
  }, []);

  // fetch getAll pages (local filter/sort)
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

        const payload = res.data; // { data, total, page, limit } hoặc array
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
        if (!cancelled)
          setErr(
            e?.response?.data?.message || e?.message || "Tải dữ liệu thất bại"
          );
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

  // Infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !firstLoaded) return;
    const node = loadMoreRef.current;

    const io = new IntersectionObserver(
      (entries) => {
        const [ent] = entries;
        if (ent.isIntersecting && !loading && hasMore) setPage((p) => p + 1);
      },
      { rootMargin: "400px 0px" }
    );

    io.observe(node);
    return () => io.disconnect();
  }, [firstLoaded, loading, hasMore]);

  // Toggle filters
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

  // Clear all filters
  const clearFilters = () => {
    setSelectedGenreIds([]);
    setSelectedStyleIds([]);
    setSortKey("updated");
    setSearch(""); // xoá luôn search + sessionStorage
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Client filter + sort (local-only)
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

  // ===== UI
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <br />
      <br />
      <br />
      <div className="mx-auto max-w-6xl p-4">
        {/* Header + sort */}
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold">
            {q ? (
              <>
                Kết quả cho <span className="italic">“{q}”</span>
              </>
            ) : (
              "Tất cả truyện"
            )}
            {typeof total === "number" && (
              <span className="ml-2 text-sm text-gray-500">
                ({total.toLocaleString("vi-VN")} mục)
              </span>
            )}
          </h1>

          {/* Sort (local) */}
          <div className="flex flex-wrap items-center gap-2">
            {SORTS.map((s) => {
              const active = s.key === sortKey;
              return (
                <button
                  key={s.key}
                  onClick={() => setSortKey(s.key)}
                  className={`rounded-full px-3 py-1 text-sm border transition ${
                    active
                      ? "bg-black text-white border-black"
                      : "bg-white hover:bg-gray-100 border-gray-300"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium text-gray-800">Lọc theo</div>
            <div className="flex items-center gap-2">
              <button
                disabled={loadingFilters}
                onClick={clearFilters}
                className="rounded border border-gray-300 px-3 py-1 text-xs hover:bg-white disabled:opacity-50"
              >
                Xoá bộ lọc
              </button>
            </div>
          </div>

          {/* Genre chips */}
          <div className="mb-2">
            <div className="mb-1 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Category
            </div>
            <div className="flex flex-wrap gap-2">
              {loadingFilters && (
                <div className="text-xs text-gray-500">Đang tải category…</div>
              )}
              {!loadingFilters &&
                (availableGenres.length ? (
                  availableGenres.map((g) => {
                    const active = selectedGenreIds.includes(g._id);
                    return (
                      <button
                        key={g._id}
                        onClick={() => toggleGenre(g._id)}
                        className={`rounded-full border px-3 py-1 text-xs transition ${
                          active
                            ? "border-black bg-black text-white"
                            : "border-gray-300 bg-white text-gray-800 hover:bg-gray-100"
                        }`}
                        title={g.description || g.name}
                      >
                        {g.name}
                      </button>
                    );
                  })
                ) : (
                  <div className="text-xs text-gray-500">
                    Không có category khả dụng
                  </div>
                ))}
            </div>
          </div>

          {/* Style chips */}
          <div>
            <div className="mb-1 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Style
            </div>
            <div className="flex flex-wrap gap-2">
              {loadingFilters && (
                <div className="text-xs text-gray-500">Đang tải style…</div>
              )}
              {!loadingFilters &&
                (availableStyles.length ? (
                  availableStyles.map((s) => {
                    const active = selectedStyleIds.includes(s._id);
                    return (
                      <button
                        key={s._id}
                        onClick={() => toggleStyle(s._id)}
                        className={`rounded-full border px-3 py-1 text-xs transition ${
                          active
                            ? "border-black bg-black text-white"
                            : "border-gray-300 bg-white text-gray-800 hover:bg-gray-100"
                        }`}
                        title={s.description || s.name}
                      >
                        {s.name}
                      </button>
                    );
                  })
                ) : (
                  <div className="text-xs text-gray-500">
                    Không có style khả dụng
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* States */}
        {err && <p className="mb-3 text-red-600">Lỗi: {err}</p>}
        {!err && !loading && filteredSorted.length === 0 && (
          <p className="mb-3 text-gray-600">
            Không có kết quả phù hợp (thử thay đổi bộ lọc).
          </p>
        )}

        {/* Grid */}
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-4">
          {/* Skeleton khi chưa có dữ liệu */}
          {loading &&
            allItems.length === 0 &&
            Array.from({ length: 12 }).map((_, i) => (
              <li key={`sk-${i}`} className="animate-pulse">
                <div
                  className="relative w-full overflow-hidden rounded-xl bg-slate-200 ring-1 ring-inset ring-black/5"
                  style={{ paddingBottom: "150%" }} // 2:3 để khớp MangaCard
                />
                <div className="mt-2 h-4 w-5/6 rounded bg-slate-200" />
                <div className="mt-1 h-3 w-1/3 rounded bg-slate-200" />
              </li>
            ))}

          {(Array.isArray(filteredSorted) ? filteredSorted : []).map((m) => (
            <li key={m.key} className="min-w-0">
              {/* KHÔNG cần div w-[192px]/snap trong layout grid */}
              <MangaCard item={m} compact />
            </li>
          ))}
        </ul>

        {/* Load-more / sentinel */}
        <div ref={loadMoreRef} className="h-12" />
        {!loading && hasMore && allItems.length > 0 && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            >
              Tải thêm
            </button>
          </div>
        )}
        {loading && allItems.length > 0 && (
          <div className="mt-4 flex justify-center text-sm text-gray-600">
            Đang tải thêm…
          </div>
        )}
      </div>
    </div>
  );
}
