"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import {
    Loader2,
    Save,
    Languages,
    Globe,
    Copy,
    AlertCircle,
    X,
    Check,
    ChevronRight,
    RefreshCw,
    Wand2,
    PenLine,
    DatabaseZap,
} from "lucide-react";

interface AITranslatorProps {
    content: string;
    chapterId: string;
    onApply?: (translatedText: string) => void;
    onClose: () => void;
}

interface TranslationResult {
    translated_text: string;
    quality_score: number;
    quality_reason: string;
    isLoaded: boolean;
    cached: boolean;
}

const PRESET_LANGUAGES = [
    { id: "Vietnamese", label: "Vietnamese", flag: "🇻🇳" },
    { id: "English", label: "English", flag: "🇺🇸" },
    { id: "Japanese", label: "Japanese", flag: "🇯🇵" },
    { id: "Chinese", label: "Chinese", flag: "🇨🇳" },
    { id: "French", label: "French", flag: "🇫🇷" },
    { id: "Spanish", label: "Spanish", flag: "🇪🇸" },
];

function stripHtml(html: string) {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function countWords(text: string) {
    return stripHtml(text).split(/\s+/).filter(Boolean).length;
}

function QualityBadge({ score }: { score: number }) {
    const cfg =
        score >= 80
            ? { label: "Excellent", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" }
            : score >= 50
                ? { label: "Good", cls: "bg-amber-50 text-amber-700 border-amber-200" }
                : { label: "Needs Review", cls: "bg-red-50 text-red-700 border-red-200" };
    return (
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
            {score}/100 · {cfg.label}
        </span>
    );
}

const EMPTY_RESULT: TranslationResult = {
    translated_text: "",
    quality_score: 0,
    quality_reason: "",
    isLoaded: false,
    cached: false,
};

export default function AITranslator({
    content,
    chapterId,
    onApply,
    onClose,
}: AITranslatorProps) {
    const [selectedLanguage, setSelectedLanguage] = useState("Vietnamese");
    const [customLanguage, setCustomLanguage] = useState("");
    const [isCustomMode, setIsCustomMode] = useState(false);

    // Three distinct loading states
    const [isFetching, setIsFetching] = useState(false); // get-novel-translation
    const [isTranslating, setIsTranslating] = useState(false); // fast-novel-translation
    const [isSaving, setIsSaving] = useState(false); // save-novel-translation

    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [hasManualInput, setHasManualInput] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const translationEditableRef = useRef<HTMLDivElement>(null);

    const [result, setResult] = useState<TranslationResult>(EMPTY_RESULT);

    const finalLanguage = isCustomMode ? customLanguage.trim() : selectedLanguage;

    // ── Push translation text into the editable div ──────────────────
    useEffect(() => {
        if (result.isLoaded && translationEditableRef.current) {
            translationEditableRef.current.innerHTML = result.translated_text;
        }
    }, [result.translated_text, result.isLoaded]);

    // ── Auto-fetch cached translation when language changes ──────────
    const fetchCached = useCallback(async (lang: string) => {
        if (!lang || !chapterId) return;
        setIsFetching(true);
        setError(null);
        setSaveSuccess(false);
        setHasManualInput(false);
        setResult(EMPTY_RESULT);
        if (translationEditableRef.current) {
            translationEditableRef.current.innerHTML = "";
        }

        try {
            const res = await axios.post("/api/get-novel-translation", {
                chapterId,
                target_language: lang,
            });

            const data = res.data;
            const item = Array.isArray(data) ? data[0] ?? {} : data;

            if (item.cached && item.translated_text) {
                setResult({
                    translated_text: item.translated_text,
                    quality_score: item.quality_score ?? 0,
                    quality_reason: item.quality_reason ?? "",
                    isLoaded: true,
                    cached: true,
                });
            }
            // If no cache — leave panel empty so user can translate fresh
        } catch {
            // Silently ignore — cache miss is not an error the user needs to see
        } finally {
            setIsFetching(false);
        }
    }, [chapterId]);

    // Trigger fetch on mount and whenever language selection changes
    useEffect(() => {
        fetchCached(finalLanguage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [finalLanguage]);

    // ── Translate ────────────────────────────────────────────────────
    const handleTranslate = async () => {
        if (!finalLanguage) {
            setError("Please select or enter a target language.");
            return;
        }
        if (!content) return;

        setIsTranslating(true);
        setError(null);
        setSaveSuccess(false);

        try {
            const res = await axios.post("/api/fast-novel-translation", {
                chapterId,
                text: stripHtml(content), // send plain text to AI
                target_language: finalLanguage,
                context: "",                 // extend here if you have series notes
            });

            const data = res.data;
            const item = Array.isArray(data) ? data[0] ?? {} : data;

            setResult({
                translated_text: item.translated_text ?? item.text ?? "No translation returned.",
                quality_score: item.quality_score ?? 0,
                quality_reason: item.quality_reason ?? "",
                isLoaded: true,
                cached: false,
            });
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message ?? "Translation failed. Please try again.");
            } else {
                setError("An unexpected error occurred.");
            }
        } finally {
            setIsTranslating(false);
        }
    };

    // ── Save then Apply ──────────────────────────────────────────────
    const handleApply = async () => {
        const finalHtml = translationEditableRef.current?.innerHTML || result.translated_text;
        if (!finalHtml.trim()) return;

        setIsSaving(true);
        setError(null);
        setSaveSuccess(false);

        try {
            await axios.post("/api/save-novel-translation", {
                chapterId,
                original_text: content,
                translated_text: finalHtml,
                target_language: finalLanguage,
            });
            setSaveSuccess(true);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message ?? "Failed to save translation.");
            } else {
                setError("Failed to save translation.");
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopy = async () => {
        const text = translationEditableRef.current?.innerText || stripHtml(result.translated_text);
        if (!text) return;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleLanguageSelect = (langId: string) => {
        setIsCustomMode(false);
        setSelectedLanguage(langId);
    };

    const isLoading = isFetching || isTranslating || isSaving;
    const originalWords = countWords(content);

    const loadingLabel = isFetching
        ? `Loading cached translation…`
        : isTranslating
            ? `Translating to ${finalLanguage}…`
            : "Saving…";

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal */}
            <div
                className="relative flex flex-col w-full sm:max-w-6xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
                style={{ height: "88vh", maxHeight: "88vh" }}
            >
                {/* ── HEADER ── */}
                <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                            <Languages className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 id="modal-title" className="text-sm font-bold text-slate-900 leading-none">
                                AI Translation Assistant
                            </h2>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                Auto-translate with AI · Edit freely anytime
                            </p>
                        </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                        <span className="font-medium text-slate-600">Source</span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                        <span className="font-bold text-blue-600">{finalLanguage || "—"}</span>
                        {result.cached && (
                            <span className="flex items-center gap-1 ml-1 text-emerald-600 font-semibold">
                                <DatabaseZap className="w-3 h-3" />
                                Cached
                            </span>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Close modal"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* ── LANGUAGE SELECTOR STRIP ── */}
                <div className="flex-shrink-0 flex items-center gap-2 px-6 py-3 border-b border-slate-100 bg-slate-50 overflow-x-auto no-scrollbar">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        Target:
                    </span>
                    {PRESET_LANGUAGES.map((lang) => {
                        const active = !isCustomMode && selectedLanguage === lang.id;
                        return (
                            <button
                                key={lang.id}
                                onClick={() => handleLanguageSelect(lang.id)}
                                disabled={isLoading}
                                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border disabled:opacity-50 ${active
                                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                                    }`}
                            >
                                <span className="text-sm leading-none">{lang.flag}</span>
                                {lang.label}
                            </button>
                        );
                    })}

                    <button
                        onClick={() => setIsCustomMode(true)}
                        disabled={isLoading}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border disabled:opacity-50 ${isCustomMode
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white text-slate-500 border-dashed border-slate-300 hover:border-blue-300 hover:text-blue-600"
                            }`}
                    >
                        <Globe className="w-3 h-3" />
                        Custom
                    </button>

                    {isCustomMode && (
                        <input
                            type="text"
                            placeholder="e.g. Thai"
                            value={customLanguage}
                            onChange={(e) => setCustomLanguage(e.target.value)}
                            onBlur={() => {
                                if (customLanguage.trim()) fetchCached(customLanguage.trim());
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && customLanguage.trim()) {
                                    fetchCached(customLanguage.trim());
                                }
                            }}
                            autoFocus
                            className="flex-shrink-0 px-3 py-1.5 text-xs border border-blue-300 rounded-full outline-none focus:ring-2 focus:ring-blue-100 text-slate-800 placeholder-slate-400 w-32 sm:w-48 bg-white transition-all"
                        />
                    )}
                </div>

                {/* ── DUAL PANEL EDITORS ── */}
                <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 overflow-hidden min-h-0 lg:divide-x divide-y lg:divide-y-0 divide-slate-100">

                    {/* LEFT: Original — read-only */}
                    <div className="flex flex-col overflow-hidden h-1/2 lg:h-full">
                        <div className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 bg-slate-50 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-slate-400 rounded-full" />
                                <span className="text-xs font-semibold text-slate-600">Original</span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded font-medium">
                                    READ ONLY
                                </span>
                            </div>
                            <span className="text-[11px] text-slate-400">{originalWords} words</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 text-sm text-slate-700 leading-7 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                            {content ? (
                                <div dangerouslySetInnerHTML={{ __html: content }} />
                            ) : (
                                <p className="text-slate-400 italic">No content to translate.</p>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Translation — always editable */}
                    <div className="flex flex-col overflow-hidden h-1/2 lg:h-full relative">
                        <div className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 bg-blue-50 border-b border-blue-100">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-blue-500 rounded-full" />
                                <span className="text-xs font-semibold text-slate-700">
                                    {finalLanguage || "Translation"}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium flex items-center gap-1">
                                    <PenLine className="w-2.5 h-2.5" />
                                    EDITABLE
                                </span>
                                {result.cached && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium flex items-center gap-1">
                                        <DatabaseZap className="w-2.5 h-2.5" />
                                        FROM CACHE
                                    </span>
                                )}
                            </div>
                            {result.isLoaded && result.quality_score > 0 && (
                                <QualityBadge score={result.quality_score} />
                            )}
                        </div>

                        <div className="relative flex-1 overflow-hidden">
                            {/* Loading overlay — shared by all 3 states */}
                            {isLoading && (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm gap-3 animate-in fade-in">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-inner">
                                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-semibold text-slate-700">{loadingLabel}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {isTranslating ? "AI is working on your text" : "Please wait…"}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div
                                ref={translationEditableRef}
                                contentEditable
                                suppressContentEditableWarning
                                onInput={(e) =>
                                    setHasManualInput(
                                        (e.currentTarget.textContent?.trim().length ?? 0) > 0
                                    )
                                }
                                className="h-full overflow-y-auto p-5 text-sm text-slate-800 leading-7 outline-none scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent focus:ring-inset focus:ring-2 focus:ring-blue-50"
                                style={{ caretColor: "#2563eb", minHeight: "100%" }}
                            />

                            {!result.isLoaded && !isLoading && !hasManualInput && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-3 px-10 text-center bg-white/50 backdrop-blur-[1px]">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                                        <Wand2 className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <p className="text-sm text-slate-400 leading-relaxed">
                                        Click{" "}
                                        <span className="font-semibold text-blue-500">AI Translate</span>{" "}
                                        below to auto-fill, or start typing your own translation.
                                    </p>
                                </div>
                            )}
                        </div>

                        {result.isLoaded && result.quality_reason && (
                            <div className="flex-shrink-0 px-5 py-2 border-t border-blue-100 bg-blue-50/50">
                                <p className="text-[11px] text-slate-600">
                                    <span className="font-semibold text-slate-800">AI note:</span>{" "}
                                    {result.quality_reason}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── ERROR ── */}
                {error && (
                    <div className="flex-shrink-0 mx-6 mt-3 mb-1 animate-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 shadow-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span className="flex-1 font-medium">{error}</span>
                            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* ── SAVE SUCCESS TOAST ── */}
                {saveSuccess && (
                    <div className="flex-shrink-0 mx-6 mt-3 mb-1 animate-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 shadow-sm">
                            <Check className="w-4 h-4 flex-shrink-0" />
                            <span className="flex-1 font-medium">
                                Saved to database & applied to chapter!
                            </span>
                        </div>
                    </div>
                )}

                <div className="flex-shrink-0 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-white">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200"
                    >
                        Cancel
                    </button>

                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                        {/* Copy */}
                        <button
                            onClick={handleCopy}
                            disabled={!result.isLoaded && !hasManualInput}
                            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 transition-all focus:outline-none focus:ring-2 focus:ring-slate-200"
                        >
                            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                            {copied ? "Copied!" : "Copy Text"}
                        </button>
                        <button
                            onClick={handleTranslate}
                            disabled={isLoading || !content}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                        >
                            {isTranslating
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : result.isLoaded
                                    ? <RefreshCw className="w-4 h-4" />
                                    : <Wand2 className="w-4 h-4" />
                            }
                            {isTranslating
                                ? "Translating…"
                                : result.isLoaded
                                    ? "Re-translate"
                                    : "AI Translate"
                            }
                        </button>
                        <button
                            onClick={handleApply}
                            disabled={isLoading || (!result.isLoaded && !hasManualInput)}
                            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
                        >
                            {isSaving
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Save className="w-4 h-4" />
                            }
                            {isSaving ? "Saving…" : "Save Translation"}
                        </button>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}