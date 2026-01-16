"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, Mail, MessageSquare } from "lucide-react";
import { useState } from "react";

type FooterLink = { label: string; href: string };
type Section = { title: string; links: FooterLink[] };

type FooterProps = {
  brand?: { name?: string; tagline?: string };
  sections?: Section[];
  contact?: { email?: string; communityHref?: string };
  showBackToTop?: boolean;
};

export function Footer({
  brand,
  sections,
  contact,
  showBackToTop = true,
}: FooterProps) {
  const router = useRouter();
  const year = new Date().getFullYear();
  const brandName = brand?.name ?? "MangaWorld";
  const tagline = brand?.tagline ?? "Read stories quickly, smoothly, and with an easy-to-read interface.";

  const navSections: Section[] = sections ?? [
    {
      title: "Explore",
      links: [
        { label: "All Stories", href: "/stories" },
        { label: "Recently Updated", href: "/stories?sort=update" },
        { label: "Genres", href: "/stories?tab=genres" },
      ],
    },
    {
      title: "Account",
      links: [
        { label: "Login", href: "/login" },
        { label: "Top Up Points", href: "/topup" },
      ],
    },
    {
      title: "Information",
      links: [
        { label: "About Us", href: "#" },
        { label: "Contact", href: "#" },
      ],
    },
  ];

  const onBackToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer
      role="contentinfo"
      className="relative border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70"
    >
      {/* viền gradient ở đỉnh */}
      <div
        className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        aria-hidden="true"
      />

      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-8 md:grid-cols-12">
          {/* Brand + tagline + contact */}
          <div className="md:col-span-5">
            <Link href="/" className="inline-flex items-baseline gap-2">
              <span className="text-xl font-bold tracking-tight">
                {brandName}
              </span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                beta
              </span>
            </Link>
            <p className="mt-3 max-w-prose text-sm text-muted-foreground">
              {tagline}
            </p>

            {(contact?.email || contact?.communityHref) && (
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                {contact?.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="inline-flex items-center gap-2 hover:text-foreground"
                  >
                    <Mail className="h-4 w-4" />
                    {contact.email}
                  </a>
                )}
                {contact?.communityHref && (
                  <a
                    href={contact.communityHref}
                    className="inline-flex items-center gap-2 hover:text-foreground"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Community
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Nav sections */}
          <nav className="md:col-span-7 grid grid-cols-2 gap-6 sm:grid-cols-3">
            {navSections.map((sec) => (
              <div key={sec.title}>
                <h3 className="text-sm font-semibold">{sec.title}</h3>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {sec.links.map((link) => (
                    <li key={`${link.href}-${link.label}`}>
                      <Link
                        href={link.href}
                        className="hover:text-foreground hover:underline underline-offset-4"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t pt-6 text-sm text-muted-foreground md:flex-row">
          <p>© {year} {brandName}. All rights reserved.</p>

          <div className="flex items-center gap-4">
            {/* Chuyển sang trang riêng */}
            <button
              onClick={() => router.push("/policy/term")}
              className="hover:text-foreground"
            >
              Terms of Service
            </button>

            <span className="opacity-50">•</span>

            <button
              onClick={() => router.push("/policy/privacy")}
              className="hover:text-foreground"
            >
              Privacy Policy
            </button>

            {showBackToTop && (
              <>
                <span className="hidden opacity-50 md:inline">•</span>
                <button
                  onClick={onBackToTop}
                  className="inline-flex items-center gap-1 rounded-full border px-3 py-1 hover:bg-muted"
                >
                  <ArrowUp className="h-4 w-4" />
                  Back to top
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
