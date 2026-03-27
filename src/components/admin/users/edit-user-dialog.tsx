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
  ROLE_OPTIONS,
  type ConfirmActionType,
  type UserRow,
  type UserStatus,
} from "./user-management.types";
import {
  formatDisplayDate,
  formatMetricValue,
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
  isHistoryLoading: boolean;
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

function humanizeHistoryAction(action?: string) {
  const normalized = String(action || "").trim().toLowerCase();

  switch (normalized) {
    case "banned":
    case "ban":
    case "ban_user":
      return "Banned user";
    case "muted":
    case "mute":
    case "mute_user":
      return "Muted user";
    case "reset":
    case "reset_to_normal":
    case "admin_reset_user_status":
      return "Reset to Normal";
    case "role_changed":
    case "admin_set_role":
      return "Changed role";
    case "staff_status_changed":
    case "admin_update_staff_status":
      return "Changed staff status";
    default:
      return action || "Recorded action";
  }
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
  isHistoryLoading,
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

  const latestModerationAction = selectedUser.lastModerationAction
    ? humanizeHistoryAction(selectedUser.lastModerationAction)
    : "No recorded action";

  const latestModerationReason =
    selectedUser.lastModerationReason || "No moderation note recorded";

  const moderationScopeCopy = isAdmin
    ? "Admin can change roles, manage staff status, and reset moderated User/Author accounts."
    : isContentMod
      ? "Content Moderator can ban User/Author accounts that are currently Normal."
      : isCommunityManager
        ? "Community Manager can mute User/Author accounts that are currently Normal."
        : "Only actions allowed for your role are enabled.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[960px]">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>
            Review account context, recent activity, and moderation history
            before taking action.
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

                  <Badge
                    variant="secondary"
                    className={`inline-flex items-center border ${riskMeta.className}`}
                  >
                    {riskMeta.label}
                  </Badge>
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
                hint={
                  activityTimestamp
                    ? "Most recent known account timestamp"
                    : "No activity timestamp available"
                }
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
              <h3 className="font-semibold text-slate-900">
                2. Activity & Moderation Context
              </h3>
              <p className="text-sm text-slate-600">
                Show only the signals currently supported by the API contract.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <InfoTile
                label="Risk status"
                value={riskMeta.label}
                hint={
                  selectedUser.reportCount == null
                    ? "Risk data is not available from the current API payload."
                    : `${selectedUser.reportCount} report signal(s) captured`
                }
              />
              <InfoTile
                label="Stories"
                value={formatMetricValue(selectedUser.storyCount)}
                hint={
                  selectedUser.storyCount == null
                    ? "No story count data available"
                    : "Published or created stories"
                }
              />
              <InfoTile
                label="Chapters"
                value={formatMetricValue(selectedUser.chapterCount)}
                hint={
                  selectedUser.chapterCount == null
                    ? "No chapter count data available"
                    : "Total content chapters"
                }
              />
              <InfoTile
                label="Latest moderation"
                value={latestModerationAction}
                hint={latestModerationReason}
              />
            </div>
          </section>

          <section className="rounded-xl border p-4">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-900">3. Role & Access</h3>
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
                    disabled={isSubmitting || actorRole !== "admin"}
                  >
                    <SelectTrigger id="user-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>

                    <SelectContent>
                      {ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <p className="text-xs text-slate-500">
                    Only Admin can change account role.
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={onRequestRoleUpdate}
                  disabled={
                    isSubmitting ||
                    actorRole !== "admin" ||
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

                    <SelectContent>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Muted">Muted</SelectItem>
                      <SelectItem value="Banned">Banned</SelectItem>
                    </SelectContent>
                  </Select>

                  <p className="text-xs text-slate-500">
                    Admin can manage status for moderator and manager accounts.
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="mt-4"
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
                4. Moderation Controls
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
                  className="mt-4 w-full"
                  variant="outline"
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
                    Only Admin can reset User/Author accounts that are not
                    currently Normal.
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

                <p className="mt-2 text-xs text-slate-500">
                  Required. Be specific and objective because this reason may be
                  logged in moderation history.
                </p>

                <Button
                  className="mt-4 w-full bg-red-600 text-white hover:bg-red-700"
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
                    Only Content Moderator can ban User/Author accounts that are
                    currently Normal.
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

                <p className="mt-2 text-xs text-slate-500">
                  Required. Keep the reason factual because it may appear in the
                  moderation record.
                </p>

                <Button
                  className="mt-4 w-full"
                  variant="secondary"
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
                    Only Community Manager can mute User/Author accounts that
                    are currently Normal.
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-xl border p-4">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-900">
                5. Moderation History
              </h3>
              <p className="text-sm text-slate-600">
                Recent moderator and admin actions related to this account.
              </p>
            </div>

            {isHistoryLoading ? (
              <div className="rounded-xl border border-dashed bg-slate-50/60 p-6 text-sm text-slate-500">
                Loading moderation history...
              </div>
            ) : selectedUser.moderationHistory?.length ? (
              <div className="space-y-3">
                {selectedUser.moderationHistory.map((entry) => (
                  <div key={entry.id} className="rounded-xl border bg-white p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="font-medium text-slate-900">
                          {humanizeHistoryAction(entry.action)}
                        </div>

                        <div className="mt-1 text-sm text-slate-600">
                          {entry.reason || "No reason recorded"}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                          {entry.actorName ? <span>By: {entry.actorName}</span> : null}
                          {entry.actorRole ? (
                            <span>
                              Role: {formatRoleLabel(entry.actorRole)}
                            </span>
                          ) : null}
                          {entry.statusAfter ? (
                            <span>Status after: {entry.statusAfter}</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="text-xs text-slate-500">
                        {formatDateTime(entry.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed bg-slate-50/60 p-6 text-sm text-slate-500">
                No moderation history data available.
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
