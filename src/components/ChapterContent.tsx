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
          "Unable to load chapter content";
        toast({
          title: "Error",
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
        setTranslateError("Error: Invalid translation result.");
      }
    } catch (err: any) {
      console.error("Translate error:", err);
      setTranslateError(err?.message ?? "An error occurred while translating");
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
        title: "Not logged in",
        description: "Please log in to submit a report.",
        variant: "destructive",
      });
      return;
    }
    if (!chapterInfo?._id) {
      toast({
        title: "Missing chapter information",
        description: "Chapter to report not found.",
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
        title: "Report sent successfully ✅",
        description: "Thank you for your feedback.",
      });
      setReportDialogOpen(false);
      setReportDescription("");
      setReportReason("Spam");
    } catch (err: any) {
      toast({
        title: "Error sending report",
        description: err?.response?.data?.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  if (!chapterInfo) return <p className="text-center mt-10">Loading chapter...</p>;
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
          title="Report this chapter"
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
                {translating ? "Translating..." : "Translate"}
              </Button>
            </div>

            {translateError && <div className="text-red-600 mb-3">{translateError}</div>}

            {isTranslated && (
              <Button
                variant="outline"
                onClick={() => setFinalContent(originalContent)}
                className="mt-1"
              >
                View original content
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
                alt={`Page ${i + 1}`}
                className="w-full max-w-[900px] rounded-xl object-contain"
                loading="lazy"
              />
            </figure>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 dark:text-gray-400">
          No content to display.
        </p>
      )}

      {/* Report Dialog (Chapter) */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Report Chapter</DialogTitle>
            <DialogDescription>
              Please select a reason and provide detailed description (if any).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Reason</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
              >
                <option value="Spam">Spam</option>
                <option value="Inappropriate">Inappropriate content</option>
                <option value="Harassment">Harassment / Offensive</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Detailed Description</label>
              <Textarea
                placeholder="Describe the issue you encountered..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReport} disabled={isSubmittingReport}>
              {isSubmittingReport ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
