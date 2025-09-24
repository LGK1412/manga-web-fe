// app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Navbar } from "@/components/navbar";
import { Star, Eye, BookOpen, Pencil } from "lucide-react";

// ================= Types (khớp dữ liệu bạn gửi)
type Genre = { _id: string; name: string };
type StyleItem = { _id: string; name: string };

type MangaRaw = {
  _id: string;
  title: string;
  authorId?: string;
  summary?: string;
  coverImage?: string; // "1758388183093-xxx.webp"
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
// Nếu server ảnh ở chỗ khác (VD: CDN), đổi IMAGE_BASE bên dưới
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
  return `/manga/${encodeURIComponent(x._id)}`;
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

// ================= API utils
async function fetchAll(signal?: AbortSignal) {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const url = `${api}/api/manga/get/all?page=1&limit=100`;
  const res = await axios.get(url, { withCredentials: true, signal });
  const raw = normalizeToArray<MangaRaw>(res.data?.data ?? res.data);
  return raw.map(mapToCard);
}

async function fetchFilters(signal?: AbortSignal) {
  const [genresRes, stylesRes] = await Promise.all([
    axios.get(`${API_BASE}/api/genre/active`, {
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

type RankTab = "day" | "week" | "month";

// ================= Reusable Card UI
function MangaCard({
  item,
  compact = false,
}: {
  item: Card;
  compact?: boolean;
}) {
  const updated = timeAgo(item.updatedAtMs);
  /* eslint-disable @next/next/no-img-element */
  return (
    <Link
      href={item.href}
      className={`group block rounded-lg shadow-sm hover:shadow-md transition-shadow ${
        compact ? "" : "border border-gray-100"
      }`}
    >
      <div
        className="relative overflow-hidden rounded-t-lg"
        style={{ paddingBottom: compact ? "150%" : "140%" }}
      >
        {item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt={item.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-500 text-sm">
            No cover
          </div>
        )}

        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

        {/* Status badges */}
        <div className="absolute left-2 top-2 flex gap-2">
          {item.status && (
            <span
              className={`rounded px-2 py-0.5 text-[11px] font-medium text-white shadow ${
                /complete|hoàn/i.test(item.status)
                  ? "bg-emerald-600"
                  : "bg-indigo-600"
              }`}
            >
              {item.status}
            </span>
          )}
          {!item.published && (
            <span className="rounded bg-amber-600 px-2 py-0.5 text-[11px] font-medium text-white shadow inline-flex items-center gap-1">
              <Pencil className="h-3 w-3" /> Draft
            </span>
          )}
        </div>

        {/* Title + meta overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
          <div className="line-clamp-2 text-sm font-semibold">{item.title}</div>
          <div className="mt-1 flex items-center justify-between text-[11px] opacity-90">
            <span className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              {item.chapters || 0} chương
            </span>
            <span>{updated}</span>
          </div>
        </div>
      </div>

      {/* Bottom meta */}
      <div className="rounded-b-lg bg-white p-2">
        <div className="mb-1 flex flex-wrap gap-1">
          {item.genres.slice(0, 2).map((g) => (
            <span
              key={g}
              className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px]"
            >
              {g}
            </span>
          ))}
          {item.styles.slice(0, 1).map((s) => (
            <span
              key={s}
              className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700"
            >
              {s}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-yellow-400 stroke-yellow-400" />
            {(item.rating || 0).toFixed(1)}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {fmtViews(item.views)} lượt xem
          </span>
        </div>
      </div>
    </Link>
  );
}

// ================= Page
export default function HomePage() {
  const [items, setItems] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [genres, setGenres] = useState<Genre[]>([]);
  const [styles, setStyles] = useState<StyleItem[]>([]);
  const [tab, setTab] = useState<RankTab>("day");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.all([fetchAll(controller.signal), fetchFilters(controller.signal)])
      .then(([cards, { genres, styles }]) => {
        setItems(cards);
        setGenres(genres);
        setStyles(styles);
      })
      .catch((e) =>
        setErr(e?.response?.data?.message || e?.message || "Tải trang lỗi")
      )
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  // ==== Derive sections
  const featured = useMemo(
    () =>
      [...items].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 10),
    [items]
  );

  const latest = useMemo(
    () =>
      [...items]
        .sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0))
        .slice(0, 24),
    [items]
  );

  const hotViews = useMemo(() => {
    const windowDays = tab === "day" ? 1 : tab === "week" ? 7 : 30;
    const pool = items.filter((it) => withinDays(it.updatedAtMs, windowDays));
    const base = pool.length ? pool : items;
    return [...base]
      .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
      .slice(0, 10);
  }, [items, tab]);

  const topFollows = useMemo(
    () =>
      [...items].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 10),
    [items]
  );

  const goStoriesWithGenre = (g: Genre) => {
    try {
      sessionStorage.setItem("stories:q", "");
      sessionStorage.setItem("stories:presetGenres", JSON.stringify([g._id]));
    } catch {}
    window.location.href = "/stories";
  };
  const goStoriesWithStyle = (s: StyleItem) => {
    try {
      sessionStorage.setItem("stories:q", "");
      sessionStorage.setItem("stories:presetStyles", JSON.stringify([s._id]));
    } catch {}
    window.location.href = "/stories";
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-6xl p-4 space-y-8">
        {/* Error / Loading */}
        {err && (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">
            {err}
          </div>
        )}
        {loading && !items.length && (
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

        {/* ===== Genres & Styles chips */}
        {(genres.length > 0 || styles.length > 0) && (
          <section className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Category
                </div>
                <div className="flex flex-wrap gap-2">
                  {genres.length ? (
                    genres.slice(0, 24).map((g) => (
                      <button
                        key={g._id}
                        onClick={() => goStoriesWithGenre(g)}
                        className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs hover:bg-gray-100"
                        title={g.name}
                      >
                        {g.name}
                      </button>
                    ))
                  ) : (
                    <div className="text-xs text-gray-500">
                      Không có category
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Style
                </div>
                <div className="flex flex-wrap gap-2">
                  {styles.length ? (
                    styles.map((s) => (
                      <button
                        key={s._id}
                        onClick={() => goStoriesWithStyle(s)}
                        className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs hover:bg-gray-100"
                        title={s.name}
                      >
                        {s.name}
                      </button>
                    ))
                  ) : (
                    <div className="text-xs text-gray-500">Không có style</div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===== Main content */}
        <section className="grid gap-6 lg:grid-cols-12">
          {/* Latest */}
          <div className="lg:col-span-9">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Mới cập nhật</h2>
              <Link
                href="/stories"
                className="text-sm text-blue-600 hover:underline"
              >
                Xem thêm
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {latest.map((m) => (
                <MangaCard key={m.key} item={m} />
              ))}
            </div>
          </div>

          {/* Rankings */}
          <aside className="lg:col-span-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Bảng xếp hạng</h2>
              <div className="flex gap-1 rounded-full border border-gray-300 p-1">
                {(["day", "week", "month"] as RankTab[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setTab(k)}
                    className={`rounded-full px-3 py-1 text-xs ${
                      tab === k
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
    </div>
  );
}
