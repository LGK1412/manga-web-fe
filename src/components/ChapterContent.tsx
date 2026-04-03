// app/(whatever)/components/ChapterContent.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import Cookies from "js-cookie";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportSubmitDialog } from "@/components/report/report-submit-dialog";
import { useToast } from "@/hooks/use-toast";

import TTSReader from "./TTSReader";
import translateWithGemini from "./Aitranlation";

type Chapter = {
  _id: string;
  title: string;
  type: "text" | "image" | "unknown";
  content?: string | null;
  images?: string[];
  createdAt?: string;
  authorId?: string | null;
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
  const isOwnChapter =
    !!user?.user_id &&
    !!chapterInfo?.authorId &&
    String(user.user_id) === String(chapterInfo.authorId);

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
    if (isOwnChapter) {
      toast({
        title: "Action not allowed",
        description: "You cannot report your own chapter.",
        variant: "destructive",
      });
      return;
    }
    setReportDialogOpen(true);
  };

  const handleSubmitReport = async ({
    reason,
    description,
  }: {
    reason: string;
    description?: string;
  }) => {
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
    if (isOwnChapter) {
      toast({
        title: "Action not allowed",
        description: "You cannot report your own chapter.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingReport(true);
    try {
      await axios.post(
        `${API_BASE}/api/reports`,
        {
          target_type: "Chapter",
          target_id: chapterInfo._id,
          reason,
          description,
        },
        { withCredentials: true }
      );

      toast({
        title: "Report sent successfully",
        description: "Thank you for your feedback.",
      });
      setReportDialogOpen(false);
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

        {!isOwnChapter ? (
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="shrink-0 rounded-xl border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
            onClick={openReportDialog}
            title="Report this chapter"
          >
            <Flag className="w-4 h-4 mr-1" />
            Report
          </Button>
        ) : null}
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
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

      <ReportSubmitDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        targetTypeLabel="Chapter"
        targetName={chapterInfo?.title}
        submitting={isSubmittingReport}
        onSubmit={handleSubmitReport}
      />
    </div>
  );
}
