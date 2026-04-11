"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  X,
  UploadCloud,
  CheckCircle2,
  Loader2,
  User,
  FileText,
} from "lucide-react";
import { Label } from "../../ui/label";
import { Button } from "../../ui/button";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

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

export default function PayTaxModal({
  tax,
  onSuccess,
}: {
  tax: TaxSettlement;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [receiptNumber, setReceiptNumber] = useState("");
  const [note, setNote] = useState("");
  const [authorFiles, setAuthorFiles] = useState<Record<string, File[]>>({});

  const handleFileChange = (
    authorId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const newFiles = Array.from(e.target.files);

    setAuthorFiles((prev) => ({
      ...prev,
      [authorId]: [...(prev[authorId] || []), ...newFiles],
    }));

    e.target.value = "";
  };

  const removeFile = (authorId: string, index: number) => {
    setAuthorFiles((prev) => {
      const next = { ...prev };
      const files = [...(next[authorId] || [])];

      files.splice(index, 1);

      next[authorId] = files;
      return next;
    });
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      const formData = new FormData();

      formData.append("receiptNumber", receiptNumber);
      formData.append("note", note);

      Object.entries(authorFiles).forEach(([authorId, files]) => {
        files.forEach((file) => {
          formData.append(`proofFiles_${authorId}`, file);
        });
      });

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tax-settlement/pay/${tax._id}`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      toast({
        title: "Mark Successfully",
        description: "Tax payment confirmed.",
        variant: "success",
      });

      setOpen(false);
      onSuccess();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error while marking",
        description: "Cannot update status",
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (open) {
      setAuthorFiles({});
      setReceiptNumber("");
      setNote("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="text-green-600 border-green-200 hover:bg-green-50"
        >
          <CheckCircle2 className="w-4 h-4 mr-1" /> Confirm Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Confirm Tax Settlement & Upload Proofs</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 pb-6">
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label>Receipt number</Label>
                <Input
                  placeholder="VCB-12345678"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>General Note</Label>
                <Input
                  placeholder="Optional..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <Label className="text-base font-bold text-blue-600">
                Author Proofs (Individual Uploads)
              </Label>

              {tax.items.map((item) => {
                const authorId = item.author._id;

                return (
                  <AuthorUploadRow
                    key={`${item.author._id}-${tax._id}`}
                    item={item}
                    files={authorFiles[authorId] || []}
                    onFileChange={handleFileChange}
                    onRemove={removeFile}
                  />
                );
              })}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t bg-slate-50/50">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || Object.keys(authorFiles).length === 0}
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AuthorUploadRow({
  item,
  files,
  onFileChange,
  onRemove,
}: {
  item: TaxItem;
  files: File[];
  onFileChange: (id: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (id: string, idx: number) => void;
}) {
  const authorId = item.author._id;
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 p-1.5 rounded-full">
            <User className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <span className="font-semibold text-sm">{item.authorName}</span>
        </div>
        <span className="text-[11px] font-medium px-2 py-0.5 bg-slate-100 rounded-full text-slate-600">
          Tax: {item.totalTax.toLocaleString()}đ
        </span>
      </div>

      {/* Upload Zone */}
      <div className="relative border-2 border-dashed border-slate-200 rounded-md p-3 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all group">
        <input
          type="file"
          multiple
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          onChange={(e) => onFileChange(authorId, e)}
          accept="image/*,.pdf"
        />
        <div className="flex items-center justify-center gap-2 text-slate-400 group-hover:text-blue-500">
          <UploadCloud className="h-4 w-4" />
          <span className="text-xs font-medium">
            Click or drag proof for this author
          </span>
        </div>
      </div>

      {/* Preview Area */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {files.map((file, idx) => (
            <FilePreviewItem
              key={`${authorId}-${idx}`}
              file={file}
              onRemove={() => onRemove(authorId, idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilePreviewItem({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";

  return (
    <>
      <div
        className="relative group border bg-white rounded-md p-1 w-16 h-16 shadow-sm cursor-pointer  hover:ring-2 hover:ring-red-400 transition-all"
        onClick={() => setOpen(true)}
      >
        {isImage && previewUrl ? (
          <img
            src={previewUrl}
            className="w-full h-full object-cover rounded"
            alt="preview"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-600 rounded">
            <FileText className="w-6 h-6" />
            <span className="text-[8px] font-bold">
              {isPdf ? "PDF" : "FILE"}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:scale-110 transition-transform z-20"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Preview Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preview File</DialogTitle>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-auto">
            {isImage && previewUrl && (
              <img src={previewUrl} className="w-full rounded" alt="preview" />
            )}

            {isPdf && previewUrl && (
              <iframe src={previewUrl} className="w-full h-[70vh]" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// --- Helper Component ---
function Separator() {
  return <div className="h-px bg-slate-200 w-full" />;
}
