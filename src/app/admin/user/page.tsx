"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { Search, Edit, Mail, User, Crown, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import AdminLayout from "../adminLayout/page";
import Link from "next/link";

/** ===== Role options (raw values from backend) ===== */
const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "author", label: "Author" },
  { value: "content_moderator", label: "Content Moderator" },
  { value: "community_manager", label: "Community Manager" },
  { value: "financial_manager", label: "Financial Manager" },
  { value: "admin", label: "Admin" },
] as const;

const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.value, r.label])
);

const formatRoleLabel = (role: string) => ROLE_LABEL[role] ?? role;

/** ===== Types (simple) ===== */
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Normal" | "Muted" | "Banned";
  joinDate: string;
  avatar: string;
};

/** ===== Helpers: Axios error logger ===== */
function logAxiosError(tag: string, endpoint: string, err: any, extra?: any) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  const message = err?.message;

  console.group(`${tag} ERROR FULL`);
  console.log("url:", endpoint);
  console.log("status:", status);
  console.log("data:", data);
  console.log("data (stringify):", JSON.stringify(data, null, 2));
  console.log("message:", message);

  if (!err?.response) {
    console.log("No response object -> maybe network/CORS/server down?");
    console.log("err.request:", err?.request);
  }

  if (extra) console.log("extra:", extra);
  console.groupEnd();
}

/** ✅ hover border color by role */
function hoverBorderByRole(role: string) {
  switch (role) {
    case "admin":
      return "hover:border-l-red-500";
    case "author":
      return "hover:border-l-blue-500";
    case "content_moderator":
      return "hover:border-l-purple-500";
    case "financial_manager":
      return "hover:border-l-emerald-500";
    case "community_manager":
      return "hover:border-l-amber-500";
    default:
      return "hover:border-l-slate-400";
  }
}

export default function UserManagement() {
  const router = useRouter();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // ✅ who am i
  const [actorRole, setActorRole] = useState<string>("");

  // ✅ reasons
  const [resetReason, setResetReason] = useState("");
  const [moderationReason, setModerationReason] = useState("");

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  /** ✅ highlight row when click sendmail */
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  /** ✅ highlight then navigate */
  const highlightThenNavigate = (userId: string, href: string) => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);

    setHighlightId(userId);

    highlightTimerRef.current = setTimeout(() => {
      router.push(href);
    }, 600);
  };

  const fetchMe = async () => {
    if (!API_URL) return;
    const endpoint = `${API_URL}/api/auth/me`;

    try {
      const res = await axios.get(endpoint, { withCredentials: true });
      const role = res.data?.role || res.data?.user?.role;
      setActorRole(String(role || ""));
      console.log("[Fetch Me] role =", role);
    } catch (err: any) {
      console.warn("[Fetch Me] failed", err?.response?.data || err?.message);
      setActorRole("");
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    const endpoint = `${API_URL}/api/user/all`;

    try {
      if (!API_URL) {
        toast.error("Missing NEXT_PUBLIC_API_URL");
        return;
      }

      console.log("[Fetch Users] REQUEST", { url: endpoint });
      const res = await axios.get(endpoint, { withCredentials: true });

      const mappedUsers: UserRow[] = (res.data || []).map((u: any) => ({
        id: u._id,
        name: u.username,
        email: u.email,
        role: u.role,
        status:
          u.status === "normal"
            ? "Normal"
            : u.status === "ban"
            ? "Banned"
            : "Muted",
        joinDate: new Date(u.createdAt).toISOString().split("T")[0],
        avatar: u.avatar
          ? `${API_URL}/uploads/${u.avatar}`
          : "/placeholder.svg?height=40&width=40",
      }));

      setUsers(mappedUsers);
    } catch (err: any) {
      logAxiosError("[Fetch Users]", endpoint, err);
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg ?? "Failed to load users");
    }
  };

  useEffect(() => {
    fetchMe();
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === "all" || user.role === filterRole;
      const matchesStatus = filterStatus === "all" || user.status === filterStatus;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, filterRole, filterStatus]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4" />;
      case "author":
        return <Edit className="h-4 w-4" />;
      case "content_moderator":
      case "financial_manager":
      case "community_manager":
        return <Shield className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "author":
        return "bg-blue-100 text-blue-800";
      case "content_moderator":
        return "bg-purple-100 text-purple-800";
      case "financial_manager":
        return "bg-emerald-100 text-emerald-800";
      case "community_manager":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Normal":
        return "bg-green-100 text-green-800";
      case "Banned":
        return "bg-red-100 text-red-800";
      case "Muted":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleEditUser = (user: UserRow) => {
    setSelectedUser(user);
    setResetReason("");
    setModerationReason("");
    setIsEditDialogOpen(true);
  };

  // ===== ADMIN: update staff status (content_moderator/community_manager) =====
  const handleUpdateUserStatus = async (newStatus: UserRow["status"]) => {
    if (!selectedUser || !API_URL) return;

    const endpoint = `${API_URL}/api/user/update-status`;

    try {
      let backendStatus = "normal";
      if (newStatus === "Banned") backendStatus = "ban";
      if (newStatus === "Muted") backendStatus = "mute";

      const payload = { userId: selectedUser.id, status: backendStatus };

      const res = await axios.post(endpoint, payload, { withCredentials: true });
      console.log("[Admin Update Staff Status] RESPONSE", res.data);

      toast.success("Status updated successfully");

      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, status: newStatus } : u))
      );
      setSelectedUser((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch (err: any) {
      logAxiosError("[Admin Update Staff Status]", endpoint, err);
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg ?? "Failed to update status");
    }
  };

  // ===== ADMIN: reset USER/AUTHOR to NORMAL =====
  const handleAdminResetUserStatus = async () => {
    if (!selectedUser || !API_URL) return;

    const endpoint = `${API_URL}/api/user/admin/reset-user-status`;

    try {
      const payload = { userId: selectedUser.id, reason: resetReason.trim() || undefined };
      const res = await axios.patch(endpoint, payload, { withCredentials: true });
      console.log("[Admin Reset] RESPONSE", res.data);

      toast.success("Reset to Normal");

      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, status: "Normal" } : u))
      );
      setSelectedUser((prev) => (prev ? { ...prev, status: "Normal" } : prev));
      setResetReason("");
    } catch (err: any) {
      logAxiosError("[Admin Reset]", endpoint, err);
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg ?? "Failed to reset status");
    }
  };

  // ===== ADMIN: set role =====
  const handleUpdateUserRole = async (newRole: string) => {
    if (!selectedUser || !API_URL) return;

    const endpoint = `${API_URL}/api/user/admin/set-role`;

    try {
      const payload = { userId: selectedUser.id, role: newRole };
      const res = await axios.patch(endpoint, payload, { withCredentials: true });
      console.log("[Admin Set Role] RESPONSE", res.data);

      toast.success("Role updated successfully");

      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, role: newRole } : u))
      );
      setSelectedUser((prev) => (prev ? { ...prev, role: newRole } : prev));
    } catch (err: any) {
      logAxiosError("[Admin Set Role]", endpoint, err);
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg ?? "Failed to update role");
    }
  };

  // ===== CONTENT MOD: BAN user/author =====
  const handleContentBan = async () => {
    if (!selectedUser || !API_URL) return;

    const endpoint = `${API_URL}/api/user/moderation/ban`;

    try {
      const payload = {
        userId: selectedUser.id,
        reason: moderationReason.trim() || undefined,
      };

      const res = await axios.patch(endpoint, payload, { withCredentials: true });
      console.log("[Content Ban] RESPONSE", res.data);

      toast.success("User banned");

      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, status: "Banned" } : u))
      );
      setSelectedUser((prev) => (prev ? { ...prev, status: "Banned" } : prev));
      setModerationReason("");
    } catch (err: any) {
      logAxiosError("[Content Ban]", endpoint, err);
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg ?? "Failed to ban user");
    }
  };

  // ===== COMMUNITY MANAGER: MUTE user/author =====
  const handleCommuMute = async () => {
    if (!selectedUser || !API_URL) return;

    const endpoint = `${API_URL}/api/user/moderation/mute`;

    try {
      const payload = {
        userId: selectedUser.id,
        reason: moderationReason.trim() || undefined,
      };

      const res = await axios.patch(endpoint, payload, { withCredentials: true });
      console.log("[Commu Mute] RESPONSE", res.data);

      toast.success("User muted");

      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, status: "Muted" } : u))
      );
      setSelectedUser((prev) => (prev ? { ...prev, status: "Muted" } : prev));
      setModerationReason("");
    } catch (err: any) {
      logAxiosError("[Commu Mute]", endpoint, err);
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(", ") : msg ?? "Failed to mute user");
    }
  };

  // ===== UI permissions =====
  const isAdmin = actorRole === "admin";
  const isContentMod = actorRole === "content_moderator";
  const isCommu = actorRole === "community_manager";

  const isTargetUserOrAuthor =
    selectedUser?.role === "user" || selectedUser?.role === "author";

  const canAdminEditStaffStatus =
    selectedUser?.role === "content_moderator" || selectedUser?.role === "community_manager";

  const canAdminResetUserAuthor =
    isAdmin && isTargetUserOrAuthor && selectedUser?.status !== "Normal";

  const canContentBan =
    isContentMod && isTargetUserOrAuthor && selectedUser?.status === "Normal";

  const canCommuMute =
    isCommu && isTargetUserOrAuthor && selectedUser?.status === "Normal";

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-2">Manage users in the system</p>
            {actorRole && (
              <p className="text-xs text-muted-foreground mt-1">
                Logged in as: <span className="font-medium">{formatRoleLabel(actorRole)}</span>
              </p>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Authors</CardTitle>
              <Edit className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter((u) => u.role === "author").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Shield className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter((u) => u.status === "Normal").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Banned Users</CardTitle>
              <Shield className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter((u) => u.status === "Banned").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search + Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Search & Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Muted">Muted</SelectItem>
                  <SelectItem value="Banned">Banned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>User List ({filteredUsers.length})</CardTitle>
            <CardDescription>Manage all users in the system</CardDescription>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredUsers.map((user) => {
                  const href = `/admin/notifications?receiverEmail=${encodeURIComponent(
                    user.email
                  )}`;

                  const isHighlighted = highlightId === user.id;

                  const rowClass = [
                    "group transition-all duration-150",
                    "cursor-default",
                    "hover:bg-slate-50 hover:shadow-sm",
                    "hover:border-l-4",
                    hoverBorderByRole(user.role),
                    "focus-within:bg-slate-50 focus-within:shadow-sm",
                    "focus-within:border-l-4 focus-within:border-l-blue-500",
                    isHighlighted
                      ? "bg-blue-50 ring-1 ring-blue-200 border-l-4 border-l-blue-500 shadow-sm"
                      : "",
                  ].join(" ");

                  return (
                    <TableRow key={user.id} className={rowClass}>
                      <TableCell className="group-hover:text-slate-900">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar || "/placeholder.svg"} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-gray-600 group-hover:text-slate-900">
                        {user.email}
                      </TableCell>

                      <TableCell>
                        <Badge className={getRoleColor(user.role)} variant="secondary">
                          <div className="flex items-center space-x-1">
                            {getRoleIcon(user.role)}
                            <span>{formatRoleLabel(user.role)}</span>
                          </div>
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge className={getStatusColor(user.status)} variant="secondary">
                          {user.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-gray-600 group-hover:text-slate-900">
                        {user.joinDate}
                      </TableCell>

                      <TableCell className="flex items-center gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="
                            bg-white transition-all
                            group-hover:border-slate-400
                            hover:bg-slate-100 hover:border-slate-500 hover:shadow-sm
                            focus-visible:ring-2 focus-visible:ring-blue-500
                          "
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="
                            bg-white transition-all
                            group-hover:border-red-400
                            hover:bg-red-50 hover:border-red-500 hover:text-red-700 hover:shadow-sm
                            focus-visible:ring-2 focus-visible:ring-red-500
                          "
                        >
                          <Link
                            href={href}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();

                              if (!user.email) {
                                toast.error("User email is missing.");
                                return;
                              }

                              highlightThenNavigate(user.id, href);
                            }}
                          >
                            <Mail className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user role and status</DialogDescription>
            </DialogHeader>

            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedUser.avatar || "/placeholder.svg"} />
                    <AvatarFallback>{selectedUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{selectedUser.name}</h3>
                    <p className="text-gray-600">{selectedUser.email}</p>
                  </div>
                </div>

                {/* ROLE: only admin can change */}
                <div>
                  <Label htmlFor="role">Role</Label>

                  {isAdmin ? (
                    <Select
                      value={selectedUser.role}
                      onValueChange={(value) => {
                        if (selectedUser.role === "author" && value === "user") {
                          toast.error("Cannot downgrade AUTHOR back to USER (blocked by backend).");
                          return;
                        }
                        handleUpdateUserRole(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => {
                          const disabled = selectedUser.role === "author" && r.value === "user";
                          return (
                            <SelectItem key={r.value} value={r.value} disabled={disabled}>
                              {r.label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-2">
                      <Badge className={getRoleColor(selectedUser.role)} variant="secondary">
                        {formatRoleLabel(selectedUser.role)}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        * Only admin can change roles.
                      </p>
                    </div>
                  )}
                </div>

                {/* STATUS: depend on actorRole */}
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>

                  {/* ADMIN */}
                  {isAdmin && (
                    <>
                      <Select
                        value={selectedUser.status}
                        onValueChange={(v) => {
                          if (!canAdminEditStaffStatus) {
                            toast.error("Admin chỉ được ban/mute Content Moderator & Community Manager.");
                            return;
                          }
                          handleUpdateUserStatus(v as UserRow["status"]);
                        }}
                        disabled={!canAdminEditStaffStatus}
                      >
                        <SelectTrigger disabled={!canAdminEditStaffStatus}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Normal">Normal</SelectItem>
                          <SelectItem value="Muted">Muted</SelectItem>
                          <SelectItem value="Banned">Banned</SelectItem>
                        </SelectContent>
                      </Select>

                      {!canAdminEditStaffStatus && (
                        <p className="text-xs text-muted-foreground">
                          * Admin không ban/mute user/author. Ban/mute user/author do Content/Commu thực hiện. Admin chỉ reset về Normal khi đã bị xử lý.
                        </p>
                      )}

                      {canAdminResetUserAuthor && (
                        <div className="mt-3 space-y-2 rounded-md border p-3">
                          <div className="text-sm font-medium">Reset user/author về Normal</div>

                          <div className="space-y-1">
                            <Label className="text-xs">Reason (optional)</Label>
                            <Input
                              value={resetReason}
                              onChange={(e) => setResetReason(e.target.value)}
                              placeholder="VD: Reviewed & approved to restore normal..."
                            />
                          </div>

                          <Button variant="destructive" onClick={handleAdminResetUserStatus}>
                            Reset to Normal
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {/* CONTENT MOD */}
                  {isContentMod && (
                    <>
                      <Badge className={getStatusColor(selectedUser.status)} variant="secondary">
                        {selectedUser.status}
                      </Badge>

                      {!isTargetUserOrAuthor ? (
                        <p className="text-xs text-muted-foreground">
                          * Content Moderator chỉ có thể BAN user/author.
                        </p>
                      ) : selectedUser.status !== "Normal" ? (
                        <p className="text-xs text-muted-foreground">
                          * User/author đã bị xử lý ({selectedUser.status}). Bạn không thể chỉnh nữa. Chỉ admin mới reset về Normal.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-2 rounded-md border p-3">
                          <div className="text-sm font-medium">BAN user/author (Content)</div>

                          <div className="space-y-1">
                            <Label className="text-xs">Reason (optional)</Label>
                            <Input
                              value={moderationReason}
                              onChange={(e) => setModerationReason(e.target.value)}
                              placeholder="Reason..."
                            />
                          </div>

                          <Button variant="destructive" onClick={handleContentBan} disabled={!canContentBan}>
                            Ban
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {/* COMMUNITY MANAGER */}
                  {isCommu && (
                    <>
                      <Badge className={getStatusColor(selectedUser.status)} variant="secondary">
                        {selectedUser.status}
                      </Badge>

                      {!isTargetUserOrAuthor ? (
                        <p className="text-xs text-muted-foreground">
                          * Community Manager chỉ có thể MUTE user/author.
                        </p>
                      ) : selectedUser.status !== "Normal" ? (
                        <p className="text-xs text-muted-foreground">
                          * User/author đã bị xử lý ({selectedUser.status}). Bạn không thể chỉnh nữa. Chỉ admin mới reset về Normal.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-2 rounded-md border p-3">
                          <div className="text-sm font-medium">MUTE user/author (Community)</div>

                          <div className="space-y-1">
                            <Label className="text-xs">Reason (optional)</Label>
                            <Input
                              value={moderationReason}
                              onChange={(e) => setModerationReason(e.target.value)}
                              placeholder="Reason..."
                            />
                          </div>

                          <Button onClick={handleCommuMute} disabled={!canCommuMute}>
                            Mute
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {/* fallback */}
                  {!actorRole && (
                    <p className="text-xs text-muted-foreground">
                      * Không xác định được role người đăng nhập. Kiểm tra endpoint /api/auth/me.
                    </p>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsEditDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
