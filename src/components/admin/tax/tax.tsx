"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Loader2, FileDown, CalendarDays, Eye } from "lucide-react";
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
import CancelTaxModal from "./taxCancelModal";
import ViewProofModal from "./viewProofModal";
import PayTaxModal from "./taxPayModal";
import UpdatePaidTaxModal from "./updatePaidModal";

interface TaxSettlement {
  _id: string;
  reportType: "QUARTERLY" | "ANNUAL";
  periodFrom: Date;
  periodTo: Date;
  year: number;
  items: [
    {
      author: string; //id
      authorName: string;
      taxCode: string;
      totalGross: number;
      totalTax: number;
      totalNet: number;
      withdrawIds: string[];
    },
  ];

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

  // States cho bộ lọc Export
  const [reportType, setReportType] = useState<"QUARTERLY" | "ANNUAL">(
    "QUARTERLY",
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString(),
  );
  const [selectedQuarter, setSelectedQuarter] = useState<string>("1");

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

  // Hàm xử lý Export và Tải file ZIP
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
        title: "Export thành công",
        description: `Đã tải file Excel ${fileName}`,
      });

      fetchTaxs();
    } catch {
      toast({
        variant: "destructive",
        title: "Export thất bại",
        description: "Không có dữ liệu hoặc lỗi hệ thống",
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
        title: "Lỗi tải file",
        description: "File không tồn tại hoặc bạn đã hết phiên đăng nhập.",
      });
    }
  };

  useEffect(() => {
    fetchTaxs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Khối Export điều khiển */}
      <Card className="border-primary/20 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Công cụ xuất quyết toán thuế
          </CardTitle>
          <CardDescription>
            Hệ thống sẽ tự động gom các khoản Withdraw &quot;Paid&quot; để tạo
            bộ hồ sơ ZIP.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 flex-wrap bg-slate-50 p-4 rounded-lg border">
            <div className="space-y-2">
              <Label>Loại báo cáo</Label>
              <Select
                value={reportType}
                onValueChange={(v: any) => setReportType(v)}
              >
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUARTERLY">Quyết toán Quý</SelectItem>
                  <SelectItem value="ANNUAL">Quyết toán Năm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Năm quyết toán</Label>
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
                <Label>Chọn Quý</Label>
                <Select
                  value={selectedQuarter}
                  onValueChange={setSelectedQuarter}
                >
                  <SelectTrigger className="w-[120px] bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Quý I</SelectItem>
                    <SelectItem value="2">Quý II</SelectItem>
                    <SelectItem value="3">Quý III</SelectItem>
                    <SelectItem value="4">Quý IV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={handleExportTax}
              className="ml-auto gap-2"
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              {exporting ? "Đang xử lý..." : "Export Tax Settlement"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bảng danh sách lịch sử giữ nguyên logic Table của bạn */}
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử quyết toán</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kỳ báo cáo</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead className="text-right">Tổng thuế (VNĐ)</TableHead>
                <TableHead className="text-center">Số lệnh rút</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
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
                    <TableCell className="font-medium">
                      {reportType === "ANNUAL"
                        ? `Năm ${t.year}`
                        : `${new Date(t.periodFrom).toLocaleDateString()} - ${new Date(t.periodTo).toLocaleDateString()}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.reportType}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-red-600">
                      {t.totalTax.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {t.withdrawCount}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          t.status === "paid" ? "bg-green-500" : "bg-blue-500"
                        }
                      >
                        {t.status.toUpperCase()}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right flex justify-end gap-2">
                      {/* Nút Tải file ZIP/Excel hiện tại */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadAgain(t)}
                        className="hover:bg-primary/10 text-primary"
                      >
                        <FileDown className="w-4 h-4 mr-1" />
                        Tải file
                      </Button>

                      {t.status === "paid" ? (
                        <>
                          <ViewProofModal tax={t} />
                          <UpdatePaidTaxModal tax={t} onSuccess={fetchTaxs} />
                        </>
                      ) : t.status === "cancelled" ? (
                        <Badge variant="outline" className="text-red-400">
                          Đã hủy
                        </Badge>
                      ) : (
                        <div className="flex gap-1">
                          <PayTaxModal tax={t} onSuccess={fetchTaxs} />
                          <CancelTaxModal taxId={t._id} onSuccess={fetchTaxs} />
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
