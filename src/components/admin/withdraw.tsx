"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  User,
  Landmark,
  Image as ImageIcon,
  ChevronRight,
  ChevronLeft,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface WithdrawListItem {
  _id: string;
  authorId: {
    _id: string;
    username: string;
    email: string;
  };
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
  approvedAt?: string;
  settledAt?: string;
  paidAt?: string;
}

interface WithdrawDetail extends WithdrawListItem {
  fullName: string;
  citizenId: string;
  address: string;
  taxCode: string;
  identityImages: string[];
}

export default function WithdrawCard({ refreshKey }: { refreshKey: number }) {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [withdraws, setWithdraws] = useState<WithdrawListItem[]>([]);
  const [selectedWithdrawId, setSelectedWithdrawId] = useState<string | null>(
    null,
  );
  const [selectedWithdrawDetail, setSelectedWithdrawDetail] =
    useState<WithdrawDetail | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const currentYear = new Date().getFullYear();
  const [filterYear, setFilterYear] = useState(String(currentYear));
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogType, setDialogType] = useState<
    "view" | "approve" | "reject" | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);

  const formatDate = (d?: Date | string) => {
    if (!d) return "-";

    const date = new Date(d);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fetchWithdraws = async () => {
    const params: any = {};
    if (filterMonth !== "all") params.month = filterMonth;
    if (filterYear !== "all") params.year = filterYear;
    if (filterStatus !== "all") params.status = filterStatus;
    if (searchTerm) params.search = searchTerm;

    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/withdraw`,
        {
          withCredentials: true,
          params: {
            ...params,
            page,
            limit: 10,
          },
        },
      );
      setWithdraws(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchWithdrawDetail = async (id: string) => {
    try {
      setSelectedWithdrawId(id);
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/withdraw/detail/${id}`,
        {
          withCredentials: true,
        },
      );
      setSelectedWithdrawDetail(res.data);
      setDialogType("view");
    } catch {
      toast({ title: "Failed to load detail", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchWithdraws();
  }, [filterStatus, filterMonth, filterYear, searchTerm, refreshKey, page]);

  const handleApprove = async () => {
    if (!selectedWithdrawId) return;
    try {
      setIsSubmitting(true);
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/withdraw/${selectedWithdrawId}/approve`,
        {},
        { withCredentials: true },
      );
      toast({ title: "Approved successfully" });
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
      toast({ title: "Rejected successfully" });
      setDialogType(null);
      fetchWithdraws();
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string, note?: string) => {
    const styles: Record<string, { color: string; icon: any; label: string }> =
      {
        pending: {
          color: "bg-amber-50 text-amber-600 border-amber-200",
          icon: Clock,
          label: "Pending",
        },
        approved: {
          color: "bg-purple-50 text-purple-600 border-purple-200",
          icon: CheckCircle2,
          label: "Approved",
        },
        settled: {
          color: "bg-blue-50 text-blue-600 border-blue-200",
          icon: CheckCircle2,
          label: "Settled",
        },
        paid: {
          color: "bg-emerald-50 text-emerald-600 border-emerald-200",
          icon: CheckCircle2,
          label: "Paid",
        },
        rejected: {
          color: "bg-rose-50 text-rose-600 border-rose-200",
          icon: XCircle,
          label: "Rejected",
        },
      };

    const s = styles[status] || {
      color: "bg-gray-50 text-gray-600 border-gray-200",
      icon: Clock,
      label: status,
    };
    const Icon = s.icon;

    const badge = (
      <Badge
        variant="outline"
        className={`${s.color} flex items-center gap-1 font-medium capitalize py-0.5 cursor-default`}
      >
        <Icon className="w-3 h-3" /> {s.label}
      </Badge>
    );

    if (status === "rejected" && note) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{badge}</TooltipTrigger>
            <TooltipContent className="bg-rose-600 text-white border-none">
              <p className="text-xs">Reason: {note}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return badge;
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-slate-800">
            Search & Filter
          </CardTitle>
          <CardDescription>
            Search by author name or email, select month and year to view
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-end gap-4 flex-wrap">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                Search Author
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 border-slate-200 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                Status
              </Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 border-slate-200">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                Period
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor="month-select"
                    className="text-[10px] text-slate-500 font-medium ml-0.5"
                  >
                    Month
                  </Label>
                  <Select value={filterMonth} onValueChange={setFilterMonth}>
                    <SelectTrigger
                      id="month-select"
                      className="h-9 border-slate-200"
                    >
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          Month {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor="year-select"
                    className="text-[10px] text-slate-500 font-medium ml-0.5"
                  >
                    Year
                  </Label>
                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger
                      id="year-select"
                      className="h-9 border-slate-200"
                    >
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {years.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TABLE SECTION */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-slate-100 bg-white">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-slate-800 leading-none">
                Withdrawal Requested
              </CardTitle>
              <CardDescription>
                View and process withdrawal requests
              </CardDescription>
            </div>
            <Badge
              variant="secondary"
              className="font-normal text-slate-500 bg-slate-100 shrink-0"
            >
              Total {withdraws.length} items
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-100">
                <TableHead className="pl-6 h-11 font-semibold text-slate-600">
                  Author
                </TableHead>
                <TableHead className="h-11 font-semibold text-slate-600">
                  Bank Account
                </TableHead>
                <TableHead className="h-11 font-semibold text-slate-600 text-right">
                  Points
                </TableHead>
                <TableHead className="h-11 font-semibold text-slate-600 text-right">
                  Net Payout
                </TableHead>
                <TableHead className="h-11 font-semibold text-slate-600 text-center">
                  Status
                </TableHead>
                <TableHead className="h-11 font-semibold text-slate-600 text-center">
                  Created
                </TableHead>
                <TableHead className="text-center">Approved</TableHead>
                <TableHead className="text-center">Settled</TableHead>
                <TableHead className="text-center">Paid</TableHead>
                <TableHead className="pr-6 h-11 font-semibold text-slate-600 text-right">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdraws.map((w) => (
                <TableRow
                  key={w._id}
                  className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors"
                >
                  <TableCell className="pl-6 py-4">
                    <div className="font-bold text-slate-700">
                      {w.authorId?.username}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {w.authorId?.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="text-xs font-bold text-slate-700">
                          {w.bankName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {w.bankAccount}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-bold text-slate-700 text-sm">
                      {w.withdraw_point.toLocaleString()} pts
                    </div>
                    <div className="text-[10px] text-slate-400">
                      → {formatCurrency(w.grossAmount)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-bold text-emerald-600 text-sm">
                      {formatCurrency(w.netAmount)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Tax: {formatCurrency(w.taxAmount)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      {getStatusBadge(w.status, w.note)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-xs text-slate-500">
                    {formatDate(w.createdAt)}
                  </TableCell>
                  <TableCell className="text-center text-xs text-slate-500">
                    {formatDate(w.approvedAt)}
                  </TableCell>

                  <TableCell className="text-center text-xs text-slate-500">
                    {formatDate(w.settledAt)}
                  </TableCell>

                  <TableCell className="text-center text-xs text-slate-500">
                    {formatDate(w.paidAt)}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex justify-end gap-1 items-center">
                      <div className="flex gap-1 min-w-[72px] justify-end">
                        {w.status === "pending" ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                              onClick={() => {
                                setSelectedWithdrawId(w._id);
                                setDialogType("reject");
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                              onClick={() => {
                                setSelectedWithdrawId(w._id);
                                setDialogType("approve");
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <div className="w-16" />
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                        onClick={() => fetchWithdrawDetail(w._id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-6 py-5 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
            <p className="text-xs font-medium text-slate-500">
              Showing page <span className="text-slate-900">{page}</span> of{" "}
              <span className="text-slate-900">{totalPages}</span>
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MODAL DETAIL */}
      <Dialog
        open={dialogType !== null}
        onOpenChange={() => setDialogType(null)}
      >
        {dialogType && (
          <DialogContent className="max-w-3xl overflow-hidden p-0 gap-0">
            {dialogType === "view" && selectedWithdrawDetail ? (
              <>
                <div className="bg-slate-900 p-6 text-white">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <DialogTitle>Withdrawal Detail</DialogTitle>
                        <p className="text-slate-400 text-[10px] font-mono">
                          ID: {selectedWithdrawDetail._id}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-emerald-400">
                        {formatCurrency(selectedWithdrawDetail.netAmount)}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                        Net Payout
                      </div>
                    </div>
                  </div>
                </div>

                <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6 bg-white">
                  <div className="grid grid-cols-2 gap-8">
                    {/* Personal */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-tight">
                        <User className="w-3.5 h-3.5 text-blue-600" /> Personal
                        Info
                      </div>
                      <div className="space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <DetailItem
                          label="Full Name"
                          value={selectedWithdrawDetail.fullName}
                          isBold
                        />
                        <DetailItem
                          label="Citizen ID"
                          value={selectedWithdrawDetail.citizenId}
                        />
                        <DetailItem
                          label="Address"
                          value={selectedWithdrawDetail.address}
                          isItalic
                        />
                        <DetailItem
                          label="Tax Code"
                          value={selectedWithdrawDetail.taxCode}
                        />
                      </div>
                    </div>

                    {/* Bank */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-tight">
                        <Landmark className="w-3.5 h-3.5 text-blue-600" />{" "}
                        Banking info
                      </div>
                      <div className="space-y-2 bg-blue-50/30 p-4 rounded-lg border border-blue-100/50">
                        <DetailItem
                          label="Bank Name"
                          value={selectedWithdrawDetail.bankName}
                        />
                        <DetailItem
                          label="Account No"
                          value={selectedWithdrawDetail.bankAccount}
                          isBold
                        />
                        <DetailItem
                          label="Beneficiary"
                          value={selectedWithdrawDetail.bankAccountName}
                          uppercase
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Identity Images Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-tight">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-600" />{" "}
                      Identity Verification
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedWithdrawDetail.identityImages?.length > 0 ? (
                        selectedWithdrawDetail.identityImages.map(
                          (img, idx) => (
                            <div
                              key={idx}
                              className="group relative rounded-lg border border-slate-200 overflow-hidden bg-slate-100 aspect-[3/2]"
                            >
                              <img
                                src={`${process.env.NEXT_PUBLIC_API_URL}/payout-identity/${selectedWithdrawDetail.authorId?._id}/${img}`}
                                alt={`Identity ${idx + 1}`}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            </div>
                          ),
                        )
                      ) : (
                        <div className="col-span-2 py-8 text-center border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm italic">
                          No identity images provided.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter className="p-4 bg-slate-50 border-t flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDialogType(null)}
                    className="px-6"
                  >
                    Close
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle>
                    {dialogType === "approve"
                      ? "Confirm Approval"
                      : "Reject Request"}
                  </DialogTitle>
                </DialogHeader>
                {dialogType === "reject" && (
                  <div className="py-4 space-y-2">
                    <Label>Reason for rejection</Label>
                    <Input
                      placeholder="Enter reason..."
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                    />
                  </div>
                )}
                <DialogFooter className="mt-4 gap-2">
                  <Button variant="outline" onClick={() => setDialogType(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant={
                      dialogType === "approve" ? "default" : "destructive"
                    }
                    onClick={
                      dialogType === "approve" ? handleApprove : handleReject
                    }
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? "Processing..."
                      : dialogType === "approve"
                        ? "Approve & Process"
                        : "Reject Request"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

// --- Sub-components ---
function DetailItem({ label, value, isBold, isItalic, uppercase }: any) {
  return (
    <div className="flex justify-between text-xs gap-4 leading-tight">
      <span className="text-slate-500 whitespace-nowrap">{label}</span>
      <span
        className={`text-slate-800 text-right ${isBold ? "font-bold text-slate-900" : ""} ${isItalic ? "italic" : ""} ${uppercase ? "uppercase" : ""}`}
      >
        {value || "-"}
      </span>
    </div>
  );
}
