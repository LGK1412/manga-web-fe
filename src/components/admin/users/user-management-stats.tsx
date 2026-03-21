import type { ReactNode } from "react";
import { Ban, CheckCircle2, Edit, Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { UserRow } from "./user-management.types";

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
          "h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
          active ? "ring-2 ring-blue-500 border-blue-300 shadow-sm" : "",
        ].join(" ")}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
          <div className="text-muted-foreground">{icon}</div>
        </CardHeader>

        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
        </CardContent>
      </Card>
    </button>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <Card key={idx}>
          <CardHeader className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

type UserManagementStatsProps = {
  users: UserRow[];
  filterRole: string;
  filterStatus: string;
  isLoading: boolean;
  onSetRoleFilter: (value: string) => void;
  onSetStatusFilter: (value: string) => void;
  onResetFilters: () => void;
};

export function UserManagementStats({
  users,
  filterRole,
  filterStatus,
  isLoading,
  onSetRoleFilter,
  onSetStatusFilter,
  onResetFilters,
}: UserManagementStatsProps) {
  if (isLoading) {
    return <StatsSkeleton />;
  }

  const totalUsers = users.length;
  const authors = users.filter((user) => user.role === "author").length;
  const activeUsers = users.filter((user) => user.status === "Normal").length;
  const bannedUsers = users.filter((user) => user.status === "Banned").length;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <StatCard
        title="Total Users"
        value={totalUsers}
        description="Reset role and status filters"
        icon={<Users className="h-4 w-4" />}
        active={filterRole === "all" && filterStatus === "all"}
        onClick={onResetFilters}
      />

      <StatCard
        title="Authors"
        value={authors}
        description="Filter by author role"
        icon={<Edit className="h-4 w-4" />}
        active={filterRole === "author"}
        onClick={() => onSetRoleFilter("author")}
      />

      <StatCard
        title="Active Users"
        value={activeUsers}
        description="Filter by Normal status"
        icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
        active={filterStatus === "Normal"}
        onClick={() => onSetStatusFilter("Normal")}
      />

      <StatCard
        title="Banned Users"
        value={bannedUsers}
        description="Filter by Banned status"
        icon={<Ban className="h-4 w-4 text-red-600" />}
        active={filterStatus === "Banned"}
        onClick={() => onSetStatusFilter("Banned")}
      />
    </div>
  );
}