"use client";

import {
  ArrowUpDown,
  BellRing,
  ChevronDown,
  ChevronUp,
  Edit3,
  Mail,
} from "lucide-react";
import type { SortingState } from "@tanstack/react-table";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import type { UserRow, UserSortColumn } from "./user-management.types";
import {
  formatDisplayDate,
  getProviderMeta,
  getRiskMeta,
  formatRoleLabel,
  getRoleColor,
  getRoleIcon,
  getStatusColor,
  getStatusIcon,
  getVerificationMeta,
} from "./user-management.utils";

type UserManagementTableProps = {
  users: UserRow[];
  isLoading: boolean;
  highlightId: string | null;
  sorting: SortingState;
  selectedIds: Set<string>;
  selectableIds: Set<string>;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  onSortingChange: (value: SortingState) => void;
  onToggleSelect: (userId: string) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onOpenUser: (user: UserRow) => void;
  onEditUser: (user: UserRow) => void;
  onOpenNotifications: (user: UserRow) => void;
};

function nextSortingState(
  currentSorting: SortingState,
  column: UserSortColumn
): SortingState {
  const activeSort = currentSorting[0];

  if (!activeSort || activeSort.id !== column) {
    return [{ id: column, desc: false }];
  }

  return [{ id: column, desc: !activeSort.desc }];
}

function SortButton({
  column,
  label,
  sorting,
  onSortingChange,
}: {
  column: UserSortColumn;
  label: string;
  sorting: SortingState;
  onSortingChange: (value: SortingState) => void;
}) {
  const activeSort = sorting[0];
  const isActive = activeSort?.id === column;

  return (
    <button
      type="button"
      onClick={() => onSortingChange(nextSortingState(sorting, column))}
      className="inline-flex items-center gap-1 font-medium text-slate-700 transition-colors hover:text-slate-900"
    >
      <span>{label}</span>

      {!isActive ? (
        <ArrowUpDown className="h-4 w-4 text-slate-400" />
      ) : activeSort.desc ? (
        <ChevronDown className="h-4 w-4 text-slate-500" />
      ) : (
        <ChevronUp className="h-4 w-4 text-slate-500" />
      )}
    </button>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <tr key={index} className="border-t">
          <td className="px-4 py-4">
            <div className="h-4 w-4 animate-pulse rounded bg-slate-200" />
          </td>

          <td className="px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />
              <div className="space-y-2">
                <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-48 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          </td>

          <td className="px-4 py-4">
            <div className="h-6 w-24 animate-pulse rounded bg-slate-100" />
          </td>

          <td className="px-4 py-4">
            <div className="h-6 w-24 animate-pulse rounded bg-slate-100" />
          </td>

          <td className="px-4 py-4">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
          </td>

          <td className="px-4 py-4">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
          </td>

          <td className="px-4 py-4 align-middle">
            <div className="mx-auto grid w-[164px] grid-cols-2 gap-2">
              <div className="h-9 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-9 animate-pulse rounded-xl bg-slate-100" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

export function UserManagementTable({
  users,
  isLoading,
  highlightId,
  sorting,
  selectedIds,
  selectableIds,
  allVisibleSelected,
  someVisibleSelected,
  onSortingChange,
  onToggleSelect,
  onToggleSelectAll,
  onOpenUser,
  onEditUser,
  onOpenNotifications,
}: UserManagementTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[1080px] w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b text-left">
              <th className="w-12 px-4 py-3">
                <Checkbox
                  checked={
                    allVisibleSelected
                      ? true
                      : someVisibleSelected
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={(checked) =>
                    onToggleSelectAll(Boolean(checked))
                  }
                  disabled={
                    isLoading || users.length === 0 || selectableIds.size === 0
                  }
                  aria-label="Select all visible eligible users"
                />
              </th>

              <th className="px-4 py-3">
                <SortButton
                  column="name"
                  label="User"
                  sorting={sorting}
                  onSortingChange={onSortingChange}
                />
              </th>

              <th className="px-4 py-3">
                <SortButton
                  column="role"
                  label="Role"
                  sorting={sorting}
                  onSortingChange={onSortingChange}
                />
              </th>

              <th className="px-4 py-3">
                <SortButton
                  column="status"
                  label="Status"
                  sorting={sorting}
                  onSortingChange={onSortingChange}
                />
              </th>

              <th className="px-4 py-3">
                <SortButton
                  column="joinDate"
                  label="Joined"
                  sorting={sorting}
                  onSortingChange={onSortingChange}
                />
              </th>

              <th className="px-4 py-3">
                <SortButton
                  column="lastActivityAt"
                  label="Last activity"
                  sorting={sorting}
                  onSortingChange={onSortingChange}
                />
              </th>

              <th className="w-[184px] px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <LoadingRows />
            ) : (
              users.map((user) => {
                const providerMeta = getProviderMeta(user.provider);
                const verificationMeta = getVerificationMeta(
                  user.isEmailVerified
                );
                const riskMeta = getRiskMeta(user.reportCount);
                const isSelectable = selectableIds.has(user.id);
                const isSelected = selectedIds.has(user.id);

                return (
                  <tr
                    key={user.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenUser(user)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onOpenUser(user);
                      }
                    }}
                    className={`border-t align-top transition cursor-pointer ${
                      highlightId === user.id
                        ? "bg-amber-50/70"
                        : "hover:bg-slate-50/70"
                    }`}
                  >
                    <td
                      className="px-4 py-4 align-middle"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelect(user.id)}
                        disabled={!isSelectable}
                        aria-label={`Select ${user.name}`}
                      />
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 border">
                          <AvatarImage
                            src={user.avatar || undefined}
                            alt={user.name}
                            referrerPolicy="no-referrer"
                          />
                          <AvatarFallback>
                            {user.name?.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <div className="font-medium text-slate-900">
                            {user.name}
                          </div>

                          <div className="truncate text-slate-500">
                            {user.email || "—"}
                          </div>

                          <div className="mt-1.5 flex flex-wrap gap-2">
                            <Badge
                              variant="secondary"
                              className={`border ${providerMeta.className}`}
                            >
                              {providerMeta.label}
                            </Badge>

                            <Badge
                              variant="secondary"
                              className={`border ${verificationMeta.className}`}
                            >
                              {verificationMeta.label}
                            </Badge>

                            {user.reportCount != null ? (
                              <Badge
                                variant="secondary"
                                className={`border ${riskMeta.className}`}
                              >
                                {riskMeta.label}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <Badge
                        variant="secondary"
                        className={`inline-flex items-center gap-1 border ${getRoleColor(
                          user.role
                        )}`}
                      >
                        {getRoleIcon(user.role)}
                        {formatRoleLabel(user.role)}
                      </Badge>
                    </td>

                    <td className="px-4 py-4">
                      <Badge
                        variant="secondary"
                        className={`inline-flex items-center gap-1 border ${getStatusColor(
                          user.status
                        )}`}
                      >
                        {getStatusIcon(user.status)}
                        {user.status}
                      </Badge>
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {formatDisplayDate(user.joinDate)}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {user.lastActivityAt || user.lastLoginAt
                        ? formatDisplayDate(
                            user.lastActivityAt || user.lastLoginAt || ""
                          )
                        : "No activity data"}
                    </td>

                    <td className="px-4 py-4 align-middle">
                      <div className="mx-auto grid w-[164px] grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 w-full rounded-xl border-sky-200 bg-sky-50 text-sky-700 shadow-none hover:border-sky-300 hover:bg-sky-100 hover:text-sky-800"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEditUser(user);
                          }}
                        >
                          <Edit3 className="h-4 w-4" />
                          Edit
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 w-full rounded-xl border-amber-200 bg-amber-50 text-amber-700 shadow-none hover:border-amber-300 hover:bg-amber-100 hover:text-amber-800 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenNotifications(user);
                          }}
                          disabled={!user.email}
                          title={
                            user.email
                              ? "Send notification"
                              : "This user does not have an email"
                          }
                        >
                          {user.email ? (
                            <BellRing className="h-4 w-4" />
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                          Notify
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
