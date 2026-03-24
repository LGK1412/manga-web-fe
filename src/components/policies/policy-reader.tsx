"use client"

import { ReactNode, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { FileText } from "lucide-react"

type PolicyReaderSection = {
  id: string
  title: string
  body: string
  level: 1 | 2 | 3
}

export interface PolicyReaderProps {
  title: string
  description?: string
  content: string
  mainType?: string
  subCategory?: string
  status?: string
  isPublic?: boolean
  effectiveFrom?: string
  effectiveTo?: string
  updatedAt?: string
  compact?: boolean
  actionSlot?: ReactNode
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

function isHeadingLine(line: string) {
  const trimmed = line.trim()
  if (!trimmed) return null

  if (/^#{1,3}\s+/.test(trimmed)) {
    const level = Math.min(trimmed.match(/^#+/)?.[0].length ?? 1, 3) as 1 | 2 | 3
    return {
      title: trimmed.replace(/^#{1,3}\s+/, "").trim(),
      level,
    }
  }

  if (/^(section|article|chapter|điều|mục|phần)\s+[\w\d]+/i.test(trimmed)) {
    return { title: trimmed, level: 1 as const }
  }

  if (
    /^(\d+(\.\d+)*[.)]|[A-Z][.)])\s+/.test(trimmed) &&
    trimmed.length <= 90
  ) {
    return { title: trimmed, level: 2 as const }
  }

  if (
    trimmed.length <= 70 &&
    !/[.!?]$/.test(trimmed) &&
    /^[A-ZÀ-Ỹ0-9\s\-:]+$/u.test(trimmed)
  ) {
    return { title: trimmed, level: 2 as const }
  }

  return null
}

export function parsePolicySections(content: string): PolicyReaderSection[] {
  const lines = content.split(/\r?\n/)
  const sections: PolicyReaderSection[] = []

  let currentTitle = "Overview"
  let currentLevel: 1 | 2 | 3 = 1
  let buffer: string[] = []

  const pushCurrent = () => {
    const body = buffer.join("\n").trim()
    if (!body && sections.length > 0) return

    const safeTitle = currentTitle.trim() || `Section ${sections.length + 1}`
    sections.push({
      id: `${slugify(safeTitle) || `section-${sections.length + 1}`}-${sections.length + 1}`,
      title: safeTitle,
      body,
      level: currentLevel,
    })
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const heading = isHeadingLine(line)

    if (heading) {
      if (buffer.length > 0 || sections.length === 0) {
        pushCurrent()
      }

      currentTitle = heading.title
      currentLevel = heading.level
      buffer = []
      continue
    }

    buffer.push(line)
  }

  if (buffer.length > 0 || sections.length === 0) {
    pushCurrent()
  }

  return sections.filter((section) => section.title || section.body)
}

function formatDate(value?: string) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("vi-VN")
}

function MetaBadge({
  children,
  tone = "default",
}: {
  children: ReactNode
  tone?: "default" | "green" | "amber" | "red" | "blue"
}) {
  const classes =
    tone === "green"
      ? "border-green-200 bg-green-50 text-green-700"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "red"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-gray-200 bg-gray-50 text-gray-700"

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${classes}`}>
      {children}
    </span>
  )
}

export default function PolicyReader({
  title,
  description,
  content,
  mainType,
  subCategory,
  status,
  isPublic,
  effectiveFrom,
  effectiveTo,
  updatedAt,
  compact = false,
  actionSlot,
}: PolicyReaderProps) {
  const sections = useMemo(() => parsePolicySections(content || ""), [content])

  const showToc = !compact && sections.length > 1

  return (
    <div className="space-y-6">
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FileText className="h-4 w-4" />
                <span>Policy Document</span>
              </div>

              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{title || "Untitled policy"}</h1>
                {description ? (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    {description}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {mainType ? <MetaBadge tone="blue">{mainType}</MetaBadge> : null}
                {subCategory ? <MetaBadge>{subCategory}</MetaBadge> : null}
                {status ? (
                  <MetaBadge
                    tone={
                      status === "Active"
                        ? "green"
                        : status === "Archived"
                        ? "red"
                        : "amber"
                    }
                  >
                    {status}
                  </MetaBadge>
                ) : null}
                {typeof isPublic === "boolean" ? (
                  <MetaBadge tone={isPublic ? "green" : "amber"}>
                    {isPublic ? "Public" : "Internal"}
                  </MetaBadge>
                ) : null}
              </div>
            </div>

            {actionSlot ? <div className="flex flex-wrap gap-2">{actionSlot}</div> : null}
          </div>

          <div className="grid gap-3 text-sm text-gray-600 md:grid-cols-3">
            <div className="rounded-xl border bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Effective from</p>
              <p className="mt-1 font-medium text-gray-900">{effectiveFrom ? formatDate(effectiveFrom) : "Not set"}</p>
            </div>

            <div className="rounded-xl border bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Effective to</p>
              <p className="mt-1 font-medium text-gray-900">{effectiveTo ? formatDate(effectiveTo) : "No end date"}</p>
            </div>

            <div className="rounded-xl border bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Last updated</p>
              <p className="mt-1 font-medium text-gray-900">{updatedAt ? formatDate(updatedAt) : "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className={showToc ? "grid gap-6 lg:grid-cols-[240px,minmax(0,1fr)]" : ""}>
        {showToc ? (
          <Card className="h-fit border-gray-200 shadow-sm lg:sticky lg:top-6">
            <CardContent className="p-4">
              <p className="mb-3 text-sm font-semibold text-gray-900">Contents</p>
              <nav className="space-y-1">
                {sections.map((section, index) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className={`block rounded-lg px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 ${
                      section.level === 2 ? "ml-3" : ""
                    } ${section.level === 3 ? "ml-6" : ""}`}
                  >
                    {index + 1}. {section.title}
                  </a>
                ))}
              </nav>
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-4">
          {sections.map((section, index) => (
            <Card
              key={section.id}
              id={section.id}
              className="scroll-mt-6 border-gray-200 shadow-sm"
            >
              <CardContent className="p-6">
                <div className="mb-4 flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                    {index + 1}
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
                    <p className="mt-1 text-xs uppercase tracking-wide text-gray-400">
                      Section {index + 1}
                    </p>
                  </div>
                </div>

                <div className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
                  {section.body || "No content in this section."}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}