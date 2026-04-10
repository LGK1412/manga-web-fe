"use client";

import { use, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  FileText,
  MessageSquare,
} from "lucide-react";
import { FACEBOOK_CONTACT_URL } from "@/lib/external-links";

interface Policy {
  _id: string;
  title: string;
  slug: string;
  mainType: string;
  subCategory: string;
  description: string;
  content: string;
  status: string;
  isPublic: boolean;
  updatedAt?: string;
}

interface Heading {
  id: string;
  text: string;
  type: "subCategory" | "title";
}

interface PolicySection {
  subCategory: string;
  items: Policy[];
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "http://localhost:3333";

const SUBCATEGORY_LABELS: Record<string, string> = {
  account: "Accounts and Sign-in",
  comment: "Comments and Community",
  posting: "Publishing and Copyright",
  general: "General Terms",
  data_usage: "Data Usage",
};

function formatSubCategory(slug: string) {
  return (
    SUBCATEGORY_LABELS[slug] ||
    slug
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.026 4.388 11.022 10.125 11.927v-8.438H7.078v-3.49h3.047V9.413c0-3.03 1.792-4.704 4.533-4.704 1.313 0 2.686.236 2.686.236v2.973H15.83c-1.49 0-1.955.931-1.955 1.887v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.095 24 18.099 24 12.073Z" />
    </svg>
  );
}

export default function PolicyPage({
  params,
}: {
  params: Promise<{ mainType: string }>;
}) {
  const { mainType } = use(params);
  const mainTypeUpper = (mainType ?? "").toUpperCase();

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [active, setActive] = useState("");

  useEffect(() => {
    if (!mainTypeUpper) return;

    const fetchPolicies = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const res = await axios.get(`${API_BASE}/api/policies`, {
          params: { mainType: mainTypeUpper },
        });

        setPolicies(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to fetch policies:", err);
        setLoadError("We couldn't load this policy page right now.");
        setPolicies([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPolicies();
  }, [mainTypeUpper]);

  const pageMeta = useMemo(() => {
    if (mainTypeUpper === "PRIVACY") {
      return {
        eyebrow: "Privacy Center",
        title: "Privacy Policy",
        description:
          "Learn how MangaWords handles personal data, account information, and public-facing privacy expectations.",
      };
    }

    return {
      eyebrow: "Policy Center",
      title: "Terms of Service",
      description:
        "Review the public rules, account expectations, and platform guidelines that shape the MangaWords experience.",
    };
  }, [mainTypeUpper]);

  const groupedPolicies = useMemo<PolicySection[]>(() => {
    const sections: PolicySection[] = [];

    policies.forEach((policy) => {
      const existingSection = sections.find(
        (section) => section.subCategory === policy.subCategory,
      );

      if (existingSection) {
        existingSection.items.push(policy);
        return;
      }

      sections.push({
        subCategory: policy.subCategory,
        items: [policy],
      });
    });

    return sections;
  }, [policies]);

  const headings = useMemo<Heading[]>(() => {
    const toc: Heading[] = [];

    groupedPolicies.forEach((section, sectionIndex) => {
      toc.push({
        id: `section-${section.subCategory}`,
        text: `${sectionIndex + 1}. ${formatSubCategory(section.subCategory)}`,
        type: "subCategory",
      });

      section.items.forEach((policy, itemIndex) => {
        toc.push({
          id: `policy-${policy._id}`,
          text: `${sectionIndex + 1}.${itemIndex + 1} ${policy.title}`,
          type: "title",
        });
      });
    });

    return toc;
  }, [groupedPolicies]);

  useEffect(() => {
    if (!headings.length) {
      setActive("");
      return;
    }

    setActive((current) =>
      headings.some((heading) => heading.id === current) ? current : headings[0].id,
    );
  }, [headings]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(191,219,254,0.35),_transparent_45%),linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)]">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
          <div className="w-full rounded-[28px] border border-slate-200/80 bg-white/90 p-10 text-center shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <FileText className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold text-slate-900">
              Loading public policy
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              We are preparing the latest public information for this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(191,219,254,0.32),_transparent_38%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_42%,#ffffff_100%)]">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-4 py-2 shadow-sm transition hover:border-slate-300 hover:bg-white"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-200">
              MW
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-slate-900">
                MangaWords
              </span>
              <span className="block text-xs text-slate-500">
                Public policy library
              </span>
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-200 hover:bg-white hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to home</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <section className="rounded-[32px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur xl:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr),280px] lg:items-start">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                <BookOpen className="h-3.5 w-3.5" />
                {pageMeta.eyebrow}
              </div>

              <div className="space-y-4">
                <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  {pageMeta.title}
                </h1>
                <p className="max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
                  {pageMeta.description}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Reading mode
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Public-facing sections are grouped for easier scanning on desktop and mobile.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Source of truth
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Content below is loaded from the current public policy records on the server.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.95)_0%,rgba(239,246,255,0.9)_100%)] p-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-sm">
                <MessageSquare className="h-3.5 w-3.5" />
                Support
              </div>
              <h2 className="mt-4 text-xl font-semibold text-slate-900">
                Need help?
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                If you have questions about this policy or how it applies to your account, contact the MangaWords support team on Facebook.
              </p>
              <a
                href={FACEBOOK_CONTACT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <FacebookIcon className="h-4 w-4" />
                Contact support
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[280px,minmax(0,1fr)]">
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/85 shadow-[0_18px_48px_-34px_rgba(15,23,42,0.35)] backdrop-blur">
                <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    On this page
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900">
                    Browse the public sections
                  </h3>
                </div>
                <nav className="space-y-1 p-3">
                  {headings.map((heading) => (
                    <button
                      key={heading.id}
                      onClick={() => {
                        document
                          .getElementById(heading.id)
                          ?.scrollIntoView({ behavior: "smooth", block: "start" });
                        setActive(heading.id);
                      }}
                      className={`block w-full rounded-2xl px-3 py-2.5 text-left text-sm transition ${
                        active === heading.id
                          ? "bg-blue-50 text-blue-700 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.15)]"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      } ${heading.type === "title" ? "pl-6" : ""}`}
                    >
                      {heading.text}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-[0_18px_48px_-34px_rgba(15,23,42,0.35)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Quick context
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Section headings are translated for easier navigation. The policy text itself remains exactly as stored in the public records.
                </p>
              </div>
            </div>
          </aside>

          <main className="lg:col-span-1">
            {loadError || !groupedPolicies.length ? (
              <div className="rounded-[32px] border border-slate-200 bg-white/90 p-10 text-center shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)]">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                  <FileText className="h-6 w-6" />
                </div>
                <h2 className="mt-5 text-2xl font-semibold text-slate-900">
                  This policy page is unavailable
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
                  {loadError ||
                    "There are no public policy entries available for this section right now."}
                </p>
                <Link
                  href="/"
                  className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Return to home
                </Link>
              </div>
            ) : (
              <article className="overflow-hidden rounded-[32px] border border-slate-200 bg-white/90 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)]">
                <div className="border-b border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.95)_0%,rgba(255,255,255,0.9)_100%)] px-6 py-6 sm:px-8">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                    <FileText className="h-3.5 w-3.5" />
                    Public reference
                  </div>
                  <h2 className="mt-4 text-3xl font-semibold text-slate-950">
                    {pageMeta.title}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                    Use the translated section labels to navigate quickly. Detailed policy wording below is shown as published by MangaWords.
                  </p>
                </div>

                <div className="px-6 py-8 sm:px-8 sm:py-10">
                  {groupedPolicies.map((section, sectionIndex) => (
                    <section
                      key={section.subCategory}
                      id={`section-${section.subCategory}`}
                      className="scroll-mt-28 border-b border-slate-200/80 pb-10 last:border-b-0 last:pb-0"
                    >
                      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <h3 className="text-2xl font-semibold text-slate-900">
                            {sectionIndex + 1}. {formatSubCategory(section.subCategory)}
                          </h3>
                        </div>
                        <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          {section.items.length} item{section.items.length === 1 ? "" : "s"}
                        </span>
                      </div>

                      <div className="space-y-5">
                        {section.items.map((policy, itemIndex) => (
                          <div
                            key={policy._id}
                            id={`policy-${policy._id}`}
                            className="scroll-mt-28 rounded-[28px] border border-slate-200 bg-slate-50/65 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-6"
                          >
                            <h4 className="text-lg font-semibold text-slate-900">
                              {sectionIndex + 1}.{itemIndex + 1} {policy.title}
                            </h4>
                            {policy.description ? (
                              <p className="mt-2 text-sm leading-6 text-slate-500">
                                {policy.description}
                              </p>
                            ) : null}
                            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700 sm:text-[15px]">
                              {policy.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </article>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
