"use client";

import DOMPurify from "isomorphic-dompurify";
import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  ExternalLink,
  MessageSquareText,
  ShieldAlert,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Comment } from "./comment-table";
import {
  formatRoleLabel,
  getRoleColor,
  getRoleIcon,
} from "@/components/admin/users/user-management.utils";

interface CommentModalProps {
  open: boolean;
  comment: Comment | null;
  onClose: () => void;
  onToggleVisibility: (id: string, currentStatus: string) => void;
  actionLoadingId?: string | null;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

function getInitial(value?: string) {
  return value?.trim()?.charAt(0)?.toUpperCase() || "U";
}

function escapePlainText(content: string) {
  return content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");
}

function normalizeCommentHtml(content: string, apiUrl?: string) {
  const normalizedApi = (apiUrl || "").replace(/\/+$/, "");
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(content);

  let html = hasHtml ? content : escapePlainText(content);

  html = html.replace(/<div><br\s*\/?><\/div>/gi, "<br />");

  if (normalizedApi) {
    html = html.replace(/https?:\/\/localhost:\d+/gi, normalizedApi);
    html = html.replace(
      /src=(['"])\/(assets\/emoji\/[^'"]+)\1/gi,
      `src=$1${normalizedApi}/$2$1`
    );
    html = html.replace(
      /src=(['"])(assets\/emoji\/[^'"]+)\1/gi,
      `src=$1${normalizedApi}/$2$1`
    );
  }

  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["class", "target", "rel", "referrerpolicy"],
  });
}

export function CommentModal({
  open,
  comment,
  onClose,
  onToggleVisibility,
  actionLoadingId = null,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}: CommentModalProps) {
  const API = process.env.NEXT_PUBLIC_API_URL;

  const renderedContent = useMemo(() => {
    if (!comment?.content) return "";
    return normalizeCommentHtml(comment.content, API);
  }, [API, comment?.content]);

  if (!comment) return null;

  const isBusy = actionLoadingId === comment.id;
  const isVisible = comment.status === "visible";

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-hidden border-l border-slate-200 bg-slate-50 p-0 shadow-2xl sm:max-w-xl sm:rounded-l-[28px] lg:max-w-[760px]"
      >
        <SheetHeader className="border-b border-slate-200 bg-gradient-to-b from-white via-white to-slate-50/90 px-6 py-6 sm:rounded-tl-[28px]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SheetTitle className="text-[1.15rem] tracking-tight text-slate-900">
                Comment Review Panel
              </SheetTitle>
              <SheetDescription className="mt-1 max-w-2xl text-slate-500">
                Review content, navigate between nearby comments, and moderate
                without leaving the table.
              </SheetDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                className="border border-slate-200 bg-white text-slate-700"
              >
                ID: {comment.commentId}
              </Badge>
              <Badge
                variant="secondary"
                className={
                  isVisible
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border border-amber-200 bg-amber-50 text-amber-700"
                }
              >
                {isVisible ? "Visible" : "Hidden"}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/80 px-6 py-5">
          <div className="rounded-[26px] border border-slate-200/90 bg-white/95 p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 border border-slate-200 shadow-sm">
                  <AvatarImage
                    src={comment.userAvatar || undefined}
                    alt={comment.username}
                    referrerPolicy="no-referrer"
                  />
                  <AvatarFallback>{getInitial(comment.username)}</AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <div className="text-base font-semibold text-slate-900">
                    {comment.username}
                  </div>
                  <div className="truncate text-sm text-slate-500">
                    {comment.userEmail || "No email"}
                  </div>

                  {comment.userRole ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge
                        variant="secondary"
                        className={`inline-flex items-center gap-1 border ${getRoleColor(
                          comment.userRole
                        )}`}
                      >
                        {getRoleIcon(comment.userRole)}
                        {formatRoleLabel(comment.userRole)}
                      </Badge>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="secondary"
                  className="border border-slate-200 bg-white text-slate-700"
                >
                  {comment.replyCount || 0} repl
                  {(comment.replyCount || 0) === 1 ? "y" : "ies"}
                </Badge>

                {comment.replyUsernames?.length ? (
                  <Badge
                    variant="secondary"
                    className="border border-slate-200 bg-white text-slate-700"
                  >
                    {comment.replyUsernames.slice(0, 3).join(", ")}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200/90 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Manga Context</p>
              <p className="mt-1 font-semibold text-slate-900">
                {comment.storyTitle}
              </p>
              <Button
                asChild
                variant="link"
                className="mt-2 h-auto px-0 text-sky-700"
              >
                <Link href={`/story/${comment.storyId}`}>
                  Open story
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="rounded-[24px] border border-slate-200/90 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Chapter Context</p>
              <p className="mt-1 font-semibold text-slate-900">
                {comment.chapter || "N/A"}
              </p>
              <Button
                asChild
                variant="link"
                className="mt-2 h-auto px-0 text-sky-700"
              >
                <Link href={`/chapter/${comment.chapterId}`}>
                  Open chapter
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="rounded-[24px] border border-slate-200/90 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Created</p>
              <p className="mt-1 font-semibold text-slate-900">{comment.date}</p>
            </div>

            <div className="rounded-[24px] border border-slate-200/90 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Moderation Hint</p>
              <p className="mt-1 flex items-center gap-2 font-medium text-slate-700">
                <ShieldAlert className="h-4 w-4 text-slate-400" />
                {isVisible
                  ? "Comment is currently visible to readers."
                  : "Comment is currently hidden from readers."}
              </p>
            </div>
          </div>

          <div className="rounded-[26px] border border-slate-200/90 bg-white p-5 shadow-sm">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-600">
              <MessageSquareText className="h-4 w-4" />
              Full Content
            </p>

            <div
              className="rounded-[22px] border border-slate-200 bg-slate-50/90 p-4 text-sm leading-7 text-slate-700 break-words shadow-inner [&_a]:text-sky-700 [&_a]:underline [&_div]:mb-2 [&_div:last-child]:mb-0 [&_img]:mx-0 [&_img]:my-1 [&_img]:inline-block [&_img]:h-8 [&_img]:w-8 [&_img]:align-middle [&_p]:mb-2 [&_p:last-child]:mb-0 [&_span]:align-middle"
              dangerouslySetInnerHTML={{ __html: renderedContent }}
            />
          </div>
        </div>

        <SheetFooter className="border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/85 sm:rounded-bl-[28px]">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onPrevious}
                disabled={!hasPrevious}
                className="gap-2 rounded-xl"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={onNext}
                disabled={!hasNext}
                className="gap-2 rounded-xl"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isBusy}
                className="rounded-xl"
              >
                Close
              </Button>
              <Button
                variant="outline"
                onClick={() => onToggleVisibility(comment.id, comment.status)}
                className={
                  isVisible
                    ? "gap-2 rounded-xl border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100 hover:text-amber-800"
                    : "gap-2 rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800"
                }
                disabled={isBusy}
                title={isVisible ? "Hide comment" : "Restore comment"}
              >
                {isVisible ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Hide Comment
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Restore Comment
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default CommentModal;
