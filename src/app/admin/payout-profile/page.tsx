"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useToast } from "@/components/ui/use-toast";
import AdminLayout from "../adminLayout/page";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Check,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react"; // Import thêm icon cho đẹp
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type KycStatus = "pending" | "verified" | "rejected";

export interface ProfileItem {
  _id: string;
  fullName: string;
  citizenId: string;
  dateOfBirth: Date;
  address: string;
  taxCode: string;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  identityImages?: string[];
  kycStatus: KycStatus;
  isActive: boolean;
  createdAt: Date;
  changedAt?: Date;
  rejectReason?: string;
  isHistory?: boolean;
  user_info: {
    _id: string;
    email: string;
    username: string;
  };
}

export default function PayoutProfileManagement() {
  const { toast } = useToast();
  const [items, setItems] = useState<ProfileItem[]>([]);
  const [status, setStatus] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [dialogType, setDialogType] = useState<"approve" | "reject" | null>(
    null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  const getStatusBadge = (status: string, note?: string) => {
    const styles: Record<string, any> = {
      pending: {
        color: "bg-amber-50 text-amber-600 border-amber-200",
        icon: Clock,
        label: "Pending",
      },
      verified: {
        color: "bg-emerald-50 text-emerald-600 border-emerald-200",
        icon: CheckCircle2,
        label: "Verified",
      },
      rejected: {
        color: "bg-rose-50 text-rose-600 border-rose-200",
        icon: XCircle,
        label: "Rejected",
      },
    };

    const s = styles[status];

    const Icon = s.icon;

    const badge = (
      <Badge
        variant="outline"
        className={`${s.color} flex items-center gap-1 font-medium capitalize py-0.5 cursor-default`}
      >
        <Icon className="w-3 h-3" />
        {s.label}
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

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payout-profile/list`,
        {
          params: {
            kycStatus: status === "all" ? undefined : status,
            keyword,
            page,
            limit: 10,
          },
          withCredentials: true,
        },
      );

      setItems(res.data.items);
      setTotalPages(res.data.totalPages);
    } catch (error) {
      console.error("Fetch error", error);
    } finally {
      setLoading(false);
    }
  }, [status, keyword, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async () => {
    if (!selectedId) return;

    try {
      setIsSubmitting(true);

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payout-profile/approve/${selectedId}`,
        {},
        { withCredentials: true },
      );

      toast({
        title: "Approved successfully!",
        description: "The request has been approved",
        variant: "success",
      });

      setDialogType(null);
      fetchData();
    } catch (err) {
      toast({
        title: "Error while approving",
        description: `${err}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedId || !rejectReason) return;

    try {
      setIsSubmitting(true);

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payout-profile/reject/${selectedId}`,
        { reason: rejectReason },
        { withCredentials: true },
      );

      toast({
        title: "Rejected successfully!",
        description: "The request has been rejected",
        variant: "destructive",
      });

      setDialogType(null);
      setRejectReason("");
      fetchData();
    } catch (err) {
      toast({
        title: "Error while rejecting",
        description: `${err}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const badgeColor = (s: KycStatus) => {
    switch (s) {
      case "pending":
        return "bg-orange-50 text-orange-600 border-orange-200";
      case "verified":
        return "bg-green-50 text-green-600 border-green-200";
      case "rejected":
        return "bg-red-50 text-red-600 border-red-200";
      default:
        return "bg-gray-50 text-gray-600";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* FILTER BAR */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-wrap gap-6 items-center">
          <div className="flex-1 relative min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              placeholder="Search by name, citizen ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-500">Status:</span>

            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px] bg-slate-50 border-slate-200 rounded-xl h-10 text-sm font-medium">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>

              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Personal Details
                </th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Bank Information
                </th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Identity Images
                </th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
                  Status
                </th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-20 text-slate-400 animate-pulse"
                  >
                    Loading data...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-slate-400">
                    No profiles found.
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr
                    key={p._id}
                    className="hover:bg-blue-50/30 transition-colors group"
                  >
                    <td className="px-6 py-5">
                      <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {p.user_info?.username || "N/A"}
                      </div>
                      <div className="text-slate-400 text-xs">
                        {p.user_info?.email}
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="font-bold text-slate-800 uppercase text-sm mb-0.5">
                        {p.fullName}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-slate-500 text-xs">
                          ID:{" "}
                          <span className="text-slate-700 font-medium">
                            {p.citizenId}
                          </span>
                        </span>
                        <span
                          className="text-slate-400 text-[11px] max-w-[200px] truncate"
                          title={p.address}
                        >
                          {p.address}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="text-sm font-semibold text-slate-800">
                        {p.bankName}
                      </div>
                      <div className="text-blue-600 font-mono text-xs font-bold">
                        {p.bankAccount}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-tight">
                        {p.bankAccountName}
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex gap-2">
                        {p.identityImages?.map((img, i) => (
                          <div
                            key={i}
                            className="relative w-16 h-10 rounded-lg border border-slate-200 overflow-hidden cursor-pointer group/img"
                            onClick={() =>
                              setSelectedImg(
                                `${process.env.NEXT_PUBLIC_API_URL}/payout-identity/${p.user_info._id}/${img}`,
                              )
                            }
                          >
                            <img
                              src={`${process.env.NEXT_PUBLIC_API_URL}/payout-identity/${p.user_info._id}/${img}`}
                              className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-300"
                              alt="KYC"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="px-6 py-5 text-center">
                      {getStatusBadge(p.kycStatus, p.rejectReason)}
                    </td>

                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        {p.kycStatus === "pending" && !p.isHistory && (
                          <>
                            <Button
                              onClick={() => {
                                setSelectedId(p._id);
                                setDialogType("reject");
                              }}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>

                            <Button
                              onClick={() => {
                                setSelectedId(p._id);
                                setDialogType("approve");
                              }}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* PAGINATION */}
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
        </div>
        <Dialog open={!!dialogType} onOpenChange={() => setDialogType(null)}>
          <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {dialogType === "approve"
                  ? "Approve Profile"
                  : "Reject Profile"}
              </DialogTitle>
            </DialogHeader>

            {dialogType === "reject" && (
              <textarea
                placeholder="Reject reason..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full border rounded-lg p-3 text-sm"
              />
            )}

            <DialogFooter className="mt-4 gap-2">
              <Button variant="outline" onClick={() => setDialogType(null)}>
                Cancel
              </Button>

              <Button
                variant={dialogType === "approve" ? "default" : "destructive"}
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
          </DialogContent>
        </Dialog>
      </div>

      {/* IMAGE MODAL LIGHTBOX */}
      {selectedImg && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImg(null)}
        >
          <button className="absolute top-6 right-6 text-white hover:rotate-90 transition-transform">
            <X className="w-8 h-8" />
          </button>
          <img
            src={selectedImg}
            className="w-auto h-auto max-w-[95vw] max-h-[95vh] object-contain animate-in zoom-in-95 duration-300"
            alt="Enlarged KYC"
          />
        </div>
      )}
    </AdminLayout>
  );
}
