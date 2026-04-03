"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function buildPageWindow(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);
  if (currentPage - 1 > 1) pages.add(currentPage - 1);
  if (currentPage + 1 < totalPages) pages.add(currentPage + 1);
  if (currentPage - 2 > 1) pages.add(currentPage - 2);
  if (currentPage + 2 < totalPages) pages.add(currentPage + 2);

  return Array.from(pages).sort((a, b) => a - b);
}

type ModerationQueuePaginationProps = {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  visibleCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function ModerationQueuePagination({
  page,
  totalPages,
  pageSize,
  totalItems,
  visibleCount,
  onPageChange,
  onPageSizeChange,
}: ModerationQueuePaginationProps) {
  const pageWindow = buildPageWindow(page, totalPages);
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = totalItems === 0 ? 0 : rangeStart + visibleCount - 1;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="text-sm text-slate-600">
        Showing{" "}
        <span className="font-semibold text-slate-900">
          {rangeStart}-{rangeEnd}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-slate-900">{totalItems}</span> chapters
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Rows</span>

          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="w-[88px]">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="hidden items-center gap-1 sm:flex">
            {pageWindow.map((pageNumber, index) => {
              const previousPage = pageWindow[index - 1];
              const needsGap =
                typeof previousPage === "number" &&
                pageNumber - previousPage > 1;

              return (
                <div key={pageNumber} className="flex items-center gap-1">
                  {needsGap ? (
                    <span className="px-1 text-sm text-slate-400">...</span>
                  ) : null}

                  <Button
                    type="button"
                    variant={pageNumber === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="px-2 text-sm text-slate-600 sm:hidden">
            Page {page} / {totalPages}
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
