"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Banknote,
  Loader2,
} from "lucide-react";
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

interface Withdraw {
  _id: string;
  authorId: {
    _id: string;
    username: string;
    email: string;
  };
  withdraw_point: number;
  amount: number;
  bankCode: string;
  bankAccount: string;
  accountHolder: string;
  status: string;
  note?: string;
  createdAt: string;
}

export default function WithdrawManagement() {
  const [withdraws, setWithdraws] = useState<Withdraw[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWithdraw, setSelectedWithdraw] = useState<Withdraw | null>(
    null,
  );
  const [dialogType, setDialogType] = useState<"approve" | "reject" | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchWithdraws = async () => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/withdraw`,
        {
          withCredentials: true,
        },
      );
      setWithdraws(res.data);
    } catch (err) {
      console.error("Error fetching withdraws:", err);
      toast.error("Không tải được danh sách yêu cầu rút tiền");
    }
  };

  useEffect(() => {
    fetchWithdraws();
  }, []);

  const filteredWithdraws = withdraws.filter((w) => {
    const matchesSearch =
      w.authorId?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.authorId?.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || w.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = async () => {
    if (!selectedWithdraw) return;

    try {
      setIsSubmitting(true);

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/withdraw/${selectedWithdraw._id}/approve`,
        {},
        { withCredentials: true },
      );

      toast.success("Đã duyệt yêu cầu rút tiền");
      setDialogType(null);
      fetchWithdraws();
    } catch (err) {
      console.error(err);
      toast.error("Không thể duyệt yêu cầu");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (note: string) => {
    if (!selectedWithdraw) return;

    try {
      setIsSubmitting(true);

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/withdraw/${selectedWithdraw._id}/reject`,
        { note },
        { withCredentials: true },
      );

      toast.success("Đã từ chối yêu cầu");
      setDialogType(null);
      fetchWithdraws();
    } catch (err) {
      console.error(err);
      toast.error("Không thể từ chối yêu cầu");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string, note?: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-400">
            Đang chờ
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-400">
            Đã duyệt
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-400">
            Từ chối ({note})
          </Badge>
        );
      default:
        return <Badge>Khác</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Withdraw Management</h1>
          <p className="text-gray-600">
            Quản lý các yêu cầu rút tiền của Author
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Tổng yêu cầu
              </CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{withdraws.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Đang chờ</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {withdraws.filter((w) => w.status === "pending").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Đã duyệt</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {withdraws.filter((w) => w.status === "completed").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Từ chối</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {withdraws.filter((w) => w.status === "rejected").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search + Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Search and Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by author name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejectd</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Danh sách Withdraw ({filteredWithdraws.length})
            </CardTitle>
            <CardDescription>
              Quản lý tất cả yêu cầu rút tiền của tác giả
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tác giả</TableHead>
                  <TableHead>Điểm</TableHead>
                  <TableHead>Số tiền (VND)</TableHead>
                  <TableHead>Ngân hàng</TableHead>
                  <TableHead>Tài khoản</TableHead>
                  <TableHead>Chủ TK</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWithdraws.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-6 text-gray-500"
                    >
                      Không có yêu cầu rút tiền nào phù hợp với bộ lọc hiện tại
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWithdraws.map((w) => (
                    <TableRow key={w._id}>
                      <TableCell>
                        {w.authorId?.username} <br />
                        <span className="text-xs text-gray-500">
                          {w.authorId?.email}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {w.withdraw_point}
                      </TableCell>
                      <TableCell className="text-center">
                        {w.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>{w.bankCode}</TableCell>
                      <TableCell>{w.bankAccount}</TableCell>
                      <TableCell>{w.accountHolder}</TableCell>
                      <TableCell>
                        {new Date(w.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(w.status, w.note)}</TableCell>
                      <TableCell className="space-x-2">
                        {w.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedWithdraw(w);
                                setDialogType("approve");
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedWithdraw(w);
                                setDialogType("reject");
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog */}
        <Dialog
          open={dialogType !== null}
          onOpenChange={() => setDialogType(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {dialogType === "approve"
                  ? "Xác nhận duyệt"
                  : "Từ chối yêu cầu"}
              </DialogTitle>
              <DialogDescription>
                {dialogType === "approve"
                  ? "Bạn có chắc chắn muốn duyệt yêu cầu rút tiền này không?"
                  : "Nhập lý do từ chối để thông báo cho tác giả."}
              </DialogDescription>
            </DialogHeader>
            {dialogType === "reject" && (
              <div className="space-y-2">
                <Label>Lý do từ chối</Label>
                <Input
                  placeholder="Nhập lý do..."
                  onChange={(e) =>
                    setSelectedWithdraw((prev) =>
                      prev ? { ...prev, note: e.target.value } : prev,
                    )
                  }
                />
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogType(null)}
                disabled={isSubmitting}
              >
                Hủy
              </Button>

              {dialogType === "approve" ? (
                <Button onClick={handleApprove} disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isSubmitting ? "Đang duyệt..." : "Xác nhận"}
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selectedWithdraw?.note || "")}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang xử lý..." : "Từ chối"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
