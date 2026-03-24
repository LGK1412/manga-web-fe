import { FilterX, RefreshCw, Search } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ROLE_OPTIONS } from "./user-management.types";

function FiltersSkeleton() {
  return (
    <Card>
      <CardHeader>
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
  isLoading: boolean;
  isDirty: boolean;
  totalCount: number;
  filteredCount: number;
  activeFilterChips: string[];
  onSearchChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onClearFilters: () => void;
  onReload: () => void;
};

export function UserManagementFilters({
  searchTerm,
  filterRole,
  filterStatus,
  isLoading,
  isDirty,
  totalCount,
  filteredCount,
  activeFilterChips,
  onSearchChange,
  onRoleChange,
  onStatusChange,
  onClearFilters,
  onReload,
}: UserManagementFiltersProps) {
  if (isLoading) {
    return <FiltersSkeleton />;
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Search & Filters</CardTitle>
            <CardDescription>
              Showing {filteredCount} of {totalCount} users
            </CardDescription>
          </div>

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
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_180px_120px]">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name or email..."
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

          <button
            type="button"
            onClick={onReload}
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload
          </button>
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