"use client";

import {
  FileText,
  ExternalLink,
  Download,
  Image as ImageIcon,
  Eye,
  CheckCircle2,
  User,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "../../ui/dialog";

import { Button } from "../../ui/button";
import { useState } from "react";

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
  proofFiles: string[];
}

interface TaxSettlement {
  _id: string;
  reportType: "QUARTERLY" | "ANNUAL";
  periodFrom: Date;
  periodTo: Date;
  year: number;
  items: TaxItem[];
  receiptNumber?: string;
  paidAt?: string;
  note?: string;
}

export default function ViewProofModal({ tax }: { tax: TaxSettlement }) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const totalFiles =
    tax.items?.reduce((acc, item) => acc + (item.proofFiles?.length || 0), 0) ||
    0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-blue-600 hover:bg-blue-50"
        >
          <Eye className="w-4 h-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl flex items-center gap-2">
            <CheckCircle2 className="text-green-500 w-5 h-5" />
            Payment Documents
          </DialogTitle>

          <div className="grid grid-cols-2 gap-4 mt-4 text-sm bg-slate-50 p-3 rounded-md">
            <div>
              <p className="text-slate-500">Receipt number</p>
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
            <ImageIcon className="w-4 h-4" />
            Author Proof Documents
          </h4>

          {totalFiles === 0 && (
            <div className="text-center py-10 text-slate-400">
              No documents uploaded
            </div>
          )}

          {tax.items.map((item) =>
            item.proofFiles?.length ? (
              <AuthorProofRow
                key={`${item.author._id}-${tax._id}`}
                item={item}
                taxId={tax._id}
                apiUrl={apiUrl}
              />
            ) : null,
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AuthorProofRow({
  item,
  taxId,
  apiUrl,
}: {
  item: TaxItem;
  taxId: string;
  apiUrl?: string;
}) {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <div className="bg-blue-100 p-1.5 rounded-full">
          <User className="w-3.5 h-3.5 text-blue-600" />
        </div>

        <span className="font-semibold text-sm">{item.authorName}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {item.proofFiles.map((file, idx) => (
          <FilePreviewFromServer
            key={idx}
            file={file}
            taxId={taxId}
            authorId={item.author._id}
            apiUrl={apiUrl}
          />
        ))}
      </div>
    </div>
  );
}

function FilePreviewFromServer({
  file,
  taxId,
  authorId,
  apiUrl,
}: {
  file: string;
  taxId: string;
  authorId: string;
  apiUrl?: string;
}) {
  const [open, setOpen] = useState(false);
  const fileUrl = `${apiUrl}/proofFiles/${taxId}/${authorId}/${file}`;

  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(file);
  const isPdf = /\.pdf$/i.test(file);

  return (
    <>
      <div
        className="relative group border bg-white rounded-md p-1 w-16 h-16 shadow-sm cursor-pointer  hover:ring-2 hover:ring-red-400 transition-all"
        onClick={() => setOpen(true)}
      >
        {isImage ? (
          <img
            src={fileUrl}
            className="w-full h-full object-cover rounded"
            alt="preview server"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-600 rounded">
            <FileText className="w-6 h-6" />
            <span className="text-[8px] font-bold">
              {isPdf ? "PDF" : "FILE"}
            </span>
          </div>
        )}

        {/* Overlay khi hover (tùy chọn - nếu bạn muốn giữ các nút nhanh) */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition rounded-md">
          <Eye className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Preview Modal - Đồng nhất với FilePreviewItem */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl w-[90vw]">
          <DialogHeader className="flex flex-row items-center justify-between pr-8">
            <DialogTitle className="truncate flex-1">
              Preview: {file}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[75vh] overflow-auto flex justify-center bg-slate-50 rounded-lg border p-2">
            {isImage && (
              <img
                src={fileUrl}
                className="max-w-full h-auto object-contain rounded shadow-sm"
                alt="Zoomed preview"
              />
            )}

            {isPdf && (
              <iframe
                src={`${fileUrl}#toolbar=0`}
                className="w-full h-[70vh] border-none rounded"
              />
            )}

            {!isImage && !isPdf && (
              <div className="py-20 text-center">
                <FileText className="w-12 h-12 mx-auto text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">
                  This file type cannot be previewed
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
