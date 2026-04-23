"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Loader2,
  FileDown,
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  CalendarIcon,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import CancelTaxModal from "./taxCancelModal";
import ViewProofModal from "./viewProofModal";
import PayTaxModal from "./taxPayModal";
import UpdatePaidTaxModal from "./updatePaidModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TaxItem {
  author: {
    _id: string;
    username: string;
    email: string;
  };
  authorName: string;
  taxCode: string;
  totalGross: number;
  totalTax: number;
  totalNet: number;
  withdrawIds: string[];
}

interface TaxSettlement {
  _id: string;
  reportType: "QUARTERLY" | "ANNUAL";
  periodFrom: Date;
  periodTo: Date;
  year: number;
  items: TaxItem[];
  totalGross: number;
  totalTax: number;
  totalNet: number;

  withdrawCount: number;
  authorCount: number;

  status: "draft" | "exported" | "paid" | "cancelled";
  fileName: string[];
  receiptNumber?: string;
  proofFiles?: string[];
  paidAt?: string;
  paidBy?: string;
  note?: string;
}

export default function TaxCard() {
  const { toast } = useToast();
  const [taxs, setTaxs] = useState<TaxSettlement[]>([]);
  const [loadingTax, setLoadingTax] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [reportType, setReportType] = useState<"QUARTERLY" | "ANNUAL">(
    "QUARTERLY",
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString(),
  );
  const [selectedQuarter, setSelectedQuarter] = useState<string>("1");

  const getStatusBadge = (status: string, note?: string) => {
    const styles: Record<string, { color: string; icon: any; label: string }> =
      {
        draft: {
          color: "bg-amber-50 text-amber-600 border-amber-200",
          icon: Clock,
          label: "Draft",
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

  const fetchTaxs = async () => {
    try {
      setLoadingTax(true);
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tax-settlement`,
        {
          withCredentials: true,
        },
      );
      setTaxs(res.data.data || res.data);
    } finally {
      setLoadingTax(false);
    }
  };

  const handleExportTax = async () => {
    try {
      setExporting(true);

      let from = "";
      let to = "";

      if (reportType === "QUARTERLY") {
        const q = parseInt(selectedQuarter);
        const startMonth = (q - 1) * 3 + 1;
        const endMonth = q * 3;

        from = `${selectedYear}-${String(startMonth).padStart(2, "0")}-01`;
        to = new Date(parseInt(selectedYear), endMonth, 0)
          .toISOString()
          .slice(0, 10);
      } else {
        from = `${selectedYear}-01-01`;
        to = `${selectedYear}-12-31`;
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tax-settlement/export`,
        {
          from,
          to,
          reportType,
          year: parseInt(selectedYear),
        },
        {
          withCredentials: true,
          responseType: "blob",
        },
      );

      const contentType = response.headers["content-type"];
      const blob = new Blob([response.data], { type: contentType });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Lấy tên file từ Content-Disposition
      const contentDisposition = response.headers["content-disposition"];
      let fileName =
        reportType === "ANNUAL"
          ? `tax-settlement-annual-${selectedYear}.zip`
          : `05-KK-TNCN-Q${selectedQuarter}-${selectedYear}.xlsx`;

      if (contentDisposition) {
        // Regex này bao quát hơn, lấy nội dung bên trong dấu ngoặc kép
        const fileNameMatch = contentDisposition.match(
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,
        );
        if (fileNameMatch && fileNameMatch[1]) {
          fileName = fileNameMatch[1].replace(/['"]/g, "");
          fileName = decodeURIComponent(fileName);
        }
      }

      // 3. Thực hiện tải
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();

      // Dọn dẹp bộ nhớ
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export successfully",
        description: `Excel file ${fileName} has been downloaded`,
        variant: "success",
      });

      fetchTaxs();
    } catch (err: any) {
      let errorMessage = "No data or server error";

      if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const json = JSON.parse(text);
          errorMessage = json.message || errorMessage;
        } catch (e) {
          console.error("Error parsing error blob", e);
        }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      toast({
        variant: "destructive",
        title: "Export failed",
        description: errorMessage,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadAgain = async (tax: TaxSettlement) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tax-settlement/download/${tax._id}`,
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

      // fallback nếu header không có
      if (!fileName) {
        fileName =
          tax.reportType === "ANNUAL"
            ? `tax-settlement-${tax.year}.zip`
            : tax.fileName?.[0] || "report.xlsx";
      }

      link.download = fileName;

      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast({
        variant: "destructive",
        title: "Error while download file",
        description: "The file does not exist.",
      });
    }
  };

  useEffect(() => {
    fetchTaxs();
  }, []);

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-slate-800">
            Export Tax Settlement
          </CardTitle>
          <CardDescription>
            Select year or quarter of year to export tax report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 flex-wrap bg-slate-50 p-4 rounded-lg border">
            <div className="space-y-2">
              <Label>Report type</Label>
              <Select
                value={reportType}
                onValueChange={(v: any) => setReportType(v)}
              >
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="ANNUAL">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Year of settlement</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {reportType === "QUARTERLY" && (
              <div className="space-y-2">
                <Label>Choose quarter</Label>
                <Select
                  value={selectedQuarter}
                  onValueChange={setSelectedQuarter}
                >
                  <SelectTrigger className="w-[120px] bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Quarter I</SelectItem>
                    <SelectItem value="2">Quarter II</SelectItem>
                    <SelectItem value="3">Quarter III</SelectItem>
                    <SelectItem value="4">Quarter IV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={handleExportTax}
              className="h-9 bg-green-600 hover:bg-green-700 text-white"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4 mr-2" />
              )}
              {exporting ? "Exporting..." : "Export"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-4 px-6 border-b border-slate-100 bg-white">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-slate-800 leading-none">
                Tax Settlement History
              </CardTitle>
              <CardDescription>
                View, process and export tax settlement excel
              </CardDescription>
            </div>
            <Badge
              variant="secondary"
              className="font-normal text-slate-500 bg-slate-100 shrink-0"
            >
              Total {taxs.length} items
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-center">Type</TableHead>
                <TableHead className="text-right">Total tax</TableHead>
                <TableHead className="text-center">Withdraws</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingTax ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : (
                taxs.map((t) => (
                  <TableRow key={t._id}>
                    <TableCell className="pl-6 font-medium text-slate-700">
                      {reportType === "ANNUAL" ? (
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span>Year {t.year}</span>
                        </div>
                      ) : (
                        /* Hiển thị cho báo cáo giai đoạn (Period) */
                        <div className="flex items-center gap-2">
                          {format(new Date(t.periodFrom), "dd/MM/yyyy")}
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                          {format(new Date(t.periodTo), "dd/MM/yyyy")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="flex justify-center">
                      <Badge variant="outline">{t.reportType}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-600">
                      {t.totalTax.toLocaleString()}đ
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className="bg-slate-100 text-slate-600"
                      >
                        {t.withdrawCount} items
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        {getStatusBadge(t.status, t.note)}
                      </div>
                    </TableCell>

                    <TableCell className="pr-6 text-right">
                      <div className="flex justify-end items-center gap-1">
                        <div className="flex gap-1 justify-end">
                          {t.status !== "paid" && t.status !== "cancelled" && (
                            <>
                              <CancelTaxModal
                                taxId={t._id}
                                onSuccess={fetchTaxs}
                              />
                              <PayTaxModal tax={t} onSuccess={fetchTaxs} />
                            </>
                          )}
                          {t.status === "paid" && (
                            <>
                              <ViewProofModal tax={t} />
                              <UpdatePaidTaxModal
                                tax={t}
                                onSuccess={fetchTaxs}
                              />
                            </>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadAgain(t)}
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
