// app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Navbar } from "@/components/navbar";
import { Star, Eye, BookOpen } from "lucide-react";
import { MangaCard } from "@/components/MangaCard";
import { Footer } from "@/components/footer";
import { useTheme } from "next-themes";


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
function buildCoverUrl(filename?: string) {
  if (!filename) return undefined;
  if (/^https?:\/\//i.test(filename)) return filename;
  const api = process.env.NEXT_PUBLIC_API_URL || "";
  return `${api}/assets/coverImages/${filename}`.replace(/([^:]\/)\/+/g, "$1");
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
function fmtViews(n?: number) {
  const v = n ?? 0;
  if (v >= 1_000_000)
    return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${v}`;
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
    title: x.title || "Không rõ tiêu đề",
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
  totalPages?: number;
} {
  const array = normalizeToArray<MangaRaw>(data?.data ?? data);
  // Try common shapes: { pagination: { page, limit, total, totalPages } }
  const p = data?.pagination ?? data?.meta ?? {};
  const page = Number(p.page ?? data?.page ?? 1);
  const limit = Number(p.limit ?? data?.limit ?? fallbackLimit);
  const total = Number(p.total ?? data?.total ?? data?.count ?? undefined);
  const totalPages = Number(
    p.totalPages ??
    data?.totalPages ??
    (total ? Math.ceil(total / limit) : undefined)
  );
  return { array, page, limit, total, totalPages };
}

// ================= API utils
// Smaller "summary" fetch (for Featured/Ranking). We can use a larger page size to populate sidebars.
async function fetchSummary(signal?: AbortSignal) {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const url = `${api}/api/manga/get/all?page=1&limit=200`;
  const res = await axios.get(url, { withCredentials: true, signal });
  const raw = normalizeToArray<MangaRaw>(res.data?.data ?? res.data);
  return raw.map(mapToCard);
}

// Paged fetch for "Latest"
async function fetchLatestPage(
  page: number,
  limit: number,
  signal?: AbortSignal
) {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const url = `${api}/api/manga/get/all?page=${page}&limit=${limit}`;
  const res = await axios.get(url, { withCredentials: true, signal });
  const parsed = parseListResponse(res.data, limit);
  return {
    items: parsed.array.map(mapToCard),
    page: parsed.page || page,
    limit: parsed.limit || limit,
    totalPages: parsed.totalPages ?? 1,
  };
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

type RankTab = "day" | "week" | "month";

// ---- Pagination UI helper
function buildPageWindow(current: number, total: number, window: number = 1) {
  // returns an array like [1, '...', 4,5,6, '...', 20]
  if (total <= 9) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>();
  pages.add(1);
  pages.add(2);
  pages.add(total);
  pages.add(total - 1);
  for (let i = current - window; i <= current + window; i++) {
    if (i >= 1 && i <= total) pages.add(i);
  }
  const arr = Array.from(pages).sort((a, b) => a - b);
  const out: (number | "...")[] = [];
  for (let i = 0; i < arr.length; i++) {
    out.push(arr[i]);
    if (i < arr.length - 1 && arr[i + 1] !== arr[i] + 1) out.push("...");
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
  const windowed = buildPageWindow(page, totalPages, 1);
  const btn =
    "min-w-8 h-8 px-2 inline-flex items-center justify-center rounded border text-sm";

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button
        className={`${btn} ${page === 1 ? "cursor-not-allowed opacity-50" : ""
          }`}
        onClick={() => page > 1 && onChange(1)}
        disabled={page === 1}
        aria-label="First page"
      >
        «
      </button>
      <button
        className={`${btn} ${page === 1 ? "cursor-not-allowed opacity-50" : ""
          }`}
        onClick={() => page > 1 && onChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
      >
        ‹
      </button>

      {windowed.map((it, idx) =>
        it === "..." ? (
          <span key={`ellipsis-${idx}`} className="px-1 text-gray-500">
            …
          </span>
        ) : (
          <button
            key={it}
            onClick={() => onChange(it)}
            className={`${btn} ${it === page
              ? "bg-[#0D0D0D] text-white border-black"
              : "border-gray-300 hover:bg-gray-50"
              }`}
            aria-current={it === page ? "page" : undefined}
          >
            {it}
          </button>
        )
      )}

      <button
        className={`${btn} ${page === totalPages ? "cursor-not-allowed opacity-50" : ""
          }`}
        onClick={() => page < totalPages && onChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
      >
        ›
      </button>
      <button
        className={`${btn} ${page === totalPages ? "cursor-not-allowed opacity-50" : ""
          }`}
        onClick={() => page < totalPages && onChange(totalPages)}
        disabled={page === totalPages}
        aria-label="Last page"
      >
        »
      </button>
    </div>
  );
}

// ================= Page
export default function HomePage() {
  // Sidebar/featured summary dataset
  const [summaryItems, setSummaryItems] = useState<Card[]>([]);
  // Latest paged dataset
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
  const { theme, setTheme } = useTheme();

  // Initial load
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
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
        setLatestPage(latest.page);
        setLatestTotalPages(latest.totalPages);
      })
      .catch((e) =>
        setErr(e?.response?.data?.message || e?.message || "Tải trang lỗi")
      )
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  // Change page for Latest
  const changeLatestPage = (page: number) => {
    if (page === latestPage || page < 1 || page > latestTotalPages) return;
    const controller = new AbortController();
    setLoadingPage(true);
    fetchLatestPage(page, LATEST_LIMIT, controller.signal)
      .then((res) => {
        setLatestItems(res.items);
        setLatestPage(res.page);
        setLatestTotalPages(res.totalPages);
        // Scroll into view of the latest section
        const el = document.getElementById("latest");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        else window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch((e) =>
        setErr(e?.response?.data?.message || e?.message || "Tải trang lỗi")
      )
      .finally(() => setLoadingPage(false));
  };

  // ==== Derive sections from summaryItems
  const featured = useMemo(
    () =>
      [...summaryItems]
        .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
        .slice(0, 10),
    [summaryItems]
  );

  const hotViews = useMemo(() => {
    const windowDays = tab === "day" ? 1 : tab === "week" ? 7 : 30;
    const pool = summaryItems.filter((it) =>
      withinDays(it.updatedAtMs, windowDays)
    );
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

  // const goStoriesWithGenre = (g: Genre) => {
  //   try {
  //     sessionStorage.setItem("stories:q", "");
  //     sessionStorage.setItem("stories:presetGenres", JSON.stringify([g._id]));
  //   } catch { }
  //   window.location.href = "/stories";
  // };
  // const goStoriesWithStyle = (s: StyleItem) => {
  //   try {
  //     sessionStorage.setItem("stories:q", "");
  //     sessionStorage.setItem("stories:presetStyles", JSON.stringify([s._id]));
  //   } catch { }
  //   window.location.href = "/stories";
  // };
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-[#1F1F1F]" : "bg-white"}`}>
      <Navbar />
      <main className="mx-auto max-w-6xl p-4 space-y-8 pt-30">
        {/* Error / Loading */}
        {err && (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">
            {err}
          </div>
        )}

        {loading && !summaryItems.length && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div
                  className="relative w-full overflow-hidden rounded-lg bg-gray-200"
                  style={{ paddingBottom: "133%" }}
                />
                <div className="mt-2 h-4 w-3/4 rounded bg-gray-200" />
                <div className="mt-1 h-3 w-1/2 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        )}

        {/* ===== Featured strip */}
        {!loading && featured.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nổi bật</h2>
              <Link
                href="/stories"
                className="text-sm text-blue-600 hover:underline"
              >
                Xem thêm
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

        {/* ===== Main content */}
        <section className="grid gap-6 lg:grid-cols-12">
          {/* Latest (paged) */}
          <div className="lg:col-span-9" id="latest">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Mới cập nhật</h2>
              <Link
                href="/stories"
                className="text-sm text-blue-600 hover:underline"
              >
                Xem thêm
              </Link>
            </div>

            {loading && !latestItems.length ? (
              <div className="grid [grid-template-columns:repeat(auto-fill,minmax(192px,1fr))] gap-3 sm:gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div
                      className="relative w-full overflow-hidden rounded-lg bg-gray-200"
                      style={{ paddingBottom: "133%" }}
                    />
                    <div className="mt-2 h-4 w-3/4 rounded bg-gray-200" />
                    <div className="mt-1 h-3 w-1/2 rounded bg-gray-200" />
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

                {/* Pagination */}
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-600">
                    Trang {latestPage} / {latestTotalPages}
                  </div>
                  <NumberPager
                    page={latestPage}
                    totalPages={latestTotalPages}
                    onChange={(p) => changeLatestPage(p)}
                  />
                </div>

                {loadingPage && (
                  <div className="mt-3 text-sm text-gray-500">
                    Đang tải trang…
                  </div>
                )}
              </>
            )}
          </div>

          {/* Rankings (from summaryItems) */}
          <aside className="lg:col-span-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Bảng xếp hạng</h2>
              <div className="flex gap-1 rounded-full border border-gray-300 p-1">
                {(["day", "week", "month"] as RankTab[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setTab(k)}
                    className={`rounded-full px-3 py-1 text-xs ${tab === k
                      ? "bg-black text-white"
                      : "bg-white text-gray-800"
                      }`}
                  >
                    {k === "day" ? "Ngày" : k === "week" ? "Tuần" : "Tháng"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {hotViews.map((m, idx) => (
                <Link
                  href={m.href}
                  key={m.key}
                  className="flex items-center gap-3 rounded border border-gray-200 p-2 hover:bg-gray-50"
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
                      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-[10px] text-gray-500">
                        No cover
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {idx + 1}. {m.title}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" /> {m.chapters} chương
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
              <h3 className="mb-2 text-sm font-semibold">Rating cao</h3>
              <div className="space-y-2">
                {topFollows.map((m) => (
                  <Link
                    href={m.href}
                    key={m.key}
                    className="flex items-center gap-3 rounded border border-gray-200 p-2 hover:bg-gray-50"
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
                        <div className="flex h-full w-full items-center justify-center bg-gray-100 text-[10px] text-gray-500">
                          No cover
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{m.title}</div>
                      <div className="text-xs text-gray-600 flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 stroke-yellow-400" />{" "}
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
