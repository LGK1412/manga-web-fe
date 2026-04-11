"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  UploadCloud,
  X,
  Loader2,
  Save,
  FileText,
  ExternalLink,
  ImageIcon,
  Edit,
} from "lucide-react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function UpdatePayoutModal({
  payout,
  onSuccess,
}: {
  payout: any;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [note, setNote] = useState(payout.note || "");
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<string[]>(
    payout.bankBatchRef || [],
  );

  const removeExistingFile = (fileName: string) => {
    setExistingFiles((prev) => prev.filter((f) => f !== fileName));
  };

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleUpdate = async () => {
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("note", note);
      formData.append("remainingFiles", JSON.stringify(existingFiles));
      newFiles.forEach((file) => formData.append("bankBatchRef", file));

      await axios.patch(
        `${apiUrl}/api/payout-settlement/update-paid/${payout._id}`,
        formData,
        { withCredentials: true },
      );

      toast({
        title: "Update successfully",
        description: "Payout settlement has been updated",
        variant: "success",
      });
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unable to update",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-blue-600 hover:bg-blue-50"
        >
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-blue-500" />
            Update Payout Settlement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Inputs cơ bản */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Enter note..."
              />
            </div>
          </div>

          <hr />

          {/* Section: File đã có (UI giống ViewModal) */}
          <div className="space-y-3">
            <Label className="text-blue-600 font-bold flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Documents (
              {existingFiles.length})
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {existingFiles.map((file) => {
                const fileUrl = `${apiUrl}/bankBatchRef/${payout._id}/${file}`;
                const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(file);
                return (
                  <div
                    key={file}
                    className="group relative border rounded-lg overflow-hidden bg-white shadow-sm"
                  >
                    <div className="aspect-video bg-slate-100 flex items-center justify-center relative">
                      {isImage ? (
                        <img
                          src={fileUrl}
                          className="w-full h-full object-cover"
                          alt="current"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <FileText className="w-8 h-8 text-blue-400" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {file.split(".").pop()} FILE
                          </span>
                        </div>
                      )}

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

                      {/* Nút xóa file cũ */}
                      <button
                        onClick={() => removeExistingFile(file)}
                        className="absolute top-1 right-1 z-10 bg-red-500 text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="p-2 border-t bg-slate-50">
                      <p
                        className="text-[10px] font-medium truncate text-slate-500"
                        title={file}
                      >
                        {file}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Upload file mới */}
          <div className="space-y-3">
            <Label className="text-green-600 font-bold flex items-center gap-2">
              <UploadCloud className="w-4 h-4" /> Add new file
            </Label>
            <div className="border-2 border-dashed rounded-xl p-6 text-center relative hover:bg-slate-50 transition-all border-slate-200">
              <input
                type="file"
                multiple
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileChange}
              />
              <UploadCloud className="mx-auto h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500 mt-2 font-medium">
                Drag and drop or click to upload
              </p>
            </div>

            {/* Danh sách file mới chờ upload */}
            <div className="grid grid-cols-2 gap-3">
              {newFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 border rounded-lg bg-green-50/50 border-green-100"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="w-4 h-4 text-green-600 shrink-0" />
                    <span className="text-xs truncate font-medium text-green-700">
                      {file.name}
                    </span>
                  </div>
                  <button
                    onClick={() => removeNewFile(idx)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={submitting}
            className="min-w-[120px]"
          >
            {submitting ? (
              <Loader2 className="animate-spin w-4 h-4 mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
