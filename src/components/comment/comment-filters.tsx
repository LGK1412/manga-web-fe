"use client";

import { RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FilterState {
  manga: string;
  chapter: string;
  status: string;
  user: string;
  search: string;
}

interface CommentFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  mangas: Array<{ id: string; title: string }>;
  chapters: Array<{ id: string; title: string }>;
}

const SENTINEL = {
  MANGA: "__ALL_MANGA__",
  CHAPTER: "__ALL_CHAPTER__",
  STATUS: "__ALL_STATUS__",
} as const;

export function CommentFilters({
  filters,
  onChange,
  onReset,
  mangas,
  chapters,
}: CommentFiltersProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by content or username..."
              value={filters.search}
              onChange={(event) =>
                onChange({
                  ...filters,
                  search: event.target.value,
                })
              }
              className="pl-10"
            />
          </div>
        </div>

        <Select
          value={filters.manga || SENTINEL.MANGA}
          onValueChange={(value) => {
            const manga = value === SENTINEL.MANGA ? "" : value;
            onChange({ ...filters, manga, chapter: "" });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Manga" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SENTINEL.MANGA}>All Manga</SelectItem>
            {mangas.map((manga) => (
              <SelectItem key={manga.id} value={manga.id}>
                {manga.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.chapter || SENTINEL.CHAPTER}
          onValueChange={(value) => {
            const chapter = value === SENTINEL.CHAPTER ? "" : value;
            onChange({ ...filters, chapter });
          }}
          disabled={!filters.manga}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Chapter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SENTINEL.CHAPTER}>All Chapters</SelectItem>
            {chapters.map((chapter) => (
              <SelectItem key={chapter.id} value={chapter.id}>
                {chapter.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status || SENTINEL.STATUS}
          onValueChange={(value) => {
            const status = value === SENTINEL.STATUS ? "" : value;
            onChange({ ...filters, status });
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

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          onClick={onReset}
          className="gap-2 bg-transparent"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}
