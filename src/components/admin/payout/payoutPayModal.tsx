"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { X, UploadCloud, CheckCircle2, Eye, Loader2 } from "lucide-react";
import { Label } from "../../ui/label";
import { Button } from "../../ui/button";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

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

// --- COMPONENT MODAL THANH TOÁN ---
export default function PayPayoutModal({
  payout,
  onSuccess,
}: {
  payout: PayoutSettlement;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [note, setNote] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);

      const newPreviews = filesArray.map((file) => {
        if (file.type.startsWith("image/")) return URL.createObjectURL(file);
        return "";
      });
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("note", note);
      selectedFiles.forEach((file) => {
        formData.append("bankBatchRef", file);
      });

      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payout-settlement/pay/${payout._id}`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      toast({
        title: "Thành công",
        description: "Đã xác nhận thanh toán thuế",
      });
      setOpen(false);
      onSuccess(); // Load lại danh sách
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái thanh toán",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="text-green-600 border-green-200 hover:bg-green-50"
        >
          <CheckCircle2 className="w-4 h-4 mr-1" /> Xác nhận thanh toán
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Xác nhận thanh toán</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Bằng chứng thanh toán (Ảnh/PDF)</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-slate-50 transition-colors relative">
              <input
                type="file"
                multiple
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
                accept="image/*,.pdf"
              />
              <UploadCloud className="mx-auto h-8 w-8 text-slate-400" />
              <p className="text-sm text-slate-600 mt-2">
                Kéo thả hoặc nhấp để chọn file
              </p>
            </div>

            {/* PREVIEW AREA */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="relative group border rounded p-1">
                  {previews[idx] ? (
                    <img
                      src={previews[idx]}
                      alt="preview"
                      className="h-20 w-full object-cover rounded"
                    />
                  ) : (
                    <div className="h-20 w-full flex items-center justify-center bg-slate-100 text-[10px] break-all p-1 text-center">
                      {file.name}
                    </div>
                  )}
                  <button
                    onClick={() => removeFile(idx)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ghi chú</Label>
            <Textarea
              placeholder="Nội dung ghi chú nếu có..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || selectedFiles.length === 0}
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
