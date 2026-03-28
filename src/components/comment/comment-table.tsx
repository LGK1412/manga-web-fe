"use client";

import Link from "next/link";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  EyeOff,
  Info,
  MessageSquareMore,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatRoleLabel,
  getRoleColor,
  getRoleIcon,
} from "@/components/admin/users/user-management.utils";

export interface Comment {
  id: string;
  commentId: string;
  username: string;
  userEmail?: string;
  userRole?: string;
  userAvatar?: string;
  storyTitle: string;
  storyId: string;
  chapter: string;
  chapterId: string;
  content: string;
  plainContent: string;
  date: string;
  createdAt?: string;
  status: "visible" | "hidden";
  replyCount?: number;
  replyUsernames?: string[];
}

export type CommentSortColumn =
  | "commentId"
  | "user"
  | "manga"
  | "chapter"
  | "date";

export type SortDirection = "asc" | "desc";

interface CommentTableProps {
  comments: Comment[];
  onViewDetails: (comment: Comment) => void;
  onToggleVisibility: (id: string, currentStatus: string) => void;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  actionLoading?: string | null;
  sortColumn: CommentSortColumn;
  sortDirection: SortDirection;
  onSort: (column: CommentSortColumn) => void;
  selectedCommentId?: string | null;
}

function getInitial(value?: string) {
  return value?.trim()?.charAt(0)?.toUpperCase() || "U";
}

function SortableHeader({
  column,
  label,
  activeColumn,
  direction,
  onSort,
}: {
  column: CommentSortColumn;
  label: string;
  activeColumn: CommentSortColumn;
  direction: SortDirection;
  onSort: (column: CommentSortColumn) => void;
}) {
  const isActive = activeColumn === column;

  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="inline-flex items-center gap-1 font-medium text-slate-700 transition-colors hover:text-slate-900"
    >
      <span>{label}</span>

      {!isActive ? (
        <ArrowUpDown className="h-4 w-4 text-slate-400" />
      ) : direction === "desc" ? (
        <ChevronDown className="h-4 w-4 text-slate-500" />
      ) : (
        <ChevronUp className="h-4 w-4 text-slate-500" />
      )}
    </button>
  );
}

function PreviewCell({ comment }: { comment: Comment }) {
  const preview =
    comment.plainContent || "This comment contains media or formatting only.";
  const previewLimit = 64;
  const compactPreview =
    preview.length <= previewLimit
      ? preview
      : `${preview.slice(0, previewLimit).trimEnd()}...`;

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="w-full rounded-lg border border-slate-200/90 bg-slate-50 px-3 py-2 text-left transition-colors hover:border-slate-300 hover:bg-white"
        >
          <p className="truncate text-[13px] text-slate-700">
            {compactPreview}
          </p>
        </button>
      </HoverCardTrigger>

      <HoverCardContent align="start" className="w-[360px] space-y-3 rounded-2xl border-slate-200 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <MessageSquareMore className="h-4 w-4 text-slate-400" />
          Comment Preview
        </div>

        <p className="max-h-[220px] overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-slate-600">
          {preview}
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}

export function CommentTable({
  comments,
  onViewDetails,
  onToggleVisibility,
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  actionLoading,
  sortColumn,
  sortDirection,
  onSort,
  selectedCommentId = null,
}: CommentTableProps) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[132px] min-w-[132px]">
                  <SortableHeader
                    column="commentId"
                    label="ID"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onSort={onSort}
                  />
                </TableHead>
                <TableHead className="min-w-[260px]">
                  <SortableHeader
                    column="user"
                    label="User"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onSort={onSort}
                  />
                </TableHead>
                <TableHead className="min-w-[220px]">
                  <SortableHeader
                    column="manga"
                    label="Manga"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onSort={onSort}
                  />
                </TableHead>
                <TableHead className="min-w-[220px]">
                  <SortableHeader
                    column="chapter"
                    label="Chapter"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onSort={onSort}
                  />
                </TableHead>
                <TableHead className="min-w-[220px]">Preview</TableHead>
                <TableHead className="min-w-[180px]">
                  <SortableHeader
                    column="date"
                    label="Created"
                    activeColumn={sortColumn}
                    direction={sortDirection}
                    onSort={onSort}
                  />
                </TableHead>
                <TableHead className="w-[184px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {comments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                    No comments match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                comments.map((comment) => {
                  const isBusy = actionLoading === comment.id;
                  const isVisible = comment.status === "visible";
                  const isSelected = selectedCommentId === comment.id;

                  return (
                    <TableRow
                      key={comment.id}
                      className={`transition-colors hover:bg-slate-50/70 ${
                        isSelected
                          ? "bg-sky-50/80 ring-1 ring-sky-200"
                          : isVisible
                            ? ""
                            : "bg-amber-50/40"
                      }`}
                    >
                      <TableCell className="align-middle">
                        <div
                          className={`inline-flex min-w-[96px] flex-col rounded-xl border px-3 py-2 shadow-sm ${
                            isVisible
                              ? "border-slate-200 bg-slate-50 text-slate-700"
                              : "border-amber-200 bg-amber-50 text-amber-800"
                          }`}
                        >
                          <span className="font-mono text-xs font-semibold tracking-[0.16em]">
                            {comment.commentId}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 border">
                            <AvatarImage
                              src={comment.userAvatar || undefined}
                              alt={comment.username}
                              referrerPolicy="no-referrer"
                            />
                            <AvatarFallback>
                              {getInitial(comment.username)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0">
                            <div className="font-medium text-slate-900">
                              {comment.username}
                            </div>
                            <div className="truncate text-slate-500">
                              {comment.userEmail || "No email"}
                            </div>

                            {comment.userRole ? (
                              <div className="mt-1.5 flex flex-wrap gap-2">
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
                      </TableCell>

                      <TableCell>
                        <div className="min-w-0 space-y-2">
                          <Link
                            href={`/story/${comment.storyId}`}
                            className="inline-flex max-w-full items-center gap-1 text-sm font-semibold text-slate-800 transition-colors hover:text-sky-700"
                          >
                            <span className="truncate">{comment.storyTitle}</span>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          </Link>

                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="min-w-0 space-y-2">
                          <Link
                            href={`/chapter/${comment.chapterId}`}
                            className="inline-flex max-w-full items-center gap-1 text-sm font-medium text-slate-700 transition-colors hover:text-sky-700"
                          >
                            <span className="truncate">{comment.chapter || "N/A"}</span>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          </Link>

                          <div className="flex flex-wrap gap-2">
                            <Badge
                              variant="secondary"
                              className="border border-slate-200 bg-slate-50 text-slate-600"
                            >
                              {comment.replyCount || 0} repl
                              {(comment.replyCount || 0) === 1 ? "y" : "ies"}
                            </Badge>

                            {comment.replyUsernames?.length ? (
                              <Badge
                                variant="secondary"
                                className="border border-slate-200 bg-white text-slate-600"
                              >
                                {comment.replyUsernames.slice(0, 2).join(", ")}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <PreviewCell comment={comment} />
                      </TableCell>

                      <TableCell className="text-sm text-slate-500">
                        {comment.date}
                      </TableCell>

                      <TableCell className="align-middle">
                        <div className="mx-auto grid w-[164px] grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-full rounded-xl border-sky-200 bg-sky-50 text-sky-700 shadow-none transition-colors hover:border-sky-300 hover:bg-sky-100 hover:text-sky-800"
                            onClick={() => onViewDetails(comment)}
                            disabled={isBusy}
                          >
                            <Info className="h-4 w-4" />
                            Review
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className={
                              isVisible
                                ? "h-9 w-full rounded-xl border-amber-200 bg-amber-50 text-amber-700 shadow-none transition-colors hover:border-amber-300 hover:bg-amber-100 hover:text-amber-800"
                                : "h-9 w-full rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 shadow-none transition-colors hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800"
                            }
                            onClick={() =>
                              onToggleVisibility(comment.id, comment.status)
                            }
                            disabled={isBusy}
                            title={isVisible ? "Hide comment" : "Restore comment"}
                          >
                            {isVisible ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                            {isVisible ? "Hide" : "Restore"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Showing {comments.length} item{comments.length === 1 ? "" : "s"} on page{" "}
          {currentPage} of {totalPages}. Total filtered comments: {totalItems}.
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
