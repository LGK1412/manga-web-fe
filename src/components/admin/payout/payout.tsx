"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Loader2,
  FileDown,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar as CalendarIcon,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

import ViewBankRefModal from "./viewBankRefModal";
import UpdatePayoutModal from "./updatePayoutModal";
import PayPayoutModal from "./payoutPayModal";
import CancelPayoutModal from "./payoutCancelModel";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PayoutSettlement {
  _id: string;
  periodFrom: string;
  periodTo: string;
  year: number;
  item: [
    {
      author: string; //id
      bankName: string;
      bankAccount: string;
      bankAccountName: string;
      totalNet: number;
      withdrawIds: string[];
    },
  ];
  totalNet: number;
  withdrawCount: number;
  status:
    | "pending"
    | "exported"
    | "processing"
    | "paid"
    | "failed"
    | "cancelled";
  fileName: string;
  bankBatchRef?: string[];
  paidAt?: string;
  note?: string;
}

type PayoutCardProps = {
  onWithdrawUpdated?: () => void;
};

export default function PayoutCard({ onWithdrawUpdated }: PayoutCardProps) {
  const { toast } = useToast();
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [fromMonth, setFromMonth] = useState<Date>(new Date());
  const [toMonth, setToMonth] = useState<Date>(new Date());
  const [loadingPayout, setLoadingPayout] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [payouts, setPayouts] = useState<PayoutSettlement[]>([]);

  const handleSuccess = () => {
    fetchPayoutSettlement();
    onWithdrawUpdated?.();
  };

  const getStatusBadge = (status: string, note?: string) => {
    const styles: Record<string, { color: string; icon: any; label: string }> =
      {
        pending: {
          color: "bg-amber-50 text-amber-600 border-amber-200",
          icon: Clock,
          label: "Pending",
        },
        exported: {
          color: "bg-blue-50 text-blue-600 border-blue-200",
          icon: CheckCircle2,
          label: "Exported",
        },
        paid: {
          color: "bg-emerald-50 text-emerald-600 border-emerald-200",
          icon: CheckCircle2,
          label: "Paid",
        },
        cancelled: {
          color: "bg-rose-50 text-rose-600 border-rose-200",
          icon: XCircle,
          label: "Cancelled",
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

    if (status === "cancelled" && note) {
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

  const fetchPayoutSettlement = async () => {
    try {
      setLoadingPayout(true);

      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payout-settlement`,
        { withCredentials: true },
      );

      setPayouts(res.data.data || res.data);
    } finally {
      setLoadingPayout(false);
    }
  };

  const exportPayoutExcel = async () => {
    setExporting(true);
    if (!fromDate || !toDate) {
      toast({
        title: "Please pick a range date",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payout-settlement/export`,
        {
          params: {
            from: fromDate,
            to: toDate,
          },
          withCredentials: true,
          responseType: "blob",
        },
      );

      if (res.status === 204) {
        toast({
          title: "Cannot export file",
          description: "No matching withdraw were found during this period.",
          variant: "destructive",
        });
        return;
      }

      const blob = new Blob([res.data], {
        type: res.headers["content-type"],
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const disposition = res.headers["content-disposition"];

      let fileName = "";
      if (disposition) {
        const match =
          disposition.match(/filename\*=UTF-8''([^;]+)/) ||
          disposition.match(/filename="?([^"]+)"?/);

        if (match?.[1]) {
          fileName = decodeURIComponent(match[1]);
        }
      }
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast({
        title: "Export successfully!",
        description: "Export payout settlement successfully",
        variant: "success",
      });

      fetchPayoutSettlement();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "An error while exporting",
        description: "Cannot export file for some error",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadAgain = async (payout: PayoutSettlement) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payout-settlement/download/${payout._id}`,
        {
          withCredentials: true,
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data], {
        type: response.headers["content-type"],
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const disposition = response.headers["content-disposition"];

      let fileName = "";
      if (disposition) {
        const match =
          disposition.match(/filename\*=UTF-8''([^;]+)/) ||
          disposition.match(/filename="?([^"]+)"?/);

        if (match?.[1]) {
          fileName = decodeURIComponent(match[1]);
        }
      }
      link.download = fileName;

      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error while downloading",
        description:
          err.response?.data?.message || "File not found or connection error.",
      });
    }
  };

  useEffect(() => {
    fetchPayoutSettlement();
  }, []);

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="py-4 px-6 border-b border-slate-100 bg-white">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-slate-800">
                Export Payout Settlement
              </CardTitle>
              <CardDescription>
                Select a date range to generate a new payout batch
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-end gap-4 flex-wrap">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
              From Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[180px] h-9 justify-start text-left font-normal border-slate-200",
                    !fromDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                  {fromDate ? format(fromDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={(date) => {
                    setFromDate(date);
                    if (date) setFromMonth(date);
                  }}
                  month={fromMonth}
                  onMonthChange={setFromMonth}
                  captionLayout="dropdown"
                  fromYear={2020}
                  toYear={new Date().getFullYear()}
                  fixedWeeks
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
              To Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[180px] h-9 justify-start text-left font-normal border-slate-200",
                    !toDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                  {toDate ? format(toDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={(date) => {
                    setToDate(date);
                    if (date) setToMonth(date);
                  }}
                  month={toMonth}
                  onMonthChange={setToMonth}
                  captionLayout="dropdown"
                  fromYear={2020}
                  toYear={new Date().getFullYear()}
                  fixedWeeks
                  disabled={(date) => (fromDate ? date < fromDate : false)}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button
            onClick={exportPayoutExcel}
            className="h-9 bg-green-600 hover:bg-green-700 text-white"
            disabled={!fromDate || !toDate || exporting}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4 mr-2" />
            )}
            {exporting ? "Exporting..." : "Export"}
          </Button>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-slate-100 bg-white">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-slate-800 leading-none">
                Payout Settlement History
              </CardTitle>
              <CardDescription>
                History of generated payout batches and status
              </CardDescription>
            </div>
            <Badge
              variant="secondary"
              className="font-normal text-slate-500 bg-slate-100 shrink-0"
            >
              Total {payouts.length} items
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[250px] pl-6">Period</TableHead>
                <TableHead className="text-right">Total Net</TableHead>
                <TableHead className="text-center">Withdraws</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingPayout ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Loader2 className="animate-spin mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : payouts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-12 text-slate-500"
                  >
                    No payout settlement yet.
                  </TableCell>
                </TableRow>
              ) : (
                payouts.map((p) => (
                  <TableRow
                    key={p._id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <TableCell className="pl-6 font-medium text-slate-700">
                      <div className="flex items-center gap-2">
                        {format(new Date(p.periodFrom), "dd/MM/yyyy")}
                        <ChevronRight className="w-3 h-3 text-slate-600" />
                        {format(new Date(p.periodTo), "dd/MM/yyyy")}
                      </div>
                    </TableCell>

                    <TableCell className="text-right font-bold text-emerald-600">
                      {p.totalNet.toLocaleString()}đ
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className="bg-slate-100 text-slate-600"
                      >
                        {p.withdrawCount} items
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex justify-center">
                        {getStatusBadge(p.status, p.note)}
                      </div>
                    </TableCell>

                    <TableCell className="pr-6 text-right">
                      <div className="flex justify-end items-center gap-1">
                        <div className="flex gap-1 justify-end">
                          {p.status !== "paid" && p.status !== "cancelled" && (
                            <>
                              <PayPayoutModal
                                payout={p}
                                onSuccess={handleSuccess}
                              />
                              <CancelPayoutModal
                                payoutId={p._id}
                                onSuccess={handleSuccess}
                              />
                            </>
                          )}
                          {p.status === "paid" && (
                            <>
                              <ViewBankRefModal payout={p} />
                              <UpdatePayoutModal
                                payout={p}
                                onSuccess={handleSuccess}
                              />
                            </>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadAgain(p)}
                          className="h-8 w-8 text-green-600 hover:bg-green-50"
                          title="Download Excel"
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
