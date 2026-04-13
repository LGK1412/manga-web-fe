"use client";

import {
  Ban,
  Clock3,
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
  ADMIN_ROLE_ASSIGNMENT_VALUES,
  ROLE_OPTIONS,
  type ConfirmActionType,
  type UserRow,
  type UserStatus,
} from "./user-management.types";
import {
  formatDisplayDate,
  formatRoleLabel,
  getProviderMeta,
  getRoleColor,
  getRoleIcon,
  getRiskMeta,
  getStatusColor,
  getStatusIcon,
  getVerificationMeta,
} from "./user-management.utils";

type EditUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUser: UserRow | null;
  actorRole: string;

  draftRole: string;
  draftStaffStatus: UserStatus;

  resetReason: string;
  banReason: string;
  muteReason: string;

  isSubmitting: boolean;
  activeConfirmAction: ConfirmActionType | null;

  onDraftRoleChange: (value: string) => void;
  onDraftStaffStatusChange: (value: UserStatus) => void;

  onResetReasonChange: (value: string) => void;
  onBanReasonChange: (value: string) => void;
  onMuteReasonChange: (value: string) => void;

  onRequestRoleUpdate: () => void;
  onRequestStaffStatusUpdate: () => void;
  onRequestResetToNormal: () => void;
  onRequestBan: () => void;
  onRequestMute: () => void;
};

function formatDateTime(value?: string | null) {
  if (!value) return "No data";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No data";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function InfoTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

function ReasonTextarea({
  id,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={4}
      className="flex min-h-[110px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}

function RoleName({ role }: { role: string }) {
  return <span className="font-semibold text-slate-900">{formatRoleLabel(role)}</span>;
}

export function EditUserDialog({
  open,
  onOpenChange,
  selectedUser,
  actorRole,
  draftRole,
  draftStaffStatus,
  resetReason,
  banReason,
  muteReason,
  isSubmitting,
  activeConfirmAction,
  onDraftRoleChange,
  onDraftStaffStatusChange,
  onResetReasonChange,
  onBanReasonChange,
  onMuteReasonChange,
  onRequestRoleUpdate,
  onRequestStaffStatusUpdate,
  onRequestResetToNormal,
  onRequestBan,
  onRequestMute,
}: EditUserDialogProps) {
  const isAdmin = actorRole === "admin";
  const isContentMod = actorRole === "content_moderator";
  const isCommunityManager = actorRole === "community_manager";
  const canAdminChangeRole =
    isAdmin &&
    !!selectedUser &&
    ADMIN_ROLE_ASSIGNMENT_VALUES.includes(
      selectedUser.role as (typeof ADMIN_ROLE_ASSIGNMENT_VALUES)[number]
    );
  const roleOptions = canAdminChangeRole
    ? ROLE_OPTIONS.filter((role) =>
        ADMIN_ROLE_ASSIGNMENT_VALUES.includes(
          role.value as (typeof ADMIN_ROLE_ASSIGNMENT_VALUES)[number]
        )
      )
    : ROLE_OPTIONS.filter((role) => role.value === selectedUser?.role);

  const isTargetUserOrAuthor =
    selectedUser?.role === "user" || selectedUser?.role === "author";

  const canAdminEditStaffStatus =
    isAdmin &&
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

  const canCommunityMute =
    isCommunityManager &&
    !!selectedUser &&
    isTargetUserOrAuthor &&
    selectedUser.status === "Normal";

  if (!selectedUser) {
    return null;
  }

  const providerMeta = getProviderMeta(selectedUser.provider);
  const verificationMeta = getVerificationMeta(selectedUser.isEmailVerified);
  const riskMeta = getRiskMeta(selectedUser.reportCount);
  const activityTimestamp =
    selectedUser.lastActivityAt || selectedUser.lastLoginAt;
  const moderationScopeCopy = isAdmin ? (
    <>
      <RoleName role="admin" /> can change roles, manage staff status, and
      reset moderated User/Author accounts.
    </>
  ) : isContentMod ? (
    <>
      <RoleName role="content_moderator" /> can ban User/Author accounts that
      are currently Normal.
    </>
  ) : isCommunityManager ? (
    <>
      <RoleName role="community_manager" /> can mute User/Author accounts that
      are currently Normal.
    </>
  ) : (
    "Only actions allowed for your role are enabled."
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[960px]">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>
            Review account context and moderation history before taking action.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section className="rounded-xl border bg-slate-50/60 p-4">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-900">1. Account Overview</h3>
              <p className="text-sm text-slate-600">
                Core identity, trust signals, and current access state.
              </p>
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <Avatar className="h-16 w-16 border">
                <AvatarImage
                  src={selectedUser.avatar || undefined}
                  alt={selectedUser.name}
                  referrerPolicy="no-referrer"
                />
                <AvatarFallback>
                  {selectedUser.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-lg font-semibold text-slate-900">
                  {selectedUser.name}
                </div>
                <div className="truncate text-sm text-slate-600">
                  {selectedUser.email || "—"}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge
                    variant="secondary"
                    className={`inline-flex items-center gap-1 border ${getRoleColor(
                      selectedUser.role
                    )}`}
                  >
                    {getRoleIcon(selectedUser.role)}
                    <span className="font-bold">
                      {formatRoleLabel(selectedUser.role)}
                    </span>
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

                  <Badge
                    variant="secondary"
                    className={`inline-flex items-center border ${providerMeta.className}`}
                  >
                    {providerMeta.label}
                  </Badge>

                  <Badge
                    variant="secondary"
                    className={`inline-flex items-center border ${verificationMeta.className}`}
                  >
                    {verificationMeta.label}
                  </Badge>

                  {selectedUser.reportCount != null ? (
                    <Badge
                      variant="secondary"
                      className={`inline-flex items-center border ${riskMeta.className}`}
                    >
                      {riskMeta.label}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <InfoTile
                label="Joined"
                value={formatDisplayDate(selectedUser.joinDate)}
              />
              <InfoTile
                label="Last activity"
                value={formatDateTime(activityTimestamp)}
                hint={activityTimestamp ? undefined : "No activity timestamp available"}
              />
              <InfoTile
                label="Email status"
                value={
                  selectedUser.isEmailVerified
                    ? "Email verified"
                    : "Email not verified"
                }
              />
              <InfoTile label="Provider" value={providerMeta.label} />
            </div>
          </section>

          <section className="rounded-xl border p-4">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-900">2. Role & Access</h3>
              <p className="text-sm text-slate-600">
                Update role or staff status only when it matches your permission.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {moderationScopeCopy}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border bg-slate-50/60 p-4">
                <div className="space-y-2">
                  <Label htmlFor="user-role">Role</Label>

                  <Select
                    value={draftRole}
                    onValueChange={onDraftRoleChange}
                    disabled={isSubmitting || !canAdminChangeRole}
                  >
                    <SelectTrigger id="user-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>

                    <SelectContent className="z-[90]">
                      {roleOptions.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <p className="text-xs text-slate-500">
                    Only <RoleName role="admin" /> can switch User and staff
                    accounts between User, Content Moderator, Community
                    Manager, and Financial Manager. Admin and Author roles are
                    locked.
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="mt-4 border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-800"
                  onClick={onRequestRoleUpdate}
                  disabled={
                    isSubmitting ||
                    !canAdminChangeRole ||
                    draftRole === selectedUser.role
                  }
                >
                  {activeConfirmAction === "change-role" && isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Update role"
                  )}
                </Button>
              </div>

              <div className="rounded-xl border bg-slate-50/60 p-4">
                <div className="space-y-2">
                  <Label htmlFor="staff-status">Staff status</Label>

                  <Select
                    value={draftStaffStatus}
                    onValueChange={(value) =>
                      onDraftStaffStatusChange(value as UserStatus)
                    }
                    disabled={isSubmitting || !canAdminEditStaffStatus}
                  >
                    <SelectTrigger id="staff-status">
                      <SelectValue placeholder="Select staff status" />
                    </SelectTrigger>

                    <SelectContent className="z-[90]">
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Muted">Muted</SelectItem>
                      <SelectItem value="Banned">Banned</SelectItem>
                    </SelectContent>
                  </Select>

                  <p className="text-xs text-slate-500">
                    <RoleName role="admin" /> can manage status for moderator
                    and manager accounts.
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="mt-4 border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 hover:bg-amber-100 hover:text-amber-900"
                  onClick={onRequestStaffStatusUpdate}
                  disabled={
                    isSubmitting ||
                    !canAdminEditStaffStatus ||
                    draftStaffStatus === selectedUser.status
                  }
                >
                  {activeConfirmAction === "change-staff-status" &&
                  isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Update staff status"
                  )}
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-xl border p-4">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-900">
                3. Moderation Controls
              </h3>
              <p className="text-sm text-slate-600">
                High-impact actions require explicit intent and clear reasoning.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border bg-slate-50/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-900">
                  <RefreshCw className="h-4 w-4" />
                  <span className="font-medium">Reset to Normal</span>
                </div>

                <p className="mb-3 text-sm text-slate-600">
                  Restore a muted or banned user/author back to normal status.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="reset-reason">Reset reason</Label>
                  <Input
                    id="reset-reason"
                    value={resetReason}
                    onChange={(event) => onResetReasonChange(event.target.value)}
                    placeholder="Optional internal note"
                    disabled={isSubmitting}
                  />
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Optional. This note can still appear in moderation history.
                </p>

                <Button
                  variant="outline"
                  className="mt-4 w-full border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800"
                  onClick={onRequestResetToNormal}
                  disabled={!canAdminResetUserAuthor || isSubmitting}
                >
                  {activeConfirmAction === "reset-user-author" && isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Reset status"
                  )}
                </Button>

                {!canAdminResetUserAuthor ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Only <RoleName role="admin" /> can reset User/Author
                    accounts that are not currently Normal.
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border bg-slate-50/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-900">
                  <Ban className="h-4 w-4" />
                  <span className="font-medium">Ban user</span>
                </div>

                <p className="mb-3 text-sm text-slate-600">
                  Block the account entirely. Use for severe abuse or repeated
                  violations.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="ban-reason">Ban reason</Label>
                  <ReasonTextarea
                    id="ban-reason"
                    value={banReason}
                    onChange={onBanReasonChange}
                    placeholder="Required. Explain why this account is being banned."
                    disabled={isSubmitting}
                  />
                </div>

                <Button
                  className="mt-4 w-full bg-red-600 text-white shadow-sm hover:bg-red-700"
                  onClick={onRequestBan}
                  disabled={!canContentBan || isSubmitting || !banReason.trim()}
                >
                  {activeConfirmAction === "ban-user-author" && isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Ban account
                    </>
                  )}
                </Button>

                {!canContentBan ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Only <RoleName role="content_moderator" /> can ban
                    User/Author accounts that are currently Normal.
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border bg-slate-50/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-slate-900">
                  <VolumeX className="h-4 w-4" />
                  <span className="font-medium">Mute user</span>
                </div>

                <p className="mb-3 text-sm text-slate-600">
                  Restrict participation without fully banning the account.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="mute-reason">Mute reason</Label>
                  <ReasonTextarea
                    id="mute-reason"
                    value={muteReason}
                    onChange={onMuteReasonChange}
                    placeholder="Required. Explain why this account is being muted."
                    disabled={isSubmitting}
                  />
                </div>

                <Button
                  className="mt-4 w-full bg-amber-500 text-white shadow-sm hover:bg-amber-600"
                  onClick={onRequestMute}
                  disabled={
                    !canCommunityMute || isSubmitting || !muteReason.trim()
                  }
                >
                  {activeConfirmAction === "mute-user-author" && isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Clock3 className="mr-2 h-4 w-4" />
                      Mute account
                    </>
                  )}
                </Button>

                {!canCommunityMute ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Only <RoleName role="community_manager" /> can mute
                    User/Author accounts that are currently Normal.
                  </p>
                ) : null}
              </div>
            </div>
          </section>

        </div>
      </DialogContent>
    </Dialog>
  );
}
