import Link from "next/link";
import { Star, Eye, BookOpen, Pencil } from "lucide-react";

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

export function MangaCard({
  item,
  compact = false,
}: {
  item: Card;
  compact?: boolean;
}) {
  const updated = timeAgo(item.updatedAtMs);
  const isFull = /full|hoàn|complete/i.test(item.status ?? "");

  return (
    <Link
      href={item.href}
      aria-label={item.title}
      className={[
        "group block overflow-hidden rounded-xl bg-white dark:bg-card",
        "ring-1 ring-black/5 dark:ring-border transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lg hover:ring-black/10 dark:hover:ring-border",
        compact ? "" : "shadow-sm",
      ].join(" ")}
      prefetch={false}
    >
      {/* Cover tỉ lệ 2:3 (150%) */}
      <div className="relative w-full" style={{ paddingBottom: "150%" }}>
        {item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 dark:from-muted to-slate-200 dark:to-muted text-slate-500 dark:text-muted-foreground">
            Không có ảnh
          </div>
        )}

        {/* viền nhẹ + gradient đáy để chữ nổi */}
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

        {/* badge trạng thái / draft - góc trái trên */}
        <div className="absolute left-2 top-2 flex flex-wrap gap-2">
          {item.status && (
            <span
              className={[
                "rounded px-2 py-0.5 text-[11px] font-medium text-white shadow",
                isFull ? "bg-emerald-600" : "bg-indigo-600",
              ].join(" ")}
            >
              {item.status}
            </span>
          )}
          {!item.published && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-600 px-2 py-0.5 text-[11px] font-medium text-white shadow">
              <Pencil className="h-3 w-3" />
              Nháp
            </span>
          )}
        </div>

        {/* (tuỳ chọn) style đầu tiên - góc phải trên */}
        {item.styles?.length ? (
          <div className="absolute right-2 top-2">
            <span className="rounded bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
              {item.styles[0]}
            </span>
          </div>
        ) : null}

        {/* Tiêu đề + stats đáy ảnh */}
        <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
          <div className="line-clamp-2 text-[13px] font-semibold leading-snug drop-shadow">
            {item.title}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] opacity-95">
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              {item.chapters || 0} chương
            </span>
            {updated && <span className="truncate">{updated}</span>}
          </div>
        </div>
      </div>

      {/* Footer: genres + rating + views (gọn gàng kiểu QQ) */}
      <div className="bg-white dark:bg-card p-2">
        <div className="mb-1 flex min-h-[20px] flex-wrap gap-1">
          {item.genres.slice(0, 2).map((g) => (
            <span
              key={g}
              className="rounded-full border border-slate-200 dark:border-input bg-slate-50 dark:bg-muted px-2 py-0.5 text-[10px] text-slate-700 dark:text-muted-foreground"
              title={g}
            >
              {g}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-yellow-400 stroke-yellow-400" />
            {(item.rating || 0).toFixed(1)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {fmtViews(item.views)} lượt xem
          </span>
        </div>
      </div>
    </Link>
  );
}

/* Skeleton (giữ layout y hệt khi loading) */
export function MangaCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-white dark:bg-card ring-1 ring-black/5 dark:ring-border">
      <div
        className="relative w-full animate-pulse"
        style={{ paddingBottom: "150%" }}
      >
        <div className="absolute inset-0 bg-slate-200 dark:bg-muted" />
      </div>
      <div className="space-y-2 bg-white dark:bg-card p-2">
        <div className="h-4 w-5/6 rounded bg-slate-200" />
        <div className="flex gap-1">
          <div className="h-4 w-12 rounded-full bg-slate-200" />
          <div className="h-4 w-16 rounded-full bg-slate-200" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-3 w-10 rounded bg-slate-200" />
          <div className="h-3 w-20 rounded bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
