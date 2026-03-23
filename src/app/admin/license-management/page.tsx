"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Search,
  ShieldCheck,
} from "lucide-react";

import AdminLayout from "../adminLayout/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  LICENSE_STATUS_META,
  RIGHTS_STATUS_META,
  type RightsBasis,
  type RightsReviewStatus,
  type StoryMonetizationType,
  type StoryOriginType,
} from "@/lib/story-rights";

type MangaLicenseStatus = "none" | "pending" | "approved" | "rejected";

type QueueItem = {
  _id: string;
  title: string;
  coverImage?: string;
  isPublish?: boolean;
  status?: string;
  licenseStatus: MangaLicenseStatus;
  licenseSubmittedAt?: string;
  enforcementStatus?: "normal" | "suspended" | "banned";
  authorId?: {
    _id?: string;
    username?: string;
    email?: string;
  };
  rightsStatus: RightsReviewStatus;
  originType: StoryOriginType;
  monetizationType: StoryMonetizationType;
  rightsBasis: RightsBasis;
  verifiedBadge: boolean;
};

type LicenseDetail = QueueItem & {
  licenseFiles?: string[];
  licenseNote?: string;
  licenseRejectReason?: string;
  licenseReviewedAt?: string;
  enforcementReason?: string;
  rights?: {
    sourceTitle?: string;
    sourceUrl?: string;
    licenseName?: string;
    licenseUrl?: string;
    proofNote?: string;
    claimStatus?: "none" | "open" | "resolved";
  };
};

type LicenseQueueResponse = {
  data: QueueItem[];
  total: number;
  page: number;
  limit: number;
  stats: Record<string, number>;
};

function getAssetCandidates(
  apiBase: string,
  filePath?: string,
  folder = "assets/licenses",
) {
  if (!filePath) return [];
  if (/^https?:\/\//i.test(filePath)) return [filePath];
  if (filePath.startsWith("/")) return [`${apiBase}${filePath}`];
  if (filePath.includes(folder)) {
    return [`${apiBase}/${filePath.replace(/^\/+/, "")}`];
  }
  return [`${apiBase}/${folder}/${filePath.replace(/^\/+/, "")}`];
}

export default function AdminStoryRightsModerationPage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [selected, setSelected] = useState<LicenseDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    MangaLicenseStatus | "all"
  >("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [stats, setStats] = useState<Record<string, number>>({
    none: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rejectionReason, setRejectionReason] = useState("");
  const [publishAfterApprove, setPublishAfterApprove] = useState(true);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);

  const apiBase = useMemo(() => {
    return (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  }, []);

  const api = useMemo(() => {
    return axios.create({
      baseURL: `${apiBase}/api`,
      withCredentials: true,
    });
  }, [apiBase]);

  const getFileUrls = (filePath?: string) =>
    getAssetCandidates(apiBase, filePath, "assets/licenses");
  const getCoverUrls = (coverImage?: string) =>
    getAssetCandidates(apiBase, coverImage, "assets/coverImages");

  const fetchQueue = async (nextPage = page) => {
    try {
      setLoading(true);

      const res = await api.get<LicenseQueueResponse>("/license/queue", {
        params: {
          status: statusFilter,
          q: searchQuery,
          page: nextPage,
          limit,
        },
      });

      setItems(res.data.data);
      setStats(res.data.stats);
      setPage(res.data.page);
      setError(null);

      if (res.data.data.length > 0) {
        const first = res.data.data[0];
        if (!selected || !res.data.data.some((x) => x._id === selected._id)) {
          await fetchDetail(first._id);
        }
      } else {
        setSelected(null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load moderation queue.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (mangaId: string) => {
    try {
      setDetailLoading(true);
      const res = await api.get<LicenseDetail>(`/license/${mangaId}`);
      setSelected(res.data);
      setSelectedFileIndex(0);
      setRejectionReason("");
      setPublishAfterApprove(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load story detail.");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQueue(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [statusFilter, searchQuery]);

  const currentFile =
    selected &&
    selected.licenseFiles &&
    selected.licenseFiles.length > 0 &&
    selectedFileIndex < selected.licenseFiles.length
      ? selected.licenseFiles[selectedFileIndex]
      : undefined;

  const currentFileUrl = currentFile ? getFileUrls(currentFile)[0] : undefined;
  const currentFileIsPdf =
    typeof currentFile === "string" && currentFile.toLowerCase().endsWith(".pdf");

  const handleReview = async (status: "approved" | "rejected") => {
    if (!selected) return;

    if (status === "rejected" && !rejectionReason.trim()) {
      alert("Please provide rejection reason.");
      return;
    }

    try {
      await api.patch(`/license/${selected._id}/review`, {
        status,
        rejectReason: status === "rejected" ? rejectionReason : "",
        publishAfterApprove: status === "approved" ? publishAfterApprove : false,
      });

      await fetchQueue(page);
      await fetchDetail(selected._id);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Review failed.");
    }
  };

  const handleTogglePublish = async (nextPublish: boolean) => {
    if (!selected) return;

    try {
      await api.patch(`/manga/admin/story/${selected._id}/publish`, {
        isPublish: nextPublish,
      });

      await fetchQueue(page);
      await fetchDetail(selected._id);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Update publish status failed.");
    }
  };

  const renderFilterButton = (label: string, value: typeof statusFilter) => {
    const active = statusFilter === value;

    return (
      <button
        key={value}
        onClick={() => setStatusFilter(value)}
        className={[
          "rounded-full border px-3 py-1.5 text-sm transition-colors",
          active
            ? "border-black bg-black text-white"
            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
        ].join(" ")}
      >
        {label}
      </button>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Story Rights Moderation</h1>
            <p className="text-sm text-gray-600">
              Review proof documents, inspect rights metadata, and control publishing.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {(["pending", "approved", "rejected", "none"] as const).map((key) => (
              <div key={key} className="rounded-lg border bg-white px-3 py-2">
                <div className="text-xs text-gray-500 capitalize">{key}</div>
                <div className="text-lg font-semibold">{stats[key] || 0}</div>
              </div>
            ))}
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading moderation queue...
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Moderation Queue</CardTitle>
                <CardDescription>Total: {items.length} stories on this page</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {renderFilterButton("All", "all")}
                  {renderFilterButton("Pending", "pending")}
                  {renderFilterButton("Approved", "approved")}
                  {renderFilterButton("Rejected", "rejected")}
                  {renderFilterButton("None", "none")}
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title..."
                    className="pl-9"
                  />
                </div>

                <div className="space-y-3">
                  {items.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">
                      No stories found.
                    </div>
                  ) : (
                    items.map((item) => {
                      const licenseMeta = LICENSE_STATUS_META[item.licenseStatus];
                      const rightsMeta = RIGHTS_STATUS_META[item.rightsStatus];
                      const active = selected?._id === item._id;

                      return (
                        <button
                          key={item._id}
                          onClick={() => fetchDetail(item._id)}
                          className={[
                            "w-full rounded-xl border p-3 text-left transition",
                            active
                              ? "border-black bg-gray-50"
                              : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50",
                          ].join(" ")}
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-16 w-12 shrink-0 overflow-hidden rounded-md border bg-gray-100">
                              {item.coverImage ? (
                                <img
                                  src={getCoverUrls(item.coverImage)[0]}
                                  alt={item.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                            </div>

                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="line-clamp-2 text-sm font-medium">
                                {item.title}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Badge className={`border ${licenseMeta.className}`}>
                                  {licenseMeta.label}
                                </Badge>
                                <Badge className={`border ${rightsMeta.className}`}>
                                  {rightsMeta.label}
                                </Badge>
                                {item.verifiedBadge ? (
                                  <Badge className="border border-green-200 bg-green-50 text-green-700">
                                    Verified
                                  </Badge>
                                ) : null}
                              </div>

                              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                                <span>{item.originType}</span>
                                <span>•</span>
                                <span>{item.monetizationType}</span>
                                <span>•</span>
                                <span>{item.rightsBasis}</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Story Rights Detail</CardTitle>
                <CardDescription>
                  Review rights metadata, proof files, and publish eligibility.
                </CardDescription>
              </CardHeader>

              <CardContent>
                {detailLoading ? (
                  <div className="flex h-80 items-center justify-center">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading detail...
                    </div>
                  </div>
                ) : !selected ? (
                  <div className="rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
                    Select a story from the queue.
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-4 lg:flex-row">
                      <div className="h-48 w-36 shrink-0 overflow-hidden rounded-xl border bg-gray-100">
                        {selected.coverImage ? (
                          <img
                            src={getCoverUrls(selected.coverImage)[0]}
                            alt={selected.title}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1 space-y-4">
                        <div>
                          <h2 className="text-2xl font-semibold">{selected.title}</h2>
                          <p className="mt-1 text-sm text-gray-500">
                            Author: {selected.authorId?.username || "Unknown"}{" "}
                            {selected.authorId?.email ? `(${selected.authorId.email})` : ""}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge className={`border ${LICENSE_STATUS_META[selected.licenseStatus].className}`}>
                            License: {LICENSE_STATUS_META[selected.licenseStatus].label}
                          </Badge>
                          <Badge className={`border ${RIGHTS_STATUS_META[selected.rightsStatus].className}`}>
                            Rights: {RIGHTS_STATUS_META[selected.rightsStatus].label}
                          </Badge>
                          <Badge
                            className={`border ${
                              selected.isPublish
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : "border-gray-200 bg-gray-100 text-gray-700"
                            }`}
                          >
                            {selected.isPublish ? "Published" : "Draft"}
                          </Badge>
                          {selected.verifiedBadge ? (
                            <Badge className="border border-green-200 bg-green-50 text-green-700">
                              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                              Verified
                            </Badge>
                          ) : null}
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-xl border bg-gray-50 p-3">
                            <div className="text-xs text-gray-500">Origin</div>
                            <div className="mt-1 font-medium">{selected.originType}</div>
                          </div>
                          <div className="rounded-xl border bg-gray-50 p-3">
                            <div className="text-xs text-gray-500">Monetization</div>
                            <div className="mt-1 font-medium">{selected.monetizationType}</div>
                          </div>
                          <div className="rounded-xl border bg-gray-50 p-3">
                            <div className="text-xs text-gray-500">Rights basis</div>
                            <div className="mt-1 font-medium">{selected.rightsBasis}</div>
                          </div>
                          <div className="rounded-xl border bg-gray-50 p-3">
                            <div className="text-xs text-gray-500">Enforcement</div>
                            <div className="mt-1 font-medium">
                              {selected.enforcementStatus || "normal"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <h3 className="text-base font-semibold">Rights Metadata</h3>

                          <div className="grid gap-3 md:grid-cols-2">
                            <InfoBlock label="Source title" value={selected.rights?.sourceTitle} />
                            <InfoBlock label="Source URL" value={selected.rights?.sourceUrl} isLink />
                            <InfoBlock label="License name" value={selected.rights?.licenseName} />
                            <InfoBlock label="License URL" value={selected.rights?.licenseUrl} isLink />
                            <InfoBlock
                              label="Claim status"
                              value={selected.rights?.claimStatus || "none"}
                            />
                            <InfoBlock
                              label="License submitted at"
                              value={selected.licenseSubmittedAt}
                              isDate
                            />
                          </div>

                          {selected.licenseNote ? (
                            <div className="rounded-xl border bg-gray-50 p-4">
                              <div className="text-xs text-gray-500">Submission note</div>
                              <div className="mt-2 text-sm">{selected.licenseNote}</div>
                            </div>
                          ) : null}

                          {selected.licenseRejectReason ? (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                              <p className="font-medium">Reject reason</p>
                              <p className="mt-1">{selected.licenseRejectReason}</p>
                            </div>
                          ) : null}
                        </div>

                        <div className="space-y-3">
                          <h3 className="text-base font-semibold">Proof Files</h3>

                          {selected.licenseFiles && selected.licenseFiles.length > 0 ? (
                            <div className="space-y-3">
                              <div className="flex flex-wrap gap-2">
                                {selected.licenseFiles.map((file, index) => {
                                  const active = index === selectedFileIndex;
                                  return (
                                    <button
                                      key={`${file}-${index}`}
                                      onClick={() => setSelectedFileIndex(index)}
                                      className={[
                                        "rounded-full border px-3 py-1.5 text-sm",
                                        active
                                          ? "border-black bg-black text-white"
                                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                                      ].join(" ")}
                                    >
                                      File {index + 1}
                                    </button>
                                  );
                                })}
                              </div>

                              {currentFileUrl ? (
                                <div className="overflow-hidden rounded-xl border">
                                  <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-2">
                                    <div className="truncate text-sm font-medium">
                                      {currentFile?.split("/").pop()}
                                    </div>
                                    <a
                                      href={currentFileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                    >
                                      Open
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  </div>

                                  <div className="h-[560px] bg-white">
                                    {currentFileIsPdf ? (
                                      <iframe
                                        src={currentFileUrl}
                                        className="h-full w-full"
                                        title="Proof document"
                                      />
                                    ) : (
                                      <img
                                        src={currentFileUrl}
                                        alt="Proof document"
                                        className="h-full w-full object-contain"
                                      />
                                    )}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">
                              No proof files uploaded.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-xl border bg-gray-50 p-4">
                          <div className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="mt-0.5 h-4 w-4 text-orange-500" />
                            <div>
                              <p className="font-medium">Moderation actions</p>
                              <p className="mt-1 text-gray-600">
                                Approving can optionally publish the story immediately.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 rounded-xl border p-4">
                          <label className="text-sm font-medium">Reject reason</label>
                          <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={4}
                            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                            placeholder="Explain why this submission is rejected..."
                          />
                        </div>

                        <label className="flex items-start gap-3 rounded-xl border p-4">
                          <input
                            type="checkbox"
                            checked={publishAfterApprove}
                            onChange={(e) => setPublishAfterApprove(e.target.checked)}
                            className="mt-1"
                          />
                          <div>
                            <p className="text-sm font-medium">Publish after approve</p>
                            <p className="text-sm text-gray-600">
                              The backend will still block publishing if rights policy fails.
                            </p>
                          </div>
                        </label>

                        <div className="grid gap-3">
                          <Button
                            onClick={() => handleReview("approved")}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Approve
                          </Button>

                          <Button
                            variant="destructive"
                            onClick={() => handleReview("rejected")}
                          >
                            Reject
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() => handleTogglePublish(!selected.isPublish)}
                          >
                            {selected.isPublish ? "Unpublish Story" : "Publish Story"}
                          </Button>
                        </div>

                        <div className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-600">
                          <p className="font-medium">Quick facts</p>
                          <ul className="mt-2 space-y-2">
                            <li>• Original + self declaration may publish without moderator approval.</li>
                            <li>• Translation / adaptation / repost must stay in review flow.</li>
                            <li>• Verified badge is now separate from basic publish eligibility.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function InfoBlock({
  label,
  value,
  isLink = false,
  isDate = false,
}: {
  label: string;
  value?: string | null;
  isLink?: boolean;
  isDate?: boolean;
}) {
  const safe = value?.trim?.() ? value : "";

  return (
    <div className="rounded-xl border bg-gray-50 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 break-words text-sm font-medium">
        {!safe ? (
          <span className="text-gray-400">—</span>
        ) : isDate ? (
          new Date(safe).toLocaleString()
        ) : isLink ? (
          <a
            href={safe}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
          >
            {safe}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          safe
        )}
      </div>
    </div>
  );
}