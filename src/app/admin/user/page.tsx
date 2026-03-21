"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import {
  FilterX,
  Loader2,
  RefreshCw,
  Search,
  TriangleAlert,
  Users,
} from "lucide-react";
import type { SortingState } from "@tanstack/react-table";

import AdminLayout from "../adminLayout/page";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";

import { EditUserDialog } from "@/components/admin/users/edit-user-dialog";
import { UserManagementFilters } from "@/components/admin/users/user-management-filters";
import { UserManagementStats } from "@/components/admin/users/user-management-stats";
import { UserManagementTable } from "@/components/admin/users/user-management-table";
import {
  type ConfirmActionType,
  type UserRow,
  type UserStatus,
} from "@/components/admin/users/user-management.types";
import {
  formatRoleLabel,
  logAxiosError,
  toBackendStatus,
  toUiStatus,
} from "@/components/admin/users/user-management.utils";

export default function UserManagementPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [actorRole, setActorRole] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [sorting, setSorting] = useState<SortingState>([
    { id: "role", desc: false },
  ]);

  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [draftRole, setDraftRole] = useState("");
  const [draftStaffStatus, setDraftStaffStatus] =
    useState<UserStatus>("Normal");
  const [resetReason, setResetReason] = useState("");
  const [moderationReason, setModerationReason] = useState("");

  const [confirmAction, setConfirmAction] = useState<ConfirmActionType | null>(
    null
  );
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setFilterRole("all");
    setFilterStatus("all");
  }, []);

  const isFilterDirty =
    searchTerm.trim().length > 0 ||
    filterRole !== "all" ||
    filterStatus !== "all";

  const activeFilterChips = useMemo(() => {
    const chips: string[] = [];

    if (searchTerm.trim()) {
      chips.push(`Search: "${searchTerm.trim()}"`);
    }

    if (filterRole !== "all") {
      chips.push(`Role: ${formatRoleLabel(filterRole)}`);
    }

    if (filterStatus !== "all") {
      chips.push(`Status: ${filterStatus}`);
    }

    return chips;
  }, [searchTerm, filterRole, filterStatus]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const query = searchTerm.trim().toLowerCase();

      const matchesSearch =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query);

      const matchesRole = filterRole === "all" || user.role === filterRole;
      const matchesStatus =
        filterStatus === "all" || user.status === filterStatus;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, filterRole, filterStatus]);

  const loadPage = useCallback(async () => {
    if (!API_URL) {
      setLoadError("Missing NEXT_PUBLIC_API_URL.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    const meEndpoint = `${API_URL}/api/auth/me`;
    const usersEndpoint = `${API_URL}/api/user/all`;

    try {
      const [meResult, usersResult] = await Promise.allSettled([
        axios.get(meEndpoint, { withCredentials: true }),
        axios.get(usersEndpoint, { withCredentials: true }),
      ]);

      if (meResult.status === "fulfilled") {
        const role =
          meResult.value.data?.role || meResult.value.data?.user?.role;
        setActorRole(String(role || ""));
      } else {
        console.warn(
          "[Fetch Me] failed",
          meResult.reason?.response?.data || meResult.reason?.message
        );
        setActorRole("");
      }

      if (usersResult.status === "rejected") {
        logAxiosError("[Fetch Users]", usersEndpoint, usersResult.reason);
        const message = usersResult.reason?.response?.data?.message;

        throw new Error(
          Array.isArray(message)
            ? message.join(", ")
            : message ?? "Unable to load users."
        );
      }

      const mappedUsers: UserRow[] = (usersResult.value.data || []).map(
        (user: any) => ({
          id: user._id,
          name: user.username || "Unknown user",
          email: user.email || "",
          role: user.role || "user",
          status: toUiStatus(user.status),
          joinDate: user.createdAt
            ? new Date(user.createdAt).toISOString().split("T")[0]
            : "",
          avatar: user.avatar
            ? user.avatar.startsWith("http")
              ? user.avatar
              : `${API_URL}/uploads/${user.avatar}`
            : "/placeholder.svg?height=40&width=40",
        })
      );

      setUsers(mappedUsers);
    } catch (error: any) {
      const message = error?.message ?? "Unable to load data.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const updateUserState = useCallback(
    (userId: string, patch: Partial<UserRow>) => {
      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, ...patch } : user))
      );

      setSelectedUser((prev) =>
        prev && prev.id === userId ? { ...prev, ...patch } : prev
      );
    },
    []
  );

  const handleOpenEdit = useCallback((user: UserRow) => {
    setSelectedUser(user);
    setDraftRole(user.role);
    setDraftStaffStatus(user.status);
    setResetReason("");
    setModerationReason("");
    setConfirmAction(null);
    setIsEditDialogOpen(true);
  }, []);

  const handleDialogOpenChange = (open: boolean) => {
    if (isSubmittingAction) return;

    setIsEditDialogOpen(open);

    if (!open) {
      setSelectedUser(null);
      setConfirmAction(null);
      setResetReason("");
      setModerationReason("");
    }
  };

  const handleOpenNotifications = useCallback(
  (user: UserRow) => {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }

    if (!user.email) {
      toast.error("This user does not have an email.");
      return;
    }

    const displayName = user.name || user.email || "User";

    const prefillTitle = `[Account Notice] ${displayName}`;
    const prefillBody = `Hello ${displayName},

This is a notification from the administration team.

[Write your message here]

Best regards,
Manga Platform Team`;

    const params = new URLSearchParams({
      receiverId: user.id,
      receiverEmail: user.email,
      title: prefillTitle,
      body: prefillBody,
    });

    const href = `/admin/notifications/send-general?${params.toString()}`;

    setHighlightId(user.id);

    highlightTimerRef.current = setTimeout(() => {
      router.push(href);
    }, 350);
  },
  [router]
);

  const requestRoleUpdate = () => {
    if (!selectedUser || draftRole === selectedUser.role) return;

    if (selectedUser.role === "author" && draftRole === "user") {
      toast.error("The current rule does not allow downgrading Author to User.");
      return;
    }

    setConfirmAction("change-role");
  };

  const requestStaffStatusUpdate = () => {
    if (!selectedUser || draftStaffStatus === selectedUser.status) return;
    setConfirmAction("change-staff-status");
  };

  const requestResetToNormal = () => {
    if (!selectedUser) return;
    setConfirmAction("reset-user-author");
  };

  const requestBanUser = () => {
    if (!selectedUser) return;
    setConfirmAction("ban-user-author");
  };

  const requestMuteUser = () => {
    if (!selectedUser) return;
    setConfirmAction("mute-user-author");
  };

  const confirmCopy = useMemo(() => {
    if (!selectedUser || !confirmAction) {
      return {
        title: "Confirm action",
        description: "Are you sure you want to continue?",
        actionLabel: "Confirm",
        destructive: false,
      };
    }

    switch (confirmAction) {
      case "change-role":
        return {
          title: "Confirm role change",
          description: `You are about to change ${selectedUser.name} from ${formatRoleLabel(
            selectedUser.role
          )} to ${formatRoleLabel(draftRole)}.`,
          actionLabel: "Change role",
          destructive: true,
        };

      case "change-staff-status":
        return {
          title: "Confirm staff status change",
          description: `You are about to change ${selectedUser.name} from ${selectedUser.status} to ${draftStaffStatus}.`,
          actionLabel: "Update status",
          destructive: true,
        };

      case "reset-user-author":
        return {
          title: "Confirm reset to Normal",
          description: `You are about to restore ${selectedUser.name} to Normal.`,
          actionLabel: "Reset to Normal",
          destructive: true,
        };

      case "ban-user-author":
        return {
          title: "Confirm ban",
          description: `You are about to ban ${selectedUser.name}.`,
          actionLabel: "Ban user",
          destructive: true,
        };

      case "mute-user-author":
        return {
          title: "Confirm mute",
          description: `You are about to mute ${selectedUser.name}.`,
          actionLabel: "Mute user",
          destructive: true,
        };

      default:
        return {
          title: "Confirm action",
          description: "Are you sure you want to continue?",
          actionLabel: "Confirm",
          destructive: false,
        };
    }
  }, [confirmAction, draftRole, draftStaffStatus, selectedUser]);

  const executeConfirmedAction = async () => {
    if (!selectedUser || !API_URL || !confirmAction) return;

    setIsSubmittingAction(true);

    try {
      switch (confirmAction) {
        case "change-role": {
          const endpoint = `${API_URL}/api/user/admin/set-role`;
          const payload = { userId: selectedUser.id, role: draftRole };

          await axios.patch(endpoint, payload, { withCredentials: true });
          updateUserState(selectedUser.id, { role: draftRole });
          toast.success("Role updated successfully.");
          break;
        }

        case "change-staff-status": {
          const endpoint = `${API_URL}/api/user/update-status`;
          const payload = {
            userId: selectedUser.id,
            status: toBackendStatus(draftStaffStatus),
          };

          await axios.post(endpoint, payload, { withCredentials: true });
          updateUserState(selectedUser.id, { status: draftStaffStatus });
          toast.success("Staff status updated successfully.");
          break;
        }

        case "reset-user-author": {
          const endpoint = `${API_URL}/api/user/admin/reset-user-status`;
          const payload = {
            userId: selectedUser.id,
            reason: resetReason.trim() || undefined,
          };

          await axios.patch(endpoint, payload, { withCredentials: true });
          updateUserState(selectedUser.id, { status: "Normal" });
          setDraftStaffStatus("Normal");
          setResetReason("");
          toast.success("User restored to Normal.");
          break;
        }

        case "ban-user-author": {
          const endpoint = `${API_URL}/api/user/moderation/ban`;
          const payload = {
            userId: selectedUser.id,
            reason: moderationReason.trim() || undefined,
          };

          await axios.patch(endpoint, payload, { withCredentials: true });
          updateUserState(selectedUser.id, { status: "Banned" });
          setDraftStaffStatus("Banned");
          setModerationReason("");
          toast.success("User banned successfully.");
          break;
        }

        case "mute-user-author": {
          const endpoint = `${API_URL}/api/user/moderation/mute`;
          const payload = {
            userId: selectedUser.id,
            reason: moderationReason.trim() || undefined,
          };

          await axios.patch(endpoint, payload, { withCredentials: true });
          updateUserState(selectedUser.id, { status: "Muted" });
          setDraftStaffStatus("Muted");
          setModerationReason("");
          toast.success("User muted successfully.");
          break;
        }

        default:
          break;
      }

      setConfirmAction(null);
    } catch (error: any) {
      let endpoint = "";

      switch (confirmAction) {
        case "change-role":
          endpoint = `${API_URL}/api/user/admin/set-role`;
          break;
        case "change-staff-status":
          endpoint = `${API_URL}/api/user/update-status`;
          break;
        case "reset-user-author":
          endpoint = `${API_URL}/api/user/admin/reset-user-status`;
          break;
        case "ban-user-author":
          endpoint = `${API_URL}/api/user/moderation/ban`;
          break;
        case "mute-user-author":
          endpoint = `${API_URL}/api/user/moderation/mute`;
          break;
      }

      logAxiosError("[User Action]", endpoint, error, { confirmAction });

      const message = error?.response?.data?.message;
      toast.error(
        Array.isArray(message)
          ? message.join(", ")
          : message ?? "Action failed."
      );
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              User Management
            </h1>
            <p className="mt-1 text-slate-600">
              A cleaner admin workspace with actionable stats, safer moderation
              flows, and better scanability.
            </p>
          </div>

          <div className="rounded-lg border bg-white px-3 py-2 text-sm text-slate-600">
            Signed in as:{" "}
            <span className="font-semibold text-slate-900">
              {actorRole ? formatRoleLabel(actorRole) : "Unknown"}
            </span>
          </div>
        </div>

        {loadError && !isLoading ? (
          <Card className="border-red-200 bg-red-50/60">
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex items-center gap-2 text-red-700">
                <TriangleAlert className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Unable to load data</h2>
              </div>

              <p className="text-sm text-red-700/90">{loadError}</p>

              <div className="flex flex-wrap gap-3">
                <Button onClick={loadPage}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setLoadError(null);
                    clearFilters();
                  }}
                >
                  Reset error state
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <UserManagementStats
              users={users}
              filterRole={filterRole}
              filterStatus={filterStatus}
              isLoading={isLoading}
              onSetRoleFilter={setFilterRole}
              onSetStatusFilter={setFilterStatus}
              onResetFilters={() => {
                setFilterRole("all");
                setFilterStatus("all");
              }}
            />

            <UserManagementFilters
              searchTerm={searchTerm}
              filterRole={filterRole}
              filterStatus={filterStatus}
              isLoading={isLoading}
              isDirty={isFilterDirty}
              totalCount={users.length}
              filteredCount={filteredUsers.length}
              activeFilterChips={activeFilterChips}
              onSearchChange={setSearchTerm}
              onRoleChange={setFilterRole}
              onStatusChange={setFilterStatus}
              onClearFilters={clearFilters}
              onReload={loadPage}
            />

            {!isLoading && users.length === 0 ? (
              <Card>
                <CardContent className="flex min-h-[280px] flex-col items-center justify-center text-center">
                  <Users className="mb-4 h-10 w-10 text-slate-400" />
                  <h3 className="text-lg font-semibold text-slate-900">
                    No users yet
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-slate-600">
                    When the system receives user data, the list will appear
                    here.
                  </p>
                </CardContent>
              </Card>
            ) : !isLoading && filteredUsers.length === 0 ? (
              <Card>
                <CardContent className="flex min-h-[280px] flex-col items-center justify-center rounded-md border border-dashed text-center">
                  <Search className="mb-4 h-10 w-10 text-slate-400" />
                  <h3 className="text-lg font-semibold text-slate-900">
                    No matching users
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-slate-600">
                    Try changing your search keyword or clearing the current
                    filters.
                  </p>

                  <Button className="mt-4" variant="outline" onClick={clearFilters}>
                    <FilterX className="mr-2 h-4 w-4" />
                    Clear filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <UserManagementTable
                users={filteredUsers}
                isLoading={isLoading}
                highlightId={highlightId}
                sorting={sorting}
                onSortingChange={setSorting}
                onEditUser={handleOpenEdit}
                onOpenNotifications={handleOpenNotifications}
              />
            )}
          </>
        )}

        <EditUserDialog
          open={isEditDialogOpen}
          onOpenChange={handleDialogOpenChange}
          selectedUser={selectedUser}
          actorRole={actorRole}
          draftRole={draftRole}
          draftStaffStatus={draftStaffStatus}
          resetReason={resetReason}
          moderationReason={moderationReason}
          isSubmitting={isSubmittingAction}
          activeConfirmAction={confirmAction}
          onDraftRoleChange={setDraftRole}
          onDraftStaffStatusChange={setDraftStaffStatus}
          onResetReasonChange={setResetReason}
          onModerationReasonChange={setModerationReason}
          onRequestRoleUpdate={requestRoleUpdate}
          onRequestStaffStatusUpdate={requestStaffStatusUpdate}
          onRequestResetToNormal={requestResetToNormal}
          onRequestBan={requestBanUser}
          onRequestMute={requestMuteUser}
        />

        <AlertDialog
          open={!!confirmAction}
          onOpenChange={(open) => {
            if (!isSubmittingAction) {
              setConfirmAction(open ? confirmAction : null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmCopy.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmCopy.description}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmittingAction}>
                Cancel
              </AlertDialogCancel>

              <AlertDialogAction
                disabled={isSubmittingAction}
                onClick={(event) => {
                  event.preventDefault();
                  executeConfirmedAction();
                }}
                className={
                  confirmCopy.destructive
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : ""
                }
              >
                {isSubmittingAction ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  confirmCopy.actionLabel
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}