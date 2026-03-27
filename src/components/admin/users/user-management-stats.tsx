"use client";

import type { ReactNode } from "react";
import { Edit, Shield, Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type {
  UserListPreset,
  UserManagementSummary,
} from "./user-management.types";

function StatCard({
  title,
  value,
  description,
  icon,
  active,
  onClick,
}: {
  title: string;
  value: number;
  description: string;
  icon: ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      <Card
        className={[
          "h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm",
          active ? "border-blue-300 ring-2 ring-blue-500 shadow-sm" : "",
        ].join(" ")}
      >
        <CardHeader className="flex flex-row items-start justify-between space-y-0 px-4 pb-2 pt-4">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
          <div className="text-muted-foreground">{icon}</div>
        </CardHeader>

        <CardContent className="px-4 pb-4 pt-0">
          <div className="text-2xl font-bold">{value}</div>
        </CardContent>
      </Card>
    </button>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, idx) => (
        <Card key={idx}>
          <CardHeader className="space-y-2 px-4 pb-2 pt-4">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

type UserManagementStatsProps = {
  summary: UserManagementSummary;
  filterRole: string;
  filterStatus: string;
  filterPreset: UserListPreset;
  isLoading: boolean;
  onApplyPreset: (preset: UserListPreset) => void;
  onSetRoleFilter: (value: string) => void;
  onSetStatusFilter: (value: string) => void;
  onResetFilters: () => void;
};

export function UserManagementStats({
  summary,
  filterRole,
  filterStatus,
  filterPreset,
  isLoading,
  onApplyPreset,
  onSetRoleFilter,
  onSetStatusFilter,
  onResetFilters,
}: UserManagementStatsProps) {
  if (isLoading) {
    return <StatsSkeleton />;
  }

  const totalUsers = summary.totalUsers;
  const authors = summary.authors;
  const staffUsers = summary.staffUsers;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <StatCard
        title="Total Users"
        value={totalUsers}
        description="Reset all filters"
        icon={<Users className="h-4 w-4" />}
        active={
          filterRole === "all" &&
          filterStatus === "all" &&
          filterPreset === "all"
        }
        onClick={onResetFilters}
      />

      <StatCard
        title="Authors"
        value={authors}
        description="Filter by author role"
        icon={<Edit className="h-4 w-4" />}
        active={
          filterRole === "author" &&
          filterStatus === "all" &&
          filterPreset === "all"
        }
        onClick={() => {
          onApplyPreset("all");
          onSetRoleFilter("author");
          onSetStatusFilter("all");
        }}
      />

      <StatCard
        title="Staff"
        value={staffUsers}
        description="Moderators and managers"
        icon={<Shield className="h-4 w-4" />}
        active={
          filterPreset === "staff" &&
          filterRole === "all" &&
          filterStatus === "all"
        }
        onClick={() => {
          onSetRoleFilter("all");
          onSetStatusFilter("all");
          onApplyPreset("staff");
        }}
      />
    </div>
  );
}
