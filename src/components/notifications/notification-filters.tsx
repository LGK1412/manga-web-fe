"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterX, Search, X } from "lucide-react";
import type {
  SavedFilter,
  SortFilter,
  StatusFilter,
} from "@/types/notification";

interface NotificationFiltersProps {
  resultCount: number;
  searchValue: string;
  statusValue: StatusFilter;
  savedValue: SavedFilter;
  sortValue: SortFilter;
  onSearchChange: (search: string) => void;
  onStatusChange: (status: StatusFilter) => void;
  onSavedChange: (saved: SavedFilter) => void;
  onSortChange: (sort: SortFilter) => void;
  onReset: () => void;
}

export function NotificationFilters({
  resultCount,
  searchValue,
  statusValue,
  savedValue,
  sortValue,
  onSearchChange,
  onStatusChange,
  onSavedChange,
  onSortChange,
  onReset,
}: NotificationFiltersProps) {
  const activeFilters = [
    statusValue !== "All" ? statusValue : null,
    savedValue !== "All" ? savedValue : null,
    searchValue ? `Search: ${searchValue}` : null,
    sortValue !== "Newest" ? sortValue : null,
  ].filter(Boolean);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Search & Filters</h2>
            <p className="mt-1 text-sm text-slate-500">
              {resultCount} notification{resultCount !== 1 ? "s" : ""} in current view
            </p>
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((item) => (
                <span
                  key={String(item)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                >
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="relative lg:col-span-5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchValue}
              placeholder="Search by title, message, or receiver..."
              className="h-11 rounded-xl border-slate-200 pl-10 pr-10"
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                aria-label="Clear search"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="lg:col-span-2">
            <Select
              value={statusValue}
              onValueChange={(value) => onStatusChange(value as StatusFilter)}
            >
              <SelectTrigger className="h-11 rounded-xl border-slate-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All status</SelectItem>
                <SelectItem value="Read">Read</SelectItem>
                <SelectItem value="Unread">Unread</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-2">
            <Select
              value={savedValue}
              onValueChange={(value) => onSavedChange(value as SavedFilter)}
            >
              <SelectTrigger className="h-11 rounded-xl border-slate-200">
                <SelectValue placeholder="Saved" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All saved states</SelectItem>
                <SelectItem value="Saved">Saved</SelectItem>
                <SelectItem value="Unsaved">Unsaved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-2">
            <Select
              value={sortValue}
              onValueChange={(value) => onSortChange(value as SortFilter)}
            >
              <SelectTrigger className="h-11 rounded-xl border-slate-200">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Newest">Newest first</SelectItem>
                <SelectItem value="Oldest">Oldest first</SelectItem>
                <SelectItem value="Title A-Z">Title A–Z</SelectItem>
                <SelectItem value="Title Z-A">Title Z–A</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-1">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-xl border-slate-200"
              onClick={onReset}
            >
              <FilterX className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}