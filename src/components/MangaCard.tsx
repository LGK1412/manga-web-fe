"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, Eye, Pencil, Star } from "lucide-react";

import { LicenseVerifiedBadge } from "@/components/LicenseVerifiedBadge";
import { hasApprovedLicenseStatus } from "@/lib/license-status";

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
  licenseStatus?: string;
};

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

function getImageCandidates(
  filePath?: string,
  fallbackFolder = "assets/coverImages",
) {
  const cleaned = normalizePath(filePath);
  if (!cleaned) return [];

  if (isAbsoluteUrl(cleaned)) return [cleaned];

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  const candidates = new Set<string>();

  candidates.add(`${apiBase}/${cleaned}`);

  if (cleaned.startsWith("assets/")) {
    candidates.add(`${apiBase}/${cleaned}`);
  }

  if (!cleaned.startsWith("assets/")) {
    candidates.add(`${apiBase}/${fallbackFolder}/${cleaned}`);
  }

  const withoutAssetsPrefix = cleaned.replace(/^assets\//, "");
  candidates.add(`${apiBase}/${fallbackFolder}/${withoutAssetsPrefix}`);

  return Array.from(candidates).map((url) =>
    url.replace(/([^:]\/)\/+/g, "$1"),
  );
}

function CoverImage({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  const urls = getImageCandidates(src);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [src]);

  if (!urls.length) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 dark:from-muted dark:to-muted dark:text-muted-foreground">
        No image
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={urls[index]}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => {
        if (index < urls.length - 1) {
          setIndex((prev) => prev + 1);
        }
      }}
    />
  );
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

export function MangaCard({
  item,
  compact = false,
}: {
  item: Card;
  compact?: boolean;
}) {
  const isFull = /full|complete|completed|ho\u00e0n/i.test(item.status ?? "");
  const showVerifiedBadge = hasApprovedLicenseStatus(item.licenseStatus);

  return (
    <Link
      href={item.href}
      aria-label={item.title}
      className={[
        "group block overflow-hidden rounded-xl bg-white dark:bg-card",
        "ring-1 ring-black/5 transition-all duration-200 dark:ring-border",
        "hover:-translate-y-0.5 hover:shadow-lg hover:ring-black/10 dark:hover:ring-border",
        compact ? "" : "shadow-sm",
      ].join(" ")}
      prefetch={false}
    >
      <div className="relative w-full" style={{ paddingBottom: "150%" }}>
        {item.coverUrl ? (
          <CoverImage
            src={item.coverUrl}
            alt={item.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 dark:from-muted dark:to-muted dark:text-muted-foreground">
            No image
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

        <div className="absolute left-2 top-2 flex flex-wrap gap-2">
          {item.status ? (
            <span
              className={[
                "rounded px-2 py-0.5 text-[11px] font-medium text-white shadow",
                isFull ? "bg-emerald-600" : "bg-indigo-600",
              ].join(" ")}
            >
              {item.status}
            </span>
          ) : null}
          {!item.published ? (
            <span className="inline-flex items-center gap-1 rounded bg-amber-600 px-2 py-0.5 text-[11px] font-medium text-white shadow">
              <Pencil className="h-3 w-3" />
              Draft
            </span>
          ) : null}
        </div>

        <div className="absolute right-2 top-2 flex flex-col items-end gap-2">
          {showVerifiedBadge ? <LicenseVerifiedBadge /> : null}
          {item.styles?.length ? (
            <span className="rounded bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
              {item.styles[0]}
            </span>
          ) : null}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
          <div className="line-clamp-2 text-[13px] font-semibold leading-snug drop-shadow">
            {item.title}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] opacity-95">
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              {item.chapters || 0} chapters
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-2 dark:bg-card">
        <div className="mb-1 flex min-h-[20px] flex-wrap gap-1">
          {item.genres.slice(0, 2).map((genre) => (
            <span
              key={genre}
              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-700 dark:border-input dark:bg-muted dark:text-muted-foreground"
              title={genre}
            >
              {genre}
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
            {fmtViews(item.views)} views
          </span>
        </div>
      </div>
    </Link>
  );
}

export function MangaCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-black/5 dark:bg-card dark:ring-border">
      <div
        className="relative w-full animate-pulse"
        style={{ paddingBottom: "150%" }}
      >
        <div className="absolute inset-0 bg-slate-200 dark:bg-muted" />
      </div>
      <div className="space-y-2 bg-white p-2 dark:bg-card">
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
