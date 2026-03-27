"use client";

import { FilterX, RefreshCw, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { UserListPreset } from "./user-management.types";
import { ROLE_OPTIONS } from "./user-management.types";

function FiltersSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="h-5 w-36 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-52 animate-pulse rounded bg-slate-100" />
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_180px_120px]">
          <div className="h-10 animate-pulse rounded-md bg-slate-100" />
          <div className="h-10 animate-pulse rounded-md bg-slate-100" />
          <div className="h-10 animate-pulse rounded-md bg-slate-100" />
          <div className="h-10 animate-pulse rounded-md bg-slate-100" />
        </div>

        <div className="h-6 w-40 animate-pulse rounded bg-slate-100" />
      </CardContent>
    </Card>
  );
}

type UserManagementFiltersProps = {
  searchTerm: string;
  filterRole: string;
  filterStatus: string;
  filterPreset: UserListPreset;
  isLoading: boolean;
  isDirty: boolean;
  totalCount: number;
  filteredCount: number;
  activeFilterChips: string[];
  onSearchChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPresetChange: (value: UserListPreset) => void;
  onClearFilters: () => void;
  onReload: () => void;
};

export function UserManagementFilters({
  searchTerm,
  filterRole,
  filterStatus,
  filterPreset,
  isLoading,
  isDirty,
  totalCount,
  filteredCount,
  activeFilterChips,
  onSearchChange,
  onRoleChange,
  onStatusChange,
  onPresetChange,
  onClearFilters,
  onReload,
}: UserManagementFiltersProps) {
  if (isLoading) {
    return <FiltersSkeleton />;
  }

  const applyAuthors = () => {
    onPresetChange("all");
    onRoleChange("author");
    onStatusChange("all");
  };

  const applyStatus = (status: "Normal" | "Muted" | "Banned") => {
    onPresetChange("all");
    onRoleChange("all");
    onStatusChange(status);
  };

  const quickFilters = [
    {
      label: "All",
      active:
        filterPreset === "all" &&
        filterRole === "all" &&
        filterStatus === "all",
      onClick: onClearFilters,
    },
    {
      label: "Staff",
      active:
        filterPreset === "staff" &&
        filterRole === "all" &&
        filterStatus === "all",
      onClick: () => {
        onRoleChange("all");
        onStatusChange("all");
        onPresetChange("staff");
      },
    },
    {
      label: "New this week",
      active:
        filterPreset === "new-7d" &&
        filterRole === "all" &&
        filterStatus === "all",
      onClick: () => {
        onRoleChange("all");
        onStatusChange("all");
        onPresetChange("new-7d");
      },
    },
    {
      label: "Authors",
      active:
        filterPreset === "all" &&
        filterRole === "author" &&
        filterStatus === "all",
      onClick: applyAuthors,
    },
    {
      label: "Normal",
      active:
        filterPreset === "all" &&
        filterStatus === "Normal" &&
        filterRole === "all",
      onClick: () => applyStatus("Normal"),
    },
    {
      label: "Muted",
      active:
        filterPreset === "all" &&
        filterStatus === "Muted" &&
        filterRole === "all",
      onClick: () => applyStatus("Muted"),
    },
    {
      label: "Banned",
      active:
        filterPreset === "all" &&
        filterStatus === "Banned" &&
        filterRole === "all",
      onClick: () => applyStatus("Banned"),
    },
  ];

  return (
    <Card>
      <CardHeader className="gap-3 pb-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Search & Filters</CardTitle>
            <CardDescription>
              Showing {filteredCount} of {totalCount} users
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            {isDirty && (
              <button
                type="button"
                onClick={onClearFilters}
                className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-50"
              >
                <FilterX className="mr-2 h-4 w-4" />
                Clear filters
              </button>
            )}

            <button
              type="button"
              onClick={onReload}
              className="inline-flex items-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search users by name or email"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={filterRole} onValueChange={onRoleChange}>
            <SelectTrigger>
              <SelectValue placeholder="Role" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ROLE_OPTIONS.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={onStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Normal">Normal</SelectItem>
              <SelectItem value="Muted">Muted</SelectItem>
              <SelectItem value="Banned">Banned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          {quickFilters.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className={[
                "rounded-full border px-3 py-1 text-sm transition-colors",
                item.active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
        </div>

        {activeFilterChips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeFilterChips.map((chip) => (
              <Badge key={chip} variant="secondary" className="px-3 py-1">
                {chip}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
