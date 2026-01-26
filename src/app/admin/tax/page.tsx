"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Search, Banknote } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AdminLayout from "../adminLayout/page";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table as DocxTable,
  TableRow as DocxTableRow,
  TableCell as DocxTableCell,
  WidthType,
} from "docx";

interface Tax {
  _id: string;
  authorId: {
    _id: string;
    username: string;
    email: string;
  };
  withdrawId: {
    _id: string;
    bankCode: string;
    bankAccount: string;
    accountHolder: string;
  };
  totalPoint: number;
  grossAmount: number;
  taxRate: number;
  taxAmount: number;
  netAmount: number;
  status: string;
  month: number;
  year: number;
  createdAt: string;
  paidAt?: Date;
}

export default function TaxManagement() {
  const { toast } = useToast();
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterMonth, setFilterMonth] = useState<string>("All");
  const [filterYear, setFilterYear] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [platformTax, setPlatformTax] = useState<Tax | null>(null);
  const [loadingPlatform, setLoadingPlatform] = useState(false);

  const fetchTaxes = async () => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tax`,
        {
          withCredentials: true,
        },
      );
      setTaxes(res.data);
    } catch (err) {
      console.error("Error fetching taxes:", err);
      toast({
        title: "Không tải được danh sách thuế tác giả!",
        variant: "destructive",
      });
    }
  };

  const fetchPlatformTax = async (month: string, year: string) => {
    if (month === "All" || year === "All") {
      setPlatformTax(null);
      return;
    }

    try {
      setLoadingPlatform(true);

      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tax/platform`,
        {
          params: {
            month: Number(month),
            year: Number(year),
          },
          withCredentials: true,
        },
      );

      setPlatformTax(res.data); // null hoặc object
    } catch (err) {
      console.error("Fetch platform tax error:", err);
      setPlatformTax(null);
    } finally {
      setLoadingPlatform(false);
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, []);

  useEffect(() => {
    if (filterMonth !== "All" && filterYear !== "All") {
      fetchPlatformTax(filterMonth, filterYear);
    } else {
      setPlatformTax(null);
    }
  }, [filterMonth, filterYear]);

  const years = Array.from(new Set(taxes.map((t) => t.year))).sort(
    (a, b) => b - a,
  );

  const filteredTaxes = taxes.filter((t) => {
    const matchesSearch =
      t.authorId?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.authorId?.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "All" || t.status === filterStatus;

    const matchesMonth =
      filterMonth === "All" || t.month === Number(filterMonth);

    const matchesYear = filterYear === "All" || t.year === Number(filterYear);
    return matchesSearch && matchesStatus && matchesMonth && matchesYear;
  });

  const summary = filteredTaxes.reduce(
    (acc, t) => {
      acc.totalPoint += t.totalPoint;
      acc.gross += t.grossAmount;
      acc.tax += t.taxAmount;
      acc.net += t.netAmount;
      return acc;
    },
    {
      totalPoint: 0,
      gross: 0,
      tax: 0,
      net: 0,
    },
  );

  const exportExcel = () => {
    if (filteredTaxes.length === 0) {
      toast({
        title: "Không có dữ liệu để xuất",
        variant: "destructive",
      });
      return;
    }

    const data = filteredTaxes.map((t, index) => ({
      STT: index + 1,
      Author: t.authorId?.username,
      Email: t.authorId?.email,
      Bank: t.withdrawId.bankCode,
      BankAccount: t.withdrawId.bankAccount,
      AccountHolder: t.withdrawId.accountHolder,
      Point: t.totalPoint,
      Gross: t.grossAmount,
      Tax: t.taxAmount,
      Net: t.netAmount,
      Status: t.status,
      Month: t.month,
      Year: t.year,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tax");

    XLSX.writeFile(workbook, `tax_${filterMonth}_${filterYear}.xlsx`);
  };

  const exportDocReport = async () => {
    try {
      // ===== 1. TẠO FILE DOCX =====
      const now = new Date();
      const exportTime = now.toLocaleString("vi-VN");

      const title = `BÁO CÁO THUẾ TÁC GIẢ - THÁNG ${filterMonth}/${filterYear}`;

      const headerParagraphs = [
        new Paragraph({
          children: [
            new TextRun({
              text: title,
              bold: true,
              size: 32,
            }),
          ],
          spacing: { after: 300 },
        }),

        new Paragraph({
          children: [new TextRun(`Thời gian xuất: ${exportTime}`)],
        }),

        new Paragraph({
          children: [
            new TextRun(`Kỳ thuế: Tháng ${filterMonth} / ${filterYear}`),
          ],
        }),

        new Paragraph({
          children: [new TextRun(`Số lượng bản ghi: ${filteredTaxes.length}`)],
          spacing: { after: 300 },
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "TỔNG HỢP SỐ LIỆU",
              bold: true,
            }),
          ],
          spacing: { after: 200 },
        }),

        new Paragraph(`Tổng Gross: ${summary.gross.toLocaleString()} đ`),
        new Paragraph(`Tổng Tax: ${summary.tax.toLocaleString()} đ`),
        new Paragraph(`Tổng Net: ${summary.net.toLocaleString()} đ`),

        new Paragraph({
          children: [
            new TextRun({
              text: "DANH SÁCH CHI TIẾT",
              bold: true,
            }),
          ],
          spacing: { before: 300, after: 200 },
        }),
      ];

      const tableHeader = new DocxTableRow({
        children: [
          "STT",
          "Author",
          "Email",
          "Bank",
          "Bank Account",
          "Gross",
          "Tax",
          "Net",
        ].map(
          (text) =>
            new DocxTableCell({
              width: { size: 12, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text, bold: true })],
                }),
              ],
            }),
        ),
      });

      const tableRows = filteredTaxes.map((t, index) => {
        const values = [
          (index + 1).toString(),
          t.authorId?.username || "",
          t.authorId?.email || "",
          t.withdrawId?.bankCode || "",
          t.withdrawId?.bankAccount || "",
          t.grossAmount.toLocaleString(),
          t.taxAmount.toLocaleString(),
          t.netAmount.toLocaleString(),
        ];

        return new DocxTableRow({
          children: values.map(
            (v) =>
              new DocxTableCell({
                children: [new Paragraph(v)],
              }),
          ),
        });
      });

      const table = new DocxTable({
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
        rows: [tableHeader, ...tableRows],
      });

      const doc = new Document({
        sections: [
          {
            children: [...headerParagraphs, table],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);

      saveAs(blob, `tax_report_${filterMonth}_${filterYear}.docx`);

      // ===== 2. GỌI API DECLARE =====
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tax/declare`,
        {
          month: Number(filterMonth),
          year: Number(filterYear),
        },
        { withCredentials: true },
      );

      toast({
        title: "Đã xuất báo cáo và khai thuế thành công",
        variant: "success",
      });

      fetchTaxes();
    } catch (err: any) {
      console.error("Export & declare error:", err);

      toast({
        title: "Xuất báo cáo hoặc khai thuế thất bại",
        variant: "destructive",
      });
    }
  };

  const handleMarkPaid = async () => {
    try {
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tax/pay`,
        {
          month: Number(filterMonth),
          year: Number(filterYear),
        },
        { withCredentials: true },
      );

      toast({
        title: "Đã đánh dấu paid",
        variant: "success",
      });
      fetchTaxes();
    } catch (err: any) {
      toast({
        title: "Thao tác thất bại",
        variant: "destructive",
      });
    }
  };

  const isMonthYearSelected = filterMonth !== "All" && filterYear !== "All";

  const hasDataInPeriod = filteredTaxes.length > 0;

  const isAllDraftInPeriod = filteredTaxes.every((t) => t.status === "Draft");

  const canExportDoc =
    isMonthYearSelected &&
    hasDataInPeriod &&
    isAllDraftInPeriod &&
    !platformTax;

  const exportDocDisabledReason = !isMonthYearSelected
    ? "Vui lòng chọn Tháng và Năm"
    : !hasDataInPeriod
      ? "Không có dữ liệu trong kỳ đã chọn"
      : !isAllDraftInPeriod
        ? "Chỉ được xuất khi tất cả bản ghi đang ở trạng thái Draft"
        : "";

  const canMarkPaid =
    isMonthYearSelected && platformTax && platformTax.status === "Declared";

  const markPaidDisabledReason = !isMonthYearSelected
    ? "Vui lòng chọn Tháng và Năm"
    : !platformTax
      ? "Kỳ này chưa có bản ghi PLATFORM"
      : platformTax.status === "Paid"
        ? "Kỳ thuế này đã được thanh toán"
        : "";

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Tax Management</h1>
          <p className="text-gray-600">Quản lý danh sách thuế của tác giả</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Tổng</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taxes.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search + Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Search and Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
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
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Declared">Declared</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      Tháng {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex gap-3 flex-wrap">
            <Button
              onClick={exportExcel}
              variant="outline"
              disabled={filteredTaxes.length === 0}
            >
              Xuất Excel
            </Button>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={exportDocReport}
                      variant="outline"
                      disabled={!canExportDoc}
                    >
                      Xuất báo cáo DOCX
                    </Button>
                  </span>
                </TooltipTrigger>

                {!canExportDoc && (
                  <TooltipContent>
                    <p className="text-sm max-w-xs">
                      {exportDocDisabledReason}
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            {platformTax && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        onClick={handleMarkPaid}
                        disabled={!canMarkPaid}
                        variant="secondary"
                      >
                        Mark as Paid
                      </Button>
                    </span>
                  </TooltipTrigger>

                  {!canMarkPaid && (
                    <TooltipContent>
                      <p className="text-sm max-w-xs">
                        {markPaidDisabledReason}
                      </p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
          </CardContent>
        </Card>

        {/* ===== PLATFORM TAX SUMMARY ===== */}
        {isMonthYearSelected && (
          <Card>
            <CardHeader>
              <CardTitle>
                Platform Tax - Tháng {filterMonth}/{filterYear}
              </CardTitle>
              <CardDescription>
                Bản ghi thuế doanh nghiệp cho kỳ đã chốt sổ
              </CardDescription>
            </CardHeader>

            <CardContent>
              {loadingPlatform ? (
                <p className="text-sm text-gray-500">
                  Đang tải dữ liệu PLATFORM...
                </p>
              ) : !platformTax ? (
                <p className="text-sm text-gray-500 italic">
                  Kỳ này chưa được chốt sổ (chưa có bản ghi PLATFORM)
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Gross</TableHead>
                      <TableHead>Tax Rate</TableHead>
                      <TableHead>Tax</TableHead>
                      <TableHead>Net</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Paid At</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    <TableRow>
                      <TableCell>PLATFORM</TableCell>
                      <TableCell>
                        {platformTax.grossAmount.toLocaleString()} đ
                      </TableCell>
                      <TableCell>
                        {(platformTax.taxRate * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell>
                        {platformTax.taxAmount.toLocaleString()} đ
                      </TableCell>
                      <TableCell>
                        {platformTax.netAmount.toLocaleString()} đ
                      </TableCell>
                      <TableCell>{platformTax.status}</TableCell>
                      <TableCell>
                        {platformTax.paidAt
                          ? new Date(platformTax.paidAt).toLocaleString("vi-VN")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách Tax ({filteredTaxes.length})</CardTitle>
            <CardDescription>Quản lý tất cả thuế của tác giả</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Author</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Bank Account</TableHead>
                  <TableHead>Account Holder</TableHead>
                  <TableHead>Point</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Rate(%)</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTaxes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-6 text-gray-500"
                    >
                      Không có yêu cầu thuế nào phù hợp với bộ lọc hiện tại
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {filteredTaxes.map((t) => (
                      <TableRow key={t._id}>
                        <TableCell>
                          {t.authorId?.username} <br />
                          <span className="text-xs text-gray-500">
                            {t.authorId?.email}
                          </span>
                        </TableCell>
                        <TableCell>{t.withdrawId.bankCode}</TableCell>
                        <TableCell>{t.withdrawId.bankAccount}</TableCell>
                        <TableCell>{t.withdrawId.accountHolder}</TableCell>
                        <TableCell className="text-center">
                          {t.totalPoint}
                        </TableCell>
                        <TableCell className="text-center">
                          {t.grossAmount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          {t.taxAmount.toLocaleString()} ({t.taxRate}%)
                        </TableCell>
                        <TableCell className="text-center">
                          {t.netAmount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          {t.status}
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* ===== HÀNG TỔNG ===== */}
                    <TableRow className="font-semibold bg-gray-50">
                      <TableCell>TỔNG</TableCell>
                      <TableCell colSpan={3}></TableCell>
                      <TableCell className="text-center">
                        {summary.totalPoint}
                      </TableCell>
                      <TableCell className="text-center">
                        {summary.gross.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        {summary.tax.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        {summary.net.toLocaleString()}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
