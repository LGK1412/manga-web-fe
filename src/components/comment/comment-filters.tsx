"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RotateCcw } from "lucide-react";

export interface FilterState {
  manga: string;   // "" = All
  chapter: string; // "" = All
  status: string;  // "" = All
  user: string;
  search: string;
}

interface CommentFiltersProps {
  onFilter: (filters: FilterState) => void;
  mangas: Array<{ id: string; title: string }>;
  chapters: Array<{ id: string; title: string }>;
}

// ✅ Sentinel values cho Radix (SelectItem KHÔNG được để value = "")
const SENTINEL = {
  MANGA: "__ALL_MANGA__",
  CHAPTER: "__ALL_CHAPTER__",
  STATUS: "__ALL_STATUS__",
} as const;

export function CommentFilters({ onFilter, mangas, chapters }: CommentFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    manga: "",
    chapter: "",
    status: "",
    user: "",
    search: "",
  });

  const handleApplyFilter = () => onFilter(filters);

  const handleReset = () => {
    const reset: FilterState = { manga: "", chapter: "", status: "", user: "", search: "" };
    setFilters(reset);
    onFilter(reset);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search by content or username */}
        <div className="lg:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by content or username..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="pl-10"
            />
          </div>
        </div>

        {/* Select Manga */}
        <Select
          value={filters.manga || SENTINEL.MANGA}
          onValueChange={(value) => {
            // Map sentinel -> "" trong state
            const manga = value === SENTINEL.MANGA ? "" : value;
            setFilters((prev) => ({ ...prev, manga, chapter: "" })); // đổi manga thì reset chapter
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Manga" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SENTINEL.MANGA}>All Manga</SelectItem>
            {mangas.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Select Chapter (bị disable nếu chưa chọn manga) */}
        <Select
          value={filters.chapter || SENTINEL.CHAPTER}
          onValueChange={(value) => {
            const chapter = value === SENTINEL.CHAPTER ? "" : value;
            setFilters((prev) => ({ ...prev, chapter }));
          }}
          disabled={!filters.manga}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Chapter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SENTINEL.CHAPTER}>All Chapters</SelectItem>
            {chapters.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Select Status */}
        <Select
          value={filters.status || SENTINEL.STATUS}
          onValueChange={(value) => {
            const status = value === SENTINEL.STATUS ? "" : value;
            setFilters((prev) => ({ ...prev, status }));
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SENTINEL.STATUS}>All Status</SelectItem>
            <SelectItem value="visible">Visible</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleReset} className="gap-2 bg-transparent">
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
        <Button onClick={handleApplyFilter} className="gap-2">
          Apply Filter
        </Button>
      </div>
    </div>
  );
}
