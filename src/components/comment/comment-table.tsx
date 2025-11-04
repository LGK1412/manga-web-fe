"use client";

import { Eye, EyeOff, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export interface Comment {
  id: string;
  commentId: string;
  username: string;
  storyTitle: string; // giữ tên cũ để không phải sửa nhiều — thực chất là Manga
  storyId: string;    // = mangaId
  chapter: string;
  chapterId: string;
  content: string;
  date: string;
  status: "visible" | "hidden";
}

interface CommentTableProps {
  comments: Comment[];
  onViewDetails: (comment: Comment) => void;
  onToggleVisibility: (id: string, currentStatus: string) => void;
  onDelete: (id: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  actionLoading?: string | null;
}

export function CommentTable({
  comments,
  onViewDetails,
  onToggleVisibility,
  onDelete,
  currentPage,
  totalPages,
  onPageChange,
  actionLoading,
}: CommentTableProps) {
  const truncateText = (text: string, length: number) => (text.length > length ? text.substring(0, length) + "..." : text);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Manga</TableHead>
              <TableHead>Chapter</TableHead>
              <TableHead className="max-w-xs">Content</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comments.map((comment) => {
              const isBusy = actionLoading === comment.id;
              return (
                <TableRow key={comment.id} className="hover:bg-gray-50">
                  <TableCell className="text-sm text-gray-500">{comment.commentId}</TableCell>
                  <TableCell className="font-medium">{comment.username}</TableCell>
                  <TableCell className="text-sm">{comment.storyTitle}</TableCell>
                  <TableCell className="text-sm">{comment.chapter || "—"}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    <span title={comment.content} className="cursor-help">
                      {truncateText(comment.content, 60)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{comment.date}</TableCell>
                  <TableCell>
                    <Badge
                      variant={comment.status === "visible" ? "default" : "secondary"}
                      className={comment.status === "visible" ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-800"}
                    >
                      {comment.status === "visible" ? "Visible" : "Hidden"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onViewDetails(comment)} title="View Details" disabled={isBusy}>
                        <Info className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleVisibility(comment.id, comment.status)}
                        title={comment.status === "visible" ? "Hide" : "Unhide"}
                        disabled={isBusy}
                      >
                        {comment.status === "visible" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      {/* BE chưa có DELETE → tạm disable nút */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(comment.id)}
                        title="Delete"
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        disabled
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-2">
        <Button variant="outline" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
          Previous
        </Button>
        <span className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </span>
        <Button variant="outline" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
          Next
        </Button>
      </div>
    </div>
  );
}
