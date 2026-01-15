"use client";

import { useEffect, useMemo, useState } from "react";
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
  role: string; // raw role: 'user' | 'author' | 'content_moderator' | ...
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

  // phân biệt network / CORS / không nhận được response
  if (!err?.response) {
    console.log("No response object -> maybe network/CORS/server down?");
    console.log("err.request:", err?.request);
  }

  if (extra) console.log("extra:", extra);
  console.groupEnd();
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // Fetch users từ backend
  const fetchUsers = async () => {
    const endpoint = `${API_URL}/api/user/all`;

    try {
      if (!API_URL) {
        toast.error("Thiếu NEXT_PUBLIC_API_URL");
        return;
      }

      console.log("[Admin Fetch Users] REQUEST", { url: endpoint });

      const res = await axios.get(endpoint, { withCredentials: true });

      console.log("[Admin Fetch Users] RESPONSE", {
        status: res.status,
        dataPreview: Array.isArray(res.data)
          ? `Array(${res.data.length})`
          : res.data,
      });

      const mappedUsers: UserRow[] = (res.data || []).map((u: any) => ({
        id: u._id,
        name: u.username,
        email: u.email,
        role: u.role, // ✅ keep raw role
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
      logAxiosError("[Admin Fetch Users]", endpoint, err);
      const msg = err?.response?.data?.message;
      toast.error(
        Array.isArray(msg) ? msg.join(", ") : msg ?? "Không tải được danh sách users"
      );
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === "all" || user.role === filterRole;
      const matchesStatus =
        filterStatus === "all" || user.status === filterStatus;
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
    console.log("[Admin Edit User] OPEN", user);
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  // Update status API
  const handleUpdateUserStatus = async (newStatus: UserRow["status"]) => {
    if (!selectedUser) return;

    if (!API_URL) {
      toast.error("Thiếu NEXT_PUBLIC_API_URL");
      return;
    }

    const endpoint = `${API_URL}/api/user/update-status`;

    try {
      let backendStatus = "normal";
      if (newStatus === "Banned") backendStatus = "ban";
      if (newStatus === "Muted") backendStatus = "mute";

      const payload = { userId: selectedUser.id, status: backendStatus };

      console.log("[Admin Update Status] REQUEST", {
        url: endpoint,
        payload,
        selectedUser,
      });

      const res = await axios.post(endpoint, payload, { withCredentials: true });

      console.log("[Admin Update Status] RESPONSE", {
        status: res.status,
        data: res.data,
      });

      toast.success("Cập nhật trạng thái thành công");

      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id ? { ...u, status: newStatus } : u
        )
      );
      setSelectedUser((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch (err: any) {
      logAxiosError("[Admin Update Status]", endpoint, err, {
        payload: { userId: selectedUser.id, status: newStatus },
        selectedUser,
      });

      const msg = err?.response?.data?.message;
      toast.error(
        Array.isArray(msg) ? msg.join(", ") : msg ?? "Không thể cập nhật trạng thái"
      );
    }
  };

  // ✅ Admin update role API
  const handleUpdateUserRole = async (newRole: string) => {
    if (!selectedUser) return;

    if (!API_URL) {
      toast.error("Thiếu NEXT_PUBLIC_API_URL");
      return;
    }

    const endpoint = `${API_URL}/api/user/admin/set-role`;

    try {
      const payload = { userId: selectedUser.id, role: newRole };

      console.log("[Admin Set Role] REQUEST", {
        url: endpoint,
        payload,
        selectedUser,
      });

      const res = await axios.patch(endpoint, payload, {
        withCredentials: true,
      });

      console.log("[Admin Set Role] RESPONSE", {
        status: res.status,
        data: res.data,
      });

      toast.success("Cập nhật role thành công");

      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id ? { ...u, role: newRole } : u
        )
      );
      setSelectedUser((prev) => (prev ? { ...prev, role: newRole } : prev));
    } catch (err: any) {
      logAxiosError("[Admin Set Role]", endpoint, err, {
        payload: { userId: selectedUser.id, role: newRole },
        selectedUser,
      });

      const msg = err?.response?.data?.message;
      const prettyMsg = Array.isArray(msg) ? msg.join(", ") : msg;

      toast.error(prettyMsg ?? "Không thể cập nhật role");
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-2">Quản lý người dùng trong hệ thống</p>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Users</CardTitle>
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
              <CardTitle className="text-sm font-medium">Banned</CardTitle>
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
            <CardTitle>Tìm kiếm và Lọc</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm theo tên hoặc email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Vai trò" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
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
            <CardTitle>Danh sách Users ({filteredUsers.length})</CardTitle>
            <CardDescription>Quản lý tất cả người dùng trong hệ thống</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tham gia</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar || "/placeholder.svg"} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-gray-600">{user.email}</TableCell>

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

                    <TableCell className="text-gray-600">{user.joinDate}</TableCell>

                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button variant="outline" size="sm">
                        <Mail className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Chỉnh sửa User</DialogTitle>
              <DialogDescription>Cập nhật role và trạng thái của người dùng</DialogDescription>
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

                {/* Role (disable author -> user) */}
                <div>
                  <Label htmlFor="role">Vai trò</Label>
                  <Select
                    value={selectedUser.role}
                    onValueChange={(value) => {
                      // ✅ chặn FE luôn cho khỏi bắn request 400
                      if (selectedUser.role === "author" && value === "user") {
                        console.warn("[Admin Set Role] BLOCKED: author -> user", {
                          selectedUser,
                          attemptedRole: value,
                        });
                        toast.error("Không thể downgrade AUTHOR về USER (backend đang chặn).");
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

                  {selectedUser.role === "author" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      * Backend hiện tại không cho downgrade AUTHOR về USER.
                    </p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <Label htmlFor="status">Trạng thái</Label>
                  <Select value={selectedUser.status} onValueChange={handleUpdateUserStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Muted">Muted</SelectItem>
                      <SelectItem value="Banned">Banned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={() => setIsEditDialogOpen(false)}>Đóng</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
