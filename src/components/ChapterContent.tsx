"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import Cookies from "js-cookie";
import { Flag, Loader2, ShieldCheck, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportSubmitDialog } from "@/components/report/report-submit-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TTSReader from "./TTSReader";

// ─── Types ────────────────────────────────────────────────────────────────────

type Chapter = {
  _id: string;
  title: string;
  type: "text" | "image" | "unknown";
  content?: string | null;
  images?: string[];
  createdAt?: string;
  authorId?: string | null;
};

type Bubble = {
  box_id: string;
  coordinates: { x: number; y: number; w: number; h: number };
  original_text: string;
  translations: { language: string; text: string }[];
};

type PageTranslation = {
  pageOrder: number;
  bubbles: Bubble[];
};

type LangOption = "" | "vi" | "en" | "ja" | "ko" | "zh" | "es" | "fr";

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
const OCR_REF_WIDTH = 900;

const LANG_OPTIONS: { value: LangOption; label: string }[] = [
  { value: "vi", label: "Vietnamese" },
  { value: "en", label: "English" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
];

const LANG_DISPLAY: Record<LangOption, string> = {
  "": "Original content",
  vi: "Vietnamese",
  en: "English",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  es: "Spanish",
  fr: "French",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MangaPageWithBubbles({
  imgSrc,
  bubbles,
  index,
  totalPages,
  getBubbleText,
  showOverlay,
}: {
  imgSrc: string;
  bubbles: Bubble[];
  index: number;
  totalPages: number;
  getBubbleText: (b: Bubble) => string;
  showOverlay: boolean;
}) {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  return (
    <figure className="relative w-full max-w-[900px] mx-auto">
      <img
        src={imgSrc}
        alt={`Page ${index + 1}`}
        className="w-full block"
        loading="lazy"
        onLoad={(e) => {
          const img = e.target as HTMLImageElement;
          setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
        }}
      />
      {showOverlay && naturalSize && naturalSize.w > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {bubbles.map((bubble) => {
            const text = getBubbleText(bubble);
            const { x, y, w, h } = bubble.coordinates;
            const scaledHeight = OCR_REF_WIDTH * (naturalSize.h / naturalSize.w);
            return (
              <div
                key={bubble.box_id}
                className="absolute border border-black-400 bg-white/90 backdrop-blur-sm text-black leading-tight p-1 rounded shadow-inner flex items-center justify-center text-center overflow-hidden"
                style={{
                  left: `${(x / OCR_REF_WIDTH) * 100}%`,
                  top: `${(y / scaledHeight) * 100}%`,
                  width: `${(w / OCR_REF_WIDTH) * 100}%`,
                  height: `${(h / scaledHeight) * 100}%`,
                  fontSize: "12px",
                }}
              >
                {text || "…"}
              </div>
            );
          })}
        </div>
      )}
      <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs px-3 py-1 rounded-full z-10">
        {index + 1} / {totalPages}
      </div>
    </figure>
  );
}

function AiWarningDialog({
  open,
  targetLangLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  targetLangLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex-shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/40 p-2">
            <Bot className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-base leading-snug">
              AI-generated translation
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              The{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {targetLangLabel}
              </span>{" "}
              translation has <strong>not been verified by the author</strong>. It
              is machine-generated and may contain errors or inaccuracies.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-white"
            onClick={onConfirm}
          >
            Continue anyway
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChapterContent() {
  const { id } = useParams();
  const { toast } = useToast();

  // ── Chapter data ──────────────────────────────────────────────────────────
  const [chapterInfo, setChapterInfo] = useState<Omit<Chapter, "content"> | null>(null);
  const [originalContent, setOriginalContent] = useState<string | null>(null);
  const [finalContent, setFinalContent] = useState<string | null>(null);

  // ── Translation (text) ────────────────────────────────────────────────────
  const [translating, setTranslating] = useState(false);

  // ── Translation (image) ───────────────────────────────────────────────────
  const [selectedLang, setSelectedLang] = useState<LangOption>("");
  const [translationData, setTranslationData] = useState<PageTranslation[] | null>(null);
  const [loadingTranslation, setLoadingTranslation] = useState(false);

  // ── Language verification status ──────────────────────────────────────────
  const [verifiedLangs, setVerifiedLangs] = useState<Set<string>>(new Set());
  const [checkingLangs, setCheckingLangs] = useState(false);

  // ── Warning dialog ────────────────────────────────────────────────────────
  const [pendingLang, setPendingLang] = useState<LangOption | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [user, setUser] = useState<any | undefined>();
  const [mounted, setMounted] = useState(false);

  // ── Report ────────────────────────────────────────────────────────────────
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // ─── Effects ──────────────────────────────────────────────────────────────
  // ─── Computed languages for dropdown ─────────────────────────────────────
  const displayLanguages = useMemo(() => {
    if (chapterInfo?.type === "image") {
      // Truyện hình: CHỈ hiện ngôn ngữ có translation thật
      return LANG_OPTIONS.filter((lang) => verifiedLangs.has(lang.value));
    }
    // Truyện chữ: LUÔN hiện đầy đủ 6 ngôn ngữ (cho phép AI translate)
    return LANG_OPTIONS;
  }, [chapterInfo?.type, verifiedLangs]);

  // Ẩn/hiện dropdown theo đúng yêu cầu
  const shouldShowDropdown = useMemo(() => {
    if (!chapterInfo) return false;

    if (chapterInfo.type === "image") {
      // Truyện hình: chỉ hiện khi có ít nhất 1 ngôn ngữ có dịch
      return displayLanguages.length > 0;
    }
    // Truyện chữ: luôn hiện dropdown
    return true;
  }, [chapterInfo, displayLanguages.length]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const raw = Cookies.get("user_normal_info");
    if (raw) {
      try {
        setUser(JSON.parse(decodeURIComponent(raw)));
      } catch {
        // console.error("Invalid cookie data");
      }
    }
  }, [mounted]);

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
        toast({
          title: "Error",
          description: err?.response?.data?.message || err?.message || "Unable to load chapter content",
          variant: "destructive",
        });
      });
  }, [id, toast]);

  // Pre-fetch verification status for all 6 languages (read-only, never saves)
  const prefetchLanguageStatuses = useCallback(async () => {
    if (!id || !chapterInfo) return;
    setCheckingLangs(true);
    try {
      if (chapterInfo.type === "image") {
        // Single call — returns all bubble translations already baked in
        const res = await fetch("/api/getTranslation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chapterId: id }),
        });
        if (!res.ok) throw new Error("Translation fetch failed");
        const data = await res.json();
        const pages: PageTranslation[] = data.pages || [];
        const langs = new Set<string>();
        for (const page of pages) {
          for (const bubble of page.bubbles) {
            for (const t of bubble.translations) {
              if (t.text?.trim()) langs.add(t.language);
            }
          }
        }
        setVerifiedLangs(langs);
        setTranslationData(pages); // cache so no second fetch on lang change
      } else if (chapterInfo.type === "text") {
        // 6 parallel reads — none of these calls save anything
        const results = await Promise.allSettled(
          LANG_OPTIONS.map(async ({ value, label }) => {
            const res = await fetch("/api/get-novel-translation", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chapterId: id, target_language: label }),
            });
            const data = await res.json();
            // console.log(`Prefetch ${label}:`, data);
            return { code: value, cached: !!data.cached };
          })
        );
        const verified = new Set<string>();
        for (const r of results) {
          if (r.status === "fulfilled" && r.value.cached) verified.add(r.value.code);
        }
        setVerifiedLangs(verified);
      }
    } catch (err) {
      // console.error("Language status prefetch error:", err);
    } finally {
      setCheckingLangs(false);
    }
  }, [id, chapterInfo]);

  useEffect(() => {
    prefetchLanguageStatuses();
  }, [prefetchLanguageStatuses]);
  const handleTextTranslation = useCallback(
    async (lang: LangOption) => {
      if (!lang || !originalContent || !id) return;
      setTranslating(true);
      try {
        let translatedText = "";

        if (verifiedLangs.has(lang)) {
          // Read the saved verified translation — read-only GET, no write
          const res = await fetch("/api/get-novel-translation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chapterId: id,
              target_language: LANG_DISPLAY[lang],
            }),
          });
          const data = await res.json();
          translatedText = data.translated_text ?? "";
        } else {
          const res = await fetch("/api/fast-novel-translation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chapterId: id,
              text: stripHtml(originalContent),
              target_language: LANG_DISPLAY[lang],
              context: "",
            }),
          });
          const data = await res.json();
          translatedText = data.translated_text ?? data.text ?? "";
        }

        if (translatedText) {
          setFinalContent(translatedText);
        } else {
          toast({
            title: "Translation unavailable",
            description: "Could not retrieve translation. Please try again.",
            variant: "destructive",
          });
        }
      } catch (err) {
        // console.error("Translation error:", err);
        toast({
          title: "Translation failed",
          description: "An error occurred. Please try again.",
          variant: "destructive",
        });
      } finally {
        setTranslating(false);
      }
    },
    [id, originalContent, verifiedLangs, toast]
  );

  const fetchImageTranslations = useCallback(async () => {
    if (!id || chapterInfo?.type !== "image") return;
    if (translationData) return; // already loaded during prefetch
    setLoadingTranslation(true);
    try {
      const res = await fetch("/api/getTranslation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId: id }),
      });
      if (!res.ok) throw new Error("Error fetching translation");
      const data = await res.json();
      setTranslationData(data.pages || []);
    } catch {
      toast({
        title: "Error",
        description: "Could not load translation. Showing original text.",
        variant: "destructive",
      });
    } finally {
      setLoadingTranslation(false);
    }
  }, [id, chapterInfo?.type, translationData, toast]);

  // ─── Derived ──────────────────────────────────────────────────────────────

  const isTextChapter = !!originalContent;
  const isTranslated = isTextChapter && finalContent !== originalContent;
  const plainText = useMemo(
    () => (finalContent ? finalContent.replace(/<[^>]*>/g, "") : ""),
    [finalContent]
  );

  const getBubbleText = (bubble: Bubble): string => {
    if (!selectedLang) return bubble.original_text;
    const found = bubble.translations.find((t) => t.language === selectedLang);
    return found ? found.text : bubble.original_text;
  };

  const isOwnChapter =
    !!user?.user_id &&
    !!chapterInfo?.authorId &&
    String(user.user_id) === String(chapterInfo.authorId);

  // ─── Language selection flow ───────────────────────────────────────────────

  const applyLanguage = useCallback(
    (lang: LangOption) => {
      setSelectedLang(lang);
      if (lang === "") {
        setFinalContent(originalContent);
        return;
      }
      if (chapterInfo?.type === "text") {
        handleTextTranslation(lang);
      } else if (chapterInfo?.type === "image") {
        fetchImageTranslations();
      }
    },
    [chapterInfo?.type, originalContent, handleTextTranslation, fetchImageTranslations]
  );

  const handleLangChange = (newLang: LangOption) => {
    if (newLang === "" || verifiedLangs.has(newLang)) {
      // Verified or original — apply straight away, no warning
      applyLanguage(newLang);
    } else {
      // Unverified AI translation — ask first
      setPendingLang(newLang);
      setShowWarning(true);
    }
  };

  const handleWarningConfirm = () => {
    if (pendingLang) applyLanguage(pendingLang);
    setShowWarning(false);
    setPendingLang(null);
  };

  const handleWarningCancel = () => {
    setShowWarning(false);
    setPendingLang(null);
  };

  // ─── Report ───────────────────────────────────────────────────────────────

  const openReportDialog = () => {
    if (isOwnChapter) {
      toast({ title: "Action not allowed", description: "You cannot report your own chapter.", variant: "destructive" });
      return;
    }
    setReportDialogOpen(true);
  };

  const handleSubmitReport = async ({ reason, description }: { reason: string; description?: string }) => {
    if (!user) {
      toast({ title: "Not logged in", description: "Please log in to submit a report.", variant: "destructive" });
      return;
    }
    if (!chapterInfo?._id) {
      toast({ title: "Missing chapter information", description: "Chapter to report not found.", variant: "destructive" });
      return;
    }
    if (isOwnChapter) {
      toast({ title: "Action not allowed", description: "You cannot report your own chapter.", variant: "destructive" });
      return;
    }
    setIsSubmittingReport(true);
    try {
      await axios.post(
        `${API_BASE}/api/reports`,
        { target_type: "Chapter", target_id: chapterInfo._id, reason, description },
        { withCredentials: true }
      );
      toast({ title: "Report sent successfully", description: "Thank you for your feedback." });
      setReportDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Error sending report", description: err?.response?.data?.message || "Please try again later.", variant: "destructive" });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!chapterInfo) return <p className="text-center mt-10">Loading chapter...</p>;

  const createdAtText = chapterInfo.createdAt
    ? new Date(chapterInfo.createdAt).toLocaleString()
    : undefined;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <AiWarningDialog
        open={showWarning}
        targetLangLabel={pendingLang ? LANG_DISPLAY[pendingLang] : ""}
        onConfirm={handleWarningConfirm}
        onCancel={handleWarningCancel}
      />

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
        {!isOwnChapter && (
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
        )}
      </div>

      {/* Language selector với icon ShieldCheck */}
      {shouldShowDropdown && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-2xl px-6 py-5 w-full max-w-[900px] mx-auto mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Label + Select */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap text-base">
                Display language:
              </span>

              <Select
                value={selectedLang || "__original__"}
                onValueChange={(val) => {
                  const lang = val === "__original__" ? "" : (val as LangOption);
                  handleLangChange(lang);
                }}
              >
                <SelectTrigger className="flex-1 bg-transparent border-0 focus:ring-0 focus:ring-offset-0 h-11 text-lg font-medium text-gray-900 dark:text-white cursor-pointer">
                  <SelectValue placeholder="Original content" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="__original__" className="text-base">
                    📖 Original content
                  </SelectItem>

                  {displayLanguages.map(({ value, label }) => {
                    const isVerified = verifiedLangs.has(value);
                    return (
                      <SelectItem key={value} value={value} className="text-base">
                        <div className="flex items-center gap-2">
                          {isVerified ? (
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Bot className="w-4 h-4 text-amber-500" />
                          )}
                          <span>{label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Badge Verified / AI */}
            <div className="flex items-center gap-2 shrink-0">
              {(translating || loadingTranslation || checkingLangs) && (
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              )}

              {selectedLang && !translating && !loadingTranslation && (
                verifiedLangs.has(selectedLang) ? (
                  <div
                    title="This translation has been verified by the author"
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Verified by author
                  </div>
                ) : (
                  <div
                    title="AI-generated translation — not verified by the author"
                    className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-1.5"
                  >
                    <Bot className="w-4 h-4" />
                    AI-generated only
                  </div>
                )
              )}
            </div>
          </div>

          {/* Legend - tách riêng, đẹp hơn */}
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-6 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Verified by author</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-amber-500" />
              <span>AI-generated only</span>
            </div>
          </div>
        </div>
      )}


      {/* Content */}
      {chapterInfo.type === "text" ? (
        <>
          <TTSReader text={plainText} />
          <article
            id="chapter-content"
            className="prose prose-lg leading-relaxed text-justify dark:prose-invert mt-6"
            dangerouslySetInnerHTML={{ __html: finalContent || "" }}
          />
          {selectedLang !== "" && isTranslated && (
            <div className="mt-8 flex justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setFinalContent(originalContent);
                  setSelectedLang("");
                }}
              >
                ← View Original Content
              </Button>
            </div>
          )}
        </>
      ) : chapterInfo.type === "image" ? (
        <div id="chapter-content" className="flex flex-col items-center gap-0">
          {chapterInfo.images?.map((imgUrl, index) => {
            const pageData = translationData?.find((p) => p.pageOrder === index);
            const bubbles = pageData?.bubbles || [];
            return (
              <MangaPageWithBubbles
                key={index}
                imgSrc={`${API_BASE}${imgUrl}`}
                bubbles={bubbles}
                index={index}
                totalPages={chapterInfo.images?.length ?? 0}
                getBubbleText={getBubbleText}
                showOverlay={selectedLang !== ""}
              />
            );
          })}
          {chapterInfo.images?.length === 0 && (
            <p className="text-gray-500">No images in this chapter.</p>
          )}
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