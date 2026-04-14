"use client";
import { useState, useEffect } from "react";
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
  UploadCloud,
  X,
  Loader2,
  Save,
  FileText,
  User,
  Edit,
} from "lucide-react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function UpdatePaidTaxModal({
  tax,
  onSuccess,
}: {
  tax: any;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState(tax.receiptNumber || "");
  const [note, setNote] = useState(tax.note || "");

  const [remainingFilesMap, setRemainingFilesMap] = useState<
    Record<string, string[]>
  >({});
  const [newFilesMap, setNewFilesMap] = useState<Record<string, File[]>>({});

  useEffect(() => {
    if (open) {
      const initialMap: Record<string, string[]> = {};
      tax.items.forEach((item: any) => {
        initialMap[item.author._id] = [...(item.proofFiles || [])];
      });
      setRemainingFilesMap(initialMap);
      setNewFilesMap({});
      setReceiptNumber(tax.receiptNumber || "");
      setNote(tax.note || "");
    }
  }, [open, tax]);

  const handleFileChange = (
    authorId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setNewFilesMap((prev) => ({
        ...prev,
        [authorId]: [...(prev[authorId] || []), ...files],
      }));
    }
    e.target.value = "";
  };

  const removeRemainingFile = (authorId: string, fileName: string) => {
    setRemainingFilesMap((prev) => ({
      ...prev,
      [authorId]: prev[authorId].filter((f) => f !== fileName),
    }));
  };

  const removeNewFile = (authorId: string, index: number) => {
    setNewFilesMap((prev) => ({
      ...prev,
      [authorId]: prev[authorId].filter((_, i) => i !== index),
    }));
  };

  const handleUpdate = async () => {
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("receiptNumber", receiptNumber);
      formData.append("note", note);

      const itemFiles = tax.items.map((item: any) => ({
        authorId: item.author._id,
        remainingFiles: remainingFilesMap[item.author._id] || [],
      }));
      formData.append("itemFiles", JSON.stringify(itemFiles));

      Object.entries(newFilesMap).forEach(([authorId, files]) => {
        files.forEach((file) => {
          formData.append(`proofFiles_${authorId}`, file);
        });
      });

      await axios.patch(
        `${apiUrl}/api/tax-settlement/update-paid/${tax._id}`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      toast({ title: "Updated successfully", variant: "success" });
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Update failed",
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
          variant="ghost"
          className="text-blue-600 hover:bg-blue-50"
        >
          <Edit className="w-4 h-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[650px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-blue-500" />
            Update Paid Settlement
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Receipt number</Label>
                <Input
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="VCB-123..."
                />
              </div>
              <div className="space-y-2">
                <Label>Note</Label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Note..."
                />
              </div>
            </div>

            <div className="h-px bg-slate-200" />

            <div className="space-y-4">
              <Label className="text-base font-bold text-blue-600">
                Documents
              </Label>
              {tax.items.map((item: any) => {
                const authorId = item.author._id;
                return (
                  <div
                    key={authorId}
                    className="border rounded-lg p-4 bg-white shadow-sm space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-500" />
                        <span className="font-semibold text-sm">
                          {item.authorName}
                        </span>
                      </div>
                    </div>

                    <div className="relative border-2 border-dashed border-slate-200 rounded-md p-3 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all">
                      <input
                        type="file"
                        multiple
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={(e) => handleFileChange(authorId, e)}
                        accept="image/*,.pdf"
                      />
                      <div className="flex items-center justify-center gap-2 text-slate-400">
                        <UploadCloud className="h-4 w-4" />
                        <span className="text-xs font-medium text-slate-500">
                          Upload files
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {remainingFilesMap[authorId]?.map((fileName) => (
                        <FilePreviewFromServer
                          key={fileName}
                          fileName={fileName}
                          taxId={tax._id}
                          authorId={authorId}
                          apiUrl={apiUrl}
                          onRemove={() =>
                            removeRemainingFile(authorId, fileName)
                          }
                        />
                      ))}
                      {newFilesMap[authorId]?.map((file, idx) => (
                        <FilePreviewItem
                          key={idx}
                          file={file}
                          onRemove={() => removeNewFile(authorId, idx)}
                        />
                      ))}
                    </div>
                  </div>
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
            onClick={handleUpdate}
            disabled={submitting}
            className="min-w-[140px]"
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

// --- Component xem file từ Server ---
function FilePreviewFromServer({
  fileName,
  taxId,
  authorId,
  apiUrl,
  onRemove,
}: any) {
  const [open, setOpen] = useState(false);
  const fileUrl = `${apiUrl}/proofFiles/${taxId}/${authorId}/${fileName}`;
  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName);
  const isPdf = /\.pdf$/i.test(fileName);

  return (
    <>
      <div
        className="relative group border rounded-md p-1 w-16 h-16 shadow-sm cursor-pointer hover:ring-2 hover:ring-red-400 transition-all"
        onClick={() => setOpen(true)}
      >
        {isImage ? (
          <img
            src={fileUrl}
            className="w-full h-full object-cover rounded"
            alt="p"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-600 rounded">
            <FileText className="w-5 h-5" />
            <span className="text-[7px] font-bold uppercase">
              {fileName.split(".").pop()}
            </span>
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 z-20 shadow-md hover:scale-110"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-1 flex flex-col bg-slate-900 border-none">
          <DialogHeader className="p-2 bg-white rounded-t-lg">
            <DialogTitle className="text-sm truncate">{fileName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-900">
            {isImage ? (
              <img
                src={fileUrl}
                className="max-w-full max-h-full object-contain"
                alt="preview"
              />
            ) : isPdf ? (
              <iframe src={fileUrl} className="w-full h-[75vh] bg-white" />
            ) : (
              <div className="text-white text-center p-10">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>This file type cannot be previewed.</p>
                <Button asChild variant="outline" className="mt-4">
                  <a href={fileUrl} target="_blank">
                    Download
                  </a>
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FilePreviewItem({ file, onRemove }: any) {
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";

  return (
    <>
      <div
        className="relative group border border-green-200 bg-green-50/30 rounded-md p-1 w-16 h-16 shadow-sm cursor-pointer hover:ring-2 hover:ring-green-400 transition-all"
        onClick={() => setOpen(true)}
      >
        {isImage ? (
          <img
            src={url}
            className="w-full h-full object-cover rounded"
            alt="p"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-green-100 text-green-700 rounded">
            <FileText className="w-5 h-5" />
            <span className="text-[7px] font-bold">NEW</span>
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 z-20 shadow-md"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-1 flex flex-col bg-slate-900 border-none">
          <DialogHeader className="p-2 bg-white rounded-t-lg">
            <DialogTitle className="text-sm truncate">
              Preview: {file.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto flex items-center justify-center">
            {isImage ? (
              <img
                src={url}
                className="max-w-full max-h-full object-contain"
                alt="preview"
              />
            ) : isPdf ? (
              <iframe src={url} className="w-full h-[75vh] bg-white" />
            ) : (
              <p className="text-white">Document: {file.name}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
