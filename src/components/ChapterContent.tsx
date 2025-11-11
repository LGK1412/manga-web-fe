// app/(whatever)/components/ChapterContent.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import Cookies from "js-cookie";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import TTSReader from "./TTSReader";
import translateWithGemini from "./Aitranlation";

type Chapter = {
  _id: string;
  title: string;
  type: "text" | "image" | "unknown";
  content?: string | null;
  images?: string[];
  createdAt?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function ChapterContent() {
  const { id } = useParams();
  const { toast } = useToast();

  // ===== Chapter data =====
  const [chapterInfo, setChapterInfo] = useState<Omit<Chapter, "content"> | null>(null);
  const [originalContent, setOriginalContent] = useState<string | null>(null); // immutable base for translation
  const [finalContent, setFinalContent] = useState<string | null>(null); // render + TTS

  // ===== Translation =====
  const [targetLang, setTargetLang] = useState("");
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState("");

  // ===== Auth (read cookie like ChapterComments) =====
  const [user, setUser] = useState<any | undefined>();
  const [mounted, setMounted] = useState(false);

  // ===== Report (Chapter) =====
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Spam");
  const [reportDescription, setReportDescription] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // ===== Effects =====
  useEffect(() => setMounted(true), []);

  // Read cookie user (same pattern as ChapterComments)
  useEffect(() => {
    if (!mounted) return;
    const raw = Cookies.get("user_normal_info");
    if (raw) {
      try {
        const decoded = decodeURIComponent(raw);
        setUser(JSON.parse(decoded));
      } catch {
        console.error("Invalid cookie data");
      }
    }
  }, [mounted]);

  // Load chapter by id
  useEffect(() => {
    if (!id) return;
    axios
      .get(`${API_BASE}/api/Chapter/content/${id}`, { withCredentials: true })
      .then((res) => {
        const data: Chapter = res.data;
        const { content, ...info } = data;
        setChapterInfo(info);

        if (data.type === "text" && data.content) {
          setOriginalContent(data.content);
          setFinalContent(data.content);
        } else {
          setOriginalContent(null);
          setFinalContent(null);
        }
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Không tải được nội dung chương";
        toast({
          title: "Lỗi",
          description: msg,
          variant: "destructive",
        });
      });
  }, [id, toast]);

  // ===== Derived =====
  const isTextChapter = !!originalContent;
  const isTranslated = isTextChapter && finalContent !== originalContent;
  const plainText = useMemo(
    () => (finalContent ? finalContent.replace(/<[^>]*>/g, "") : ""),
    [finalContent]
  );

  // ===== Handlers =====
  const handleTranslate = async () => {
    if (!targetLang || !originalContent) return;
    setTranslating(true);
    setTranslateError("");

    try {
      const result = await translateWithGemini(originalContent, targetLang);
      if (typeof result === "string") {
        setFinalContent(result);
      } else {
        setTranslateError("Lỗi: Kết quả dịch không hợp lệ.");
      }
    } catch (err: any) {
      console.error("Translate error:", err);
      setTranslateError(err?.message ?? "Đã xảy ra lỗi khi dịch");
    } finally {
      setTranslating(false);
    }
  };

  const openReportDialog = () => {
    setReportReason("Spam");
    setReportDescription("");
    setReportDialogOpen(true);
  };

  const handleSubmitReport = async () => {
    if (!user) {
      toast({
        title: "Chưa đăng nhập",
        description: "Vui lòng đăng nhập để gửi báo cáo.",
        variant: "destructive",
      });
      return;
    }
    if (!chapterInfo?._id) {
      toast({
        title: "Thiếu thông tin chương",
        description: "Không tìm thấy chương cần báo cáo.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingReport(true);
    try {
      await axios.post(
        `${API_BASE}/api/reports`,
        {
          reporter_id: user.user_id,
          target_type: "Chapter", // <<<<<< DIFFERENT FROM COMMENT
          target_id: chapterInfo._id,
          reason: reportReason,
          description: reportDescription.trim() || undefined,
        },
        { withCredentials: true }
      );

      toast({
        title: "Gửi báo cáo thành công ✅",
        description: "Cảm ơn bạn đã gửi phản hồi.",
      });
      setReportDialogOpen(false);
      setReportDescription("");
      setReportReason("Spam");
    } catch (err: any) {
      toast({
        title: "Lỗi khi gửi báo cáo",
        description: err?.response?.data?.message || "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  if (!chapterInfo) return <p className="text-center mt-10">Đang tải chương...</p>;
  const createdAtText =
    chapterInfo.createdAt ? new Date(chapterInfo.createdAt).toLocaleString() : undefined;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 border-b border-gray-300 pb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
            {chapterInfo.title}
          </h2>
          {createdAtText && (
            <p className="text-xs text-muted-foreground mt-1">{createdAtText}</p>
          )}
        </div>

        <Button
          variant="destructive"
          size="sm"
          type="button"
          className="shrink-0"
          onClick={openReportDialog}
          title="Báo cáo chương này"
        >
          <Flag className="w-4 h-4 mr-1" />
          
        </Button>
      </div>

      {/* Text chapter */}
      {chapterInfo.type === "text" ? (
        <>
          {/* TTS (reads finalContent) */}
          <TTSReader text={plainText} />

          {/* Translation controls */}
          <div className="mt-8 p-4 border rounded-lg">
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                placeholder="Target language (e.g., English, vi)"
                className="flex-1 px-3 py-2 border rounded"
              />
              <Button onClick={handleTranslate} disabled={translating || !targetLang}>
                {translating ? "Đang dịch..." : "Dịch"}
              </Button>
            </div>

            {translateError && <div className="text-red-600 mb-3">{translateError}</div>}

            {isTranslated && (
              <Button
                variant="outline"
                onClick={() => setFinalContent(originalContent)}
                className="mt-1"
              >
                Xem lại nội dung gốc
              </Button>
            )}
          </div>

          {/* Render finalContent */}
          <article
            id="chapter-content"
            className="prose prose-lg leading-relaxed text-justify dark:prose-invert mt-6"
            dangerouslySetInnerHTML={{ __html: finalContent || "" }}
          />
        </>
      ) : chapterInfo.type === "image" ? (
        <div id="chapter-content" className="flex flex-col items-center gap-4">
          {chapterInfo.images?.map((img, i) => (
            <figure key={i} className="relative overflow-hidden rounded-xl shadow-md">
              <img
                src={`${API_BASE}${img}`}
                alt={`Trang ${i + 1}`}
                className="w-full max-w-[900px] rounded-xl object-contain"
                loading="lazy"
              />
            </figure>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 dark:text-gray-400">
          Không có nội dung hiển thị.
        </p>
      )}

      {/* Report Dialog (Chapter) */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Báo cáo chương</DialogTitle>
            <DialogDescription>
              Vui lòng chọn lý do và mô tả chi tiết (nếu có).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Lý do</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
              >
                <option value="Spam">Spam</option>
                <option value="Inappropriate">Nội dung không phù hợp</option>
                <option value="Harassment">Quấy rối / xúc phạm</option>
                <option value="Other">Khác</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Mô tả chi tiết</label>
              <Textarea
                placeholder="Mô tả vấn đề bạn gặp phải..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmitReport} disabled={isSubmittingReport}>
              {isSubmittingReport ? "Đang gửi..." : "Gửi báo cáo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
