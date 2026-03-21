import { useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Bell,
  Edit,
  type LucideIcon,
} from "lucide-react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { UserRow } from "./user-management.types";
import {
  formatDisplayDate,
  formatRoleLabel,
  getRoleAccentHover,
  getRoleColor,
  getRoleIcon,
  getStatusColor,
  getStatusIcon,
  getStatusRowTone,
  rolePriority,
} from "./user-management.utils";

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-56 animate-pulse rounded bg-slate-100" />
      </CardHeader>

      <CardContent>
        <div className="overflow-hidden rounded-md border">
          <div className="grid grid-cols-6 gap-4 border-b bg-slate-50 p-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-4 animate-pulse rounded bg-slate-200" />
            ))}
          </div>

          {Array.from({ length: 6 }).map((_, rowIdx) => (
            <div
              key={rowIdx}
              className="grid grid-cols-6 gap-4 border-b p-4 last:border-b-0"
            >
              {Array.from({ length: 6 }).map((__, cellIdx) => (
                <div
                  key={cellIdx}
                  className="h-4 animate-pulse rounded bg-slate-100"
                />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

type UserManagementTableProps = {
  users: UserRow[];
  isLoading: boolean;
  highlightId: string | null;
  sorting: SortingState;
  onSortingChange: Dispatch<SetStateAction<SortingState>>;
  onEditUser: (user: UserRow) => void;
  onOpenNotifications: (user: UserRow) => void;
};

export function UserManagementTable({
  users,
  isLoading,
  highlightId,
  sorting,
  onSortingChange,
  onEditUser,
  onOpenNotifications,
}: UserManagementTableProps) {
  const columns = useMemo<ColumnDef<UserRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "User",
        cell: ({ row }) => {
          const user = row.original;

          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user.avatar || "/placeholder.svg"} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="truncate font-medium text-slate-900">
                  {user.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  Joined: {formatDisplayDate(user.joinDate)}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => {
          const email = row.original.email || "—";

          return (
            <span
              className="block max-w-[240px] truncate text-slate-600 group-hover:text-slate-900"
              title={email}
            >
              {email}
            </span>
          );
        },
      },
      {
        accessorKey: "role",
        header: ({ column }) => {
          const sorted = column.getIsSorted();

          return (
            <Button
              variant="ghost"
              className="h-auto px-0 font-semibold hover:bg-transparent"
              onClick={() => column.toggleSorting(sorted === "asc")}
            >
              Role
              {sorted === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : sorted === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          );
        },
        sortingFn: (rowA, rowB, columnId) => {
          const a = String(rowA.getValue(columnId));
          const b = String(rowB.getValue(columnId));
          return (rolePriority[a] ?? 999) - (rolePriority[b] ?? 999);
        },
        cell: ({ row }) => {
          const role = row.original.role;

          return (
            <Badge
              variant="secondary"
              className={`inline-flex items-center gap-1 border ${getRoleColor(role)}`}
            >
              {getRoleIcon(role)}
              <span>{formatRoleLabel(role)}</span>
            </Badge>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;

          return (
            <Badge
              variant="secondary"
              className={`inline-flex items-center gap-1 border ${getStatusColor(
                status
              )}`}
            >
              {getStatusIcon(status)}
              <span>{status}</span>
            </Badge>
          );
        },
      },
      {
        accessorKey: "joinDate",
        header: "Join Date",
        cell: ({ row }) => (
          <span className="text-slate-600">
            {formatDisplayDate(row.original.joinDate)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        enableSorting: false,
        cell: ({ row }) => {
          const user = row.original;

          return (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                title="Edit user"
                aria-label={`Edit ${user.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onEditUser(user);
                }}
              >
                <Edit className="mr-1.5 h-4 w-4" />
                Edit
              </Button>

              <Button
                variant="outline"
                size="sm"
                title="Open notifications"
                aria-label={`Open notifications for ${user.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenNotifications(user);
                }}
              >
                <Bell className="mr-1.5 h-4 w-4" />
                Notify
              </Button>
            </div>
          );
        },
      },
    ],
    [onEditUser, onOpenNotifications]
  );

  const table = useReactTable({
    data: users,
    columns,
    state: { sorting },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User List</CardTitle>
        <CardDescription>
          Click a row to open the user detail panel. Role sorting uses a custom
          priority order.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="overflow-hidden rounded-md border">
          <div className="max-h-[620px] overflow-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="bg-slate-50">
                    {headerGroup.headers.map((header, idx) => (
                      <TableHead
                        key={header.id}
                        className={[
                          "sticky top-0 z-10 bg-slate-50",
                          idx === headerGroup.headers.length - 1
                            ? "text-right"
                            : "",
                        ].join(" ")}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => {
                    const user = row.original;
                    const isHighlighted = highlightId === user.id;

                    const rowClass = [
                      "group cursor-pointer border-l-4 border-l-transparent transition-colors duration-150",
                      getStatusRowTone(user.status),
                      getRoleAccentHover(user.role),
                      "hover:bg-slate-50",
                      isHighlighted
                        ? "border-l-blue-500 bg-blue-50 shadow-sm"
                        : "",
                    ].join(" ");

                    return (
                      <TableRow
                        key={row.id}
                        className={rowClass}
                        onClick={() => onEditUser(user)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onEditUser(user);
                          }
                        }}
                        tabIndex={0}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}