"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Loader2, ImageIcon, X, FileDown } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import ViewBankRefModal from "./viewBankRefModal";
import UpdatePayoutModal from "./updatePayoutModal";
import PayPayoutModal from "./payoutPayModal";
import CancelPayoutModal from "./payoutCancelModel";

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
  status: "draft" | "exported" | "processing" | "paid" | "failed" | "cancelled";
  fileName: string;
  bankBatchRef?: string[];
  paidAt?: string;
  note?: string;
}

export default function PayoutCard() {
  const { toast } = useToast();
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [loadingPayout, setLoadingPayout] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [payouts, setPayouts] = useState<PayoutSettlement[]>([]);

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
          title: "Không có dữ liệu để export",
          variant: "destructive",
        });
        return;
      }

      const url = window.URL.createObjectURL(new Blob([res.data]));

      const link = document.createElement("a");
      link.href = url;
      link.download = `payout-settlement_${fromDate}-${toDate}.xlsx`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({
        title: "Export payout settlement successfully",
        variant: "success",
      });

      fetchPayoutSettlement();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Lỗi tải file",
        description:
          err.response?.data?.message || "File không tồn tại hoặc lỗi kết nối.",
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
      if (!fileName) fileName = `payout-settlement_${fromDate}_${toDate}.xlsx`;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Lỗi tải file",
        description:
          err.response?.data?.message || "File không tồn tại hoặc lỗi kết nối.",
      });
    }
  };

  useEffect(() => {
    fetchPayoutSettlement();
  }, []);

  return (
    <div>
      <Card>
        <CardContent className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1">
            <Label>From</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>To</Label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <Button
            onClick={exportPayoutExcel}
            variant="outline"
            disabled={!fromDate || !toDate || exporting}
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            {exporting ? "Đang xử lý..." : "Export Payout Settlement"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Settlement Batches</CardTitle>
          <CardDescription>
            Các đợt thanh toán đã export cho author
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Total Net</TableHead>
                <TableHead>Withdraw Count</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loadingPayout ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6">
                    <Loader2 className="animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : payouts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-6 text-gray-500"
                  >
                    No payout settlement yet.
                  </TableCell>
                </TableRow>
              ) : (
                payouts.map((p) => (
                  <TableRow key={p._id}>
                    <TableCell>
                      {new Date(p.periodFrom).toLocaleDateString()} →{" "}
                      {new Date(p.periodTo).toLocaleDateString()}
                    </TableCell>

                    <TableCell className="text-right font-semibold text-emerald-600">
                      {p.totalNet.toLocaleString()}
                    </TableCell>

                    <TableCell>{p.withdrawCount}</TableCell>

                    <TableCell>
                      {p.status === "paid" ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          Paid
                        </Badge>
                      ) : p.status === "cancelled" ? (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                          Cancelled
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                          Exported
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right flex justify-end gap-2">
                      {/* Nút Tải file ZIP/Excel hiện tại */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadAgain(p)}
                        className="hover:bg-primary/10 text-primary"
                      >
                        <FileDown className="w-4 h-4 mr-1" />
                        Tải file
                      </Button>

                      {p.status === "paid" ? (
                        <>
                          <ViewBankRefModal payout={p} />
                          <UpdatePayoutModal
                            payout={p}
                            onSuccess={fetchPayoutSettlement}
                          />
                        </>
                      ) : p.status === "cancelled" ? (
                        <Badge variant="outline" className="text-red-400">
                          Đã hủy ({p.note})
                        </Badge>
                      ) : (
                        <div className="flex gap-1">
                          <PayPayoutModal
                            payout={p}
                            onSuccess={fetchPayoutSettlement}
                          />
                          <CancelPayoutModal
                            payoutId={p._id}
                            onSuccess={fetchPayoutSettlement}
                          />
                        </div>
                      )}
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
