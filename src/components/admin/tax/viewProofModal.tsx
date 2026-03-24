"use client";
import {
  FileText,
  ExternalLink,
  Download,
  Image as ImageIcon,
  Eye,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import { Button } from "../../ui/button";

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

export default function ViewProofModal({ tax }: { tax: TaxSettlement }) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-blue-600 border-blue-200 hover:bg-blue-50 gap-2"
        >
          <Eye className="w-4 h-4" />
          Documents ({tax.proofFiles?.length || 0})
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl flex items-center gap-2">
            <CheckCircle2 className="text-green-500 w-5 h-5" />
            Payout Detail
          </DialogTitle>
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm bg-slate-50 p-3 rounded-md">
            <div>
              <p className="text-slate-500">Receip number</p>
              <p className="font-bold">{tax.receiptNumber || "N/A"}</p>
            </div>
            <div>
              <p className="text-slate-500">Paid date</p>
              <p className="font-bold">
                {tax.paidAt
                  ? new Date(tax.paidAt).toLocaleString("vi-VN")
                  : "N/A"}
              </p>
            </div>
            {tax.note && (
              <div className="col-span-2">
                <p className="text-slate-500">Note:</p>
                <p className="italic text-slate-700">&quot;{tax.note}&quot;</p>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <h4 className="font-semibold text-slate-900 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> List of attached files
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tax.proofFiles?.map((fileName, idx) => {
              const fileUrl = `${apiUrl}/proofFiles/${tax._id}/${fileName}`;
              const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName);

              return (
                <div
                  key={idx}
                  className="group border rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all"
                >
                  {/* Khu vực hiển thị nội dung */}
                  <div className="aspect-video bg-slate-100 flex items-center justify-center overflow-hidden relative">
                    {isImage ? (
                      <img
                        src={fileUrl}
                        alt={fileName}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-12 h-12 text-blue-500" />
                        <span className="text-[10px] font-medium text-slate-400 uppercase">
                          {fileName.split(".").pop()} FILE
                        </span>
                      </div>
                    )}

                    {/* Overlay Action khi Hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-white rounded-full hover:bg-slate-100"
                        title="Xem toàn màn hình"
                      >
                        <ExternalLink className="w-4 h-4 text-slate-900" />
                      </a>
                    </div>
                  </div>

                  {/* Thông tin File dưới ảnh */}
                  <div className="p-3 border-t flex items-center justify-between">
                    <p
                      className="text-xs font-medium truncate flex-1 pr-2 text-slate-600"
                      title={fileName}
                    >
                      {fileName}
                    </p>
                    <a
                      href={fileUrl}
                      download
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="sm:justify-start border-t pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              (document.querySelector('[data-state="open"]') as any)?.click()
            }
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
