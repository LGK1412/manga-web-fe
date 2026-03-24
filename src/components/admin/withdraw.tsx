"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Search, Eye } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

interface WithdrawListItem {
  _id: string;
  authorId: {
    _id: string;
    username: string;
    email: string;
  };

  taxCode: string;

  bankName: string;
  bankAccount: string;
  bankAccountName: string;

  withdraw_point: number;
  grossAmount: number;
  taxAmount: number;
  taxRate: number;
  netAmount: number;

  status: string;
  note?: string;

  createdAt: string;
  approvedAt: string;
  settledAt: string;
  paidAt: string;
}

interface WithdrawDetail extends WithdrawListItem {
  fullName: string;
  citizenId: string;
  dateOfBirth: string;
  address: string;

  identityImages: string[];
  taxDocuments: string[];
  contractFile: string;
}

export default function WithdrawCard() {
  const { toast } = useToast();
  const [withdraws, setWithdraws] = useState<WithdrawListItem[]>([]);
  const [selectedWithdrawId, setSelectedWithdrawId] = useState<string | null>(
    null,
  );
  const [selectedWithdrawDetail, setSelectedWithdrawDetail] =
    useState<WithdrawDetail | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [dialogType, setDialogType] = useState<
    "view" | "approve" | "reject" | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDate = (d?: Date | string) =>
    d ? new Date(d).toLocaleDateString("vi-VN") : "-";

  const fetchWithdraws = async () => {
    const params: any = {};

    if (filterMonth !== "all") params.month = filterMonth;
    if (filterYear !== "all") params.year = filterYear;
    if (filterStatus !== "all") params.status = filterStatus;
    if (searchTerm) params.search = searchTerm;

    const res = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/withdraw`,
      {
        withCredentials: true,
        params,
      },
    );

    setWithdraws(res.data);
  };

  const fetchWithdrawDetail = async (id: string) => {
    try {
      setIsLoadingDetail(true);
      setSelectedWithdrawId(id);

      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/withdraw/detail/${id}`,
        { withCredentials: true },
      );

      setSelectedWithdrawDetail(res.data);
      setDialogType("view");
    } catch {
      toast({
        title: "Failed to load withdraw detail",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchWithdraws();
  }, [filterStatus, filterMonth, filterYear, searchTerm]);

  const handleApprove = async () => {
    if (!selectedWithdrawId) return;

    try {
      setIsSubmitting(true);

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/withdraw/${selectedWithdrawId}/approve`,
        {},
        { withCredentials: true },
      );

      toast({ title: "Approve successfully", variant: "success" });

      setDialogType(null);
      fetchWithdraws();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedWithdrawId) return;

    try {
      setIsSubmitting(true);

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/withdraw/${selectedWithdrawId}/reject`,
        { note: rejectNote },
        { withCredentials: true },
      );

      toast({ title: "Reject successfully", variant: "success" });

      setDialogType(null);
      fetchWithdraws();
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string, note?: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-400">
            Pening
          </Badge>
        );

      case "approved":
        return (
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-400">
            Approved
          </Badge>
        );

      case "settled":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-400">
            Setted
          </Badge>
        );

      case "paid":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-400">
            Paid
          </Badge>
        );

      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-400">
            Rejected ({note})
          </Badge>
        );

      default:
        return <Badge>Khác</Badge>;
    }
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Search and Filter</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex gap-4 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by author name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="settled">Setted</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>

            {/* Month */}
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All month</SelectItem>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    Month {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Year */}
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Withdraw List ({withdraws.length})</CardTitle>
          <CardDescription>Manage author&apos;s withdraw</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Author</TableHead>
                <TableHead className="text-right">TaxCode</TableHead>
                <TableHead className="text-right">Bank Information</TableHead>
                <TableHead className="text-right">
                  Withdraw Information
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested Date</TableHead>
                <TableHead>Approved Date</TableHead>
                <TableHead>Settled Date</TableHead>
                <TableHead>Paid Date</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {withdraws.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-6 text-gray-500"
                  >
                    No withdrawal requests match the current filter.
                  </TableCell>
                </TableRow>
              ) : (
                withdraws.map((w) => (
                  <TableRow key={w._id}>
                    <TableCell>
                      <div className="font-medium">{w.authorId?.username}</div>
                      <div className="text-xs text-gray-500">
                        {w.authorId?.email}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">{w.taxCode}</TableCell>

                    <TableCell>
                      <div className="font-medium">Bank: {w.bankName}</div>
                      <div className="text-medium text-gray-500">
                        Account: {w.bankAccount}
                      </div>
                      <div className="font-medium">
                        Account name: {w.bankAccountName}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div>
                        {w.withdraw_point} = {w.netAmount}
                      </div>
                      <div>
                        ({w.grossAmount} - {w.taxAmount} ({w.taxRate * 100}%))
                      </div>
                    </TableCell>

                    <TableCell>{getStatusBadge(w.status, w.note)}</TableCell>
                    <TableCell>{formatDate(w.createdAt)}</TableCell>
                    <TableCell>{formatDate(w.approvedAt)}</TableCell>
                    <TableCell>{formatDate(w.settledAt)}</TableCell>
                    <TableCell className="font-semibold text-emerald-600">
                      {formatDate(w.paidAt)}
                    </TableCell>

                    <TableCell className="space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fetchWithdrawDetail(w._id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {w.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedWithdrawId(w._id);
                              setDialogType("approve");
                            }}
                          >
                            Approve
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedWithdrawId(w._id);
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

      <Dialog
        open={dialogType !== null}
        onOpenChange={() => setDialogType(null)}
      >
        <DialogContent>
          {/* ===== VIEW MODE ===== */}
          {dialogType === "view" && selectedWithdrawDetail && (
            <>
              {isLoadingDetail ? (
                <div className="p-6 text-center">Loading...</div>
              ) : (
                selectedWithdrawDetail && (
                  <>
                    <DialogHeader>
                      <DialogTitle>Withdraw Detail</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 text-sm bg-gray-50 p-4 rounded-xl">
                      <div>
                        <b>Withdraw Point:</b>{" "}
                        {selectedWithdrawDetail.withdraw_point}
                      </div>
                      <div>
                        <b>Gross:</b>{" "}
                        {selectedWithdrawDetail.grossAmount.toLocaleString()}{" "}
                        VND
                      </div>
                      <div className="text-red-600">
                        <b>Tax:</b> -
                        {selectedWithdrawDetail.taxAmount.toLocaleString()} VND
                      </div>
                      <div className="font-semibold text-emerald-600">
                        <b>Net:</b>{" "}
                        {selectedWithdrawDetail.netAmount.toLocaleString()} VND
                      </div>
                      <div>
                        <b>Tax rate:</b>{" "}
                        {(selectedWithdrawDetail.taxRate * 100).toFixed(1)}%
                      </div>
                      <div>
                        <b>Bank:</b> {selectedWithdrawDetail.bankName}
                      </div>
                      <div>
                        <b>Account:</b> ****
                        {selectedWithdrawDetail.bankAccount.slice(-4)}
                      </div>
                      <div>
                        <b>Account Name:</b>{" "}
                        {selectedWithdrawDetail.bankAccountName}
                      </div>
                    </div>

                    <DialogFooter>
                      <Button onClick={() => setDialogType(null)}>Đóng</Button>
                    </DialogFooter>
                  </>
                )
              )}
            </>
          )}

          {/* ===== APPROVE MODE ===== */}
          {dialogType === "approve" && (
            <>
              <DialogHeader>
                <DialogTitle>Confirm approve</DialogTitle>
                <DialogDescription>
                  Are you sure to approve this withdraw?
                </DialogDescription>
              </DialogHeader>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogType(null)}>
                  Cancel
                </Button>
                <Button onClick={handleApprove} disabled={isSubmitting}>
                  {isSubmitting ? "Approving..." : "Approve"}
                </Button>
              </DialogFooter>
            </>
          )}

          {/* ===== REJECT MODE ===== */}
          {dialogType === "reject" && (
            <>
              <DialogHeader>
                <DialogTitle>Reject</DialogTitle>
                <DialogDescription>Enter reject reason</DialogDescription>
              </DialogHeader>

              <Input
                placeholder="Enter reason..."
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogType(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={() => handleReject()}>
                  Reject
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
