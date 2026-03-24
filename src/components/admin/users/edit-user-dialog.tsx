import {
  AlertTriangle,
  Ban,
  Bell,
  Loader2,
  RefreshCw,
  Shield,
  VolumeX,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  type ConfirmActionType,
  ROLE_OPTIONS,
  type UserRow,
  type UserStatus,
} from "./user-management.types";
import {
  formatDisplayDate,
  formatRoleLabel,
  getRoleColor,
  getRoleIcon,
  getStatusColor,
  getStatusIcon,
} from "./user-management.utils";

type EditUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUser: UserRow | null;
  actorRole: string;
  draftRole: string;
  draftStaffStatus: UserStatus;
  resetReason: string;
  moderationReason: string;
  isSubmitting: boolean;
  activeConfirmAction: ConfirmActionType | null;
  onDraftRoleChange: (value: string) => void;
  onDraftStaffStatusChange: (value: UserStatus) => void;
  onResetReasonChange: (value: string) => void;
  onModerationReasonChange: (value: string) => void;
  onRequestRoleUpdate: () => void;
  onRequestStaffStatusUpdate: () => void;
  onRequestResetToNormal: () => void;
  onRequestBan: () => void;
  onRequestMute: () => void;
};

export function EditUserDialog({
  open,
  onOpenChange,
  selectedUser,
  actorRole,
  draftRole,
  draftStaffStatus,
  resetReason,
  moderationReason,
  isSubmitting,
  activeConfirmAction,
  onDraftRoleChange,
  onDraftStaffStatusChange,
  onResetReasonChange,
  onModerationReasonChange,
  onRequestRoleUpdate,
  onRequestStaffStatusUpdate,
  onRequestResetToNormal,
  onRequestBan,
  onRequestMute,
}: EditUserDialogProps) {
  const isAdmin = actorRole === "admin";
  const isContentMod = actorRole === "content_moderator";
  const isCommu = actorRole === "community_manager";
  const isReadOnlyActor =
    !isAdmin && !isContentMod && !isCommu && actorRole !== "";

  const isTargetUserOrAuthor =
    selectedUser?.role === "user" || selectedUser?.role === "author";

  const canAdminEditStaffStatus =
    !!selectedUser &&
    ["content_moderator", "community_manager", "financial_manager"].includes(
      selectedUser.role
    );

  const canAdminResetUserAuthor =
    isAdmin &&
    !!selectedUser &&
    isTargetUserOrAuthor &&
    selectedUser.status !== "Normal";

  const canContentBan =
    isContentMod &&
    !!selectedUser &&
    isTargetUserOrAuthor &&
    selectedUser.status === "Normal";

  const canCommuMute =
    isCommu &&
    !!selectedUser &&
    isTargetUserOrAuthor &&
    selectedUser.status === "Normal";

  if (!selectedUser) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-[820px]">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>
            The panel is split into user info, access controls, and moderation
            actions to reduce cognitive load.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section className="rounded-xl border bg-slate-50/60 p-4">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-900">1. User Info</h3>
              <p className="text-sm text-slate-600">
                Review the user profile before taking any action.
              </p>
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <Avatar className="h-16 w-16">
                <AvatarImage src={selectedUser.avatar || "/placeholder.svg"} />
                <AvatarFallback>{selectedUser.name.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-lg font-semibold text-slate-900">
                  {selectedUser.name}
                </div>
                <div className="truncate text-sm text-slate-600">
                  {selectedUser.email || "—"}
                </div>
                <div className="text-xs text-slate-500">
                  Joined: {formatDisplayDate(selectedUser.joinDate)}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="secondary"
                  className={`inline-flex items-center gap-1 border ${getRoleColor(
                    selectedUser.role
                  )}`}
                >
                  {getRoleIcon(selectedUser.role)}
                  {formatRoleLabel(selectedUser.role)}
                </Badge>

                <Badge
                  variant="secondary"
                  className={`inline-flex items-center gap-1 border ${getStatusColor(
                    selectedUser.status
                  )}`}
                >
                  {getStatusIcon(selectedUser.status)}
                  {selectedUser.status}
                </Badge>
              </div>
            </div>
          </section>

          <section className="rounded-xl border p-4">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-900">
                2. Role & Access
              </h3>
              <p className="text-sm text-slate-600">
                Role changes are intentionally separated from moderation actions.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="space-y-2">
                <Label>Current Role</Label>

                {isAdmin ? (
                  <>
                    <Select value={draftRole} onValueChange={onDraftRoleChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>

                      <SelectContent>
                        {ROLE_OPTIONS.map((role) => {
                          const disabled =
                            selectedUser.role === "author" &&
                            role.value === "user";

                          return (
                            <SelectItem
                              key={role.value}
                              value={role.value}
                              disabled={disabled}
                            >
                              {role.label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-600">
                      <div className="font-medium text-slate-900">Admin can</div>
                      <ul className="mt-1 list-disc space-y-1 pl-5">
                        <li>Change user roles.</li>
                        <li>
                          Keep the current rule that prevents downgrading Author
                          back to User.
                        </li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-600">
                    <div className="font-medium text-slate-900">Read-only</div>
                    <p className="mt-1">Only Admin can change roles.</p>
                  </div>
                )}
              </div>

              {isAdmin && (
                <Button
                  onClick={onRequestRoleUpdate}
                  disabled={
                    isSubmitting ||
                    draftRole === selectedUser.role ||
                    (selectedUser.role === "author" && draftRole === "user")
                  }
                >
                  {isSubmitting && activeConfirmAction === "change-role" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="mr-2 h-4 w-4" />
                  )}
                  Apply Role
                </Button>
              )}
            </div>
          </section>

          <section className="rounded-xl border p-4">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-900">
                3. Moderation Actions
              </h3>
              <p className="text-sm text-slate-600">
                Only relevant actions are shown for the current actor role.
              </p>
            </div>

            {!actorRole && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Unable to resolve the logged-in role from <code>/api/auth/me</code>.
              </div>
            )}

            {isAdmin && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-700">
                  <div className="font-medium text-slate-900">Admin rules</div>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    <li>
                      Can update staff status for Content Moderator, Community
                      Manager, and Financial Manager.
                    </li>
                    <li>Cannot directly ban or mute User/Author accounts.</li>
                    <li>Can reset processed User/Author accounts back to Normal.</li>
                  </ul>
                </div>

                {canAdminEditStaffStatus ? (
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                    <div className="space-y-2">
                      <Label>Staff Status</Label>
                      <Select
                        value={draftStaffStatus}
                        onValueChange={(value) =>
                          onDraftStaffStatusChange(value as UserStatus)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="Normal">Normal</SelectItem>
                          <SelectItem value="Muted">Muted</SelectItem>
                          <SelectItem value="Banned">Banned</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      variant="destructive"
                      onClick={onRequestStaffStatusUpdate}
                      disabled={
                        isSubmitting ||
                        draftStaffStatus === selectedUser.status
                      }
                    >
                      {isSubmitting &&
                      activeConfirmAction === "change-staff-status" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Shield className="mr-2 h-4 w-4" />
                      )}
                      Update Status
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-600">
                    This account does not qualify for the admin staff-moderation flow.
                  </div>
                )}

                {canAdminResetUserAuthor && (
                  <div className="rounded-xl border border-red-200 bg-red-50/40 p-4">
                    <div className="mb-3">
                      <div className="font-medium text-slate-900">
                        Reset User/Author to Normal
                      </div>
                      <p className="text-sm text-slate-600">
                        Use this when a processed User/Author account should be restored.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Reason (optional)</Label>
                      <Input
                        value={resetReason}
                        onChange={(e) => onResetReasonChange(e.target.value)}
                        placeholder="Example: reviewed and approved for restoration..."
                      />
                    </div>

                    <Button
                      className="mt-4"
                      variant="destructive"
                      onClick={onRequestResetToNormal}
                      disabled={isSubmitting}
                    >
                      {isSubmitting &&
                      activeConfirmAction === "reset-user-author" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Reset to Normal
                    </Button>
                  </div>
                )}
              </div>
            )}

            {isContentMod && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-700">
                  <div className="font-medium text-slate-900">
                    Content Moderator rules
                  </div>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    <li>Can ban User/Author accounts.</li>
                    <li>Cannot change roles.</li>
                    <li>Cannot reset accounts back to Normal.</li>
                  </ul>
                </div>

                {!isTargetUserOrAuthor ? (
                  <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-600">
                    This account is not a User/Author target, so the content-ban flow is unavailable.
                  </div>
                ) : selectedUser.status !== "Normal" ? (
                  <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-600">
                    This account is already <strong>{selectedUser.status}</strong>.
                    Only Admin can reset it to Normal.
                  </div>
                ) : (
                  <div className="rounded-xl border border-red-200 bg-red-50/40 p-4">
                    <div className="mb-3">
                      <div className="font-medium text-slate-900">
                        Ban User/Author
                      </div>
                      <p className="text-sm text-slate-600">
                        Use this for content-related policy violations.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Reason (optional)</Label>
                      <Input
                        value={moderationReason}
                        onChange={(e) =>
                          onModerationReasonChange(e.target.value)
                        }
                        placeholder="Example: repeated content policy violations..."
                      />
                    </div>

                    <Button
                      className="mt-4"
                      variant="destructive"
                      onClick={onRequestBan}
                      disabled={isSubmitting || !canContentBan}
                    >
                      {isSubmitting &&
                      activeConfirmAction === "ban-user-author" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Ban className="mr-2 h-4 w-4" />
                      )}
                      Ban User
                    </Button>
                  </div>
                )}
              </div>
            )}

            {isCommu && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-700">
                  <div className="font-medium text-slate-900">
                    Community Manager rules
                  </div>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    <li>Can mute User/Author accounts.</li>
                    <li>Cannot change roles.</li>
                    <li>Cannot reset accounts back to Normal.</li>
                  </ul>
                </div>

                {!isTargetUserOrAuthor ? (
                  <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-600">
                    This account is not a User/Author target, so the mute flow is unavailable.
                  </div>
                ) : selectedUser.status !== "Normal" ? (
                  <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-600">
                    This account is already <strong>{selectedUser.status}</strong>.
                    Only Admin can reset it to Normal.
                  </div>
                ) : (
                  <div className="rounded-xl border border-yellow-200 bg-yellow-50/50 p-4">
                    <div className="mb-3">
                      <div className="font-medium text-slate-900">
                        Mute User/Author
                      </div>
                      <p className="text-sm text-slate-600">
                        Use this for community and interaction violations.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Reason (optional)</Label>
                      <Input
                        value={moderationReason}
                        onChange={(e) =>
                          onModerationReasonChange(e.target.value)
                        }
                        placeholder="Example: spam, harassment, or abusive behavior..."
                      />
                    </div>

                    <Button
                      className="mt-4"
                      onClick={onRequestMute}
                      disabled={isSubmitting || !canCommuMute}
                    >
                      {isSubmitting &&
                      activeConfirmAction === "mute-user-author" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <VolumeX className="mr-2 h-4 w-4" />
                      )}
                      Mute User
                    </Button>
                  </div>
                )}
              </div>
            )}

            {isReadOnlyActor && (
              <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-600">
                Your current role is view-only. No moderation actions are available.
              </div>
            )}
          </section>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}