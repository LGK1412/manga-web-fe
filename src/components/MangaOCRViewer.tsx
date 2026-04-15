"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Rnd } from "react-rnd";
import {
    ScanSearch,
    Type,
    Save,
    Sparkles,
    MousePointer2,
    ImagePlus,
    ArrowLeft,
    Loader2,
    ListOrdered,
    Trash2,
    ScanText,
    CheckCircle2,
    XCircle,
    AlertCircle,
    X
} from "lucide-react";
import { useParams } from 'next/navigation';
const API = "http://localhost:8000";

export interface Bubble {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    text: string;
    translations: Record<string, string>;
}

export interface ImageFile {
    id: string;
    preview: string;
    order: number;
}

// ── Toast system ──────────────────────────────────────────────
type ToastType = "success" | "error" | "info";

interface Toast {
    id: string;
    type: ToastType;
    message: string;
}

function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const show = useCallback((message: string, type: ToastType = "info") => {
        const id = `toast_${Date.now()}`;
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const dismiss = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return { toasts, show, dismiss };
}

const toastStyles: Record<ToastType, { bg: string; border: string; icon: React.ReactNode }> = {
    success: {
        bg: "bg-emerald-950",
        border: "border-emerald-600",
        icon: <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />,
    },
    error: {
        bg: "bg-red-950",
        border: "border-red-600",
        icon: <XCircle size={16} className="text-red-400 shrink-0" />,
    },
    info: {
        bg: "bg-gray-900",
        border: "border-gray-600",
        icon: <AlertCircle size={16} className="text-blue-400 shrink-0" />,
    },
};

function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
    return (
        <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => {
                const style = toastStyles[t.type];
                return (
                    <div
                        key={t.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl text-sm text-white max-w-xs pointer-events-auto
                            animate-in slide-in-from-right-4 fade-in duration-200
                            ${style.bg} ${style.border}`}
                    >
                        {style.icon}
                        <span className="flex-1 leading-snug">{t.message}</span>
                        <button
                            onClick={() => dismiss(t.id)}
                            className="text-white/50 hover:text-white/90 transition ml-1"
                        >
                            <X size={14} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
// ─────────────────────────────────────────────────────────────

interface MangaOCRModalProps {
    imageUrl?: string;
    chapterId?: string;
    chapterImages?: ImageFile[];
    initialBubbles?: Record<string, Bubble[]>;
    onClose: () => void;
    onSave?: (payload: any) => Promise<void>;
}

export default function MangaOCRModal({
    imageUrl,
    chapterId,
    chapterImages,
    initialBubbles = {},
    onClose,
    onSave
}: MangaOCRModalProps) {
    const { toasts, show: showToast, dismiss } = useToast();

    const images = useMemo(() => {
        if (chapterImages && chapterImages.length > 0) return chapterImages;
        if (imageUrl) return [{ id: "single", preview: imageUrl, order: 0 }];
        return [];
    }, [chapterImages, imageUrl]);

    const [imageFiles, setImageFiles] = useState<Record<string, File>>({});
    const [globalLanguage, setGlobalLanguage] = useState("vi");
    const params = useParams();

    const migratedBubbles = useMemo(() => {
        const result: Record<string, Bubble[]> = {};
        for (const [imgId, bubbleList] of Object.entries(initialBubbles)) {
            result[imgId] = bubbleList.map(b => ({
                ...b,
                translations: (b as any).translatedText
                    ? { [globalLanguage]: (b as any).translatedText, ...((b as any).translations || {}) }
                    : b.translations || {}
            }));
        }
        return result;
    }, [initialBubbles, globalLanguage]);

    const [bubbles, setBubbles] = useState<Record<string, Bubble[]>>(migratedBubbles);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"OCR" | "TRANSLATE">("OCR");
    const [processingItems, setProcessingItems] = useState<Record<string, boolean>>({});
    const [isSaving, setIsSaving] = useState(false);

    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingImageId, setDrawingImageId] = useState<string | null>(null);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [drawBox, setDrawBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

    useEffect(() => {
        images.forEach(async (img) => {
            try {
                const res = await fetch(img.preview);
                const blob = await res.blob();
                setImageFiles((prev) => ({
                    ...prev,
                    [img.id]: new File([blob], `page-${img.order}.jpg`),
                }));
            } catch (e) {
                console.error("Error loading image:", img.id);
            }
        });
    }, [images]);

    const selectedBubbleInfo = useMemo(() => {
        if (!selectedId) return null;
        for (const [imgId, pageBubbles] of Object.entries(bubbles)) {
            const found = pageBubbles.find(b => b.id === selectedId);
            if (found) return { imageId: imgId, bubble: found };
        }
        return null;
    }, [selectedId, bubbles]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Delete" || e.key === "Backspace") {
                const activeTag = document.activeElement?.tagName;
                if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;
                if (selectedBubbleInfo) {
                    const { imageId, bubble } = selectedBubbleInfo;
                    setBubbles((prev) => ({
                        ...prev,
                        [imageId]: prev[imageId].filter((b) => b.id !== bubble.id),
                    }));
                    setSelectedId(null);
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedBubbleInfo]);

    const updateBubble = (imageId: string, bubbleId: string, updates: Partial<Bubble>) => {
        setBubbles((prev) => ({
            ...prev,
            [imageId]: (prev[imageId] || []).map((b) => (b.id === bubbleId ? { ...b, ...updates } : b)),
        }));
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, imageId: string) => {
        const container = e.currentTarget;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setIsDrawing(true);
        setDrawingImageId(imageId);
        setStartPos({ x, y });
        setDrawBox({ x, y, w: 0, h: 0 });
        setSelectedId(null);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, imageId: string) => {
        if (!isDrawing || drawingImageId !== imageId) return;
        const container = e.currentTarget;
        const rect = container.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        setDrawBox({
            x: Math.min(startPos.x, currentX),
            y: Math.min(startPos.y, currentY),
            w: Math.abs(currentX - startPos.x),
            h: Math.abs(currentY - startPos.y),
        });
    };

    const handleMouseUp = async (imageId: string) => {
        if (!isDrawing || drawingImageId !== imageId) return;
        setIsDrawing(false);
        setDrawingImageId(null);
        if (drawBox && drawBox.w > 15 && drawBox.h > 15) {
            const newBubble: Bubble = {
                id: `manual_${Date.now()}`,
                ...drawBox,
                text: "Scanning OCR...",
                translations: {},
            };
            setBubbles((prev) => ({
                ...prev,
                [imageId]: [...(prev[imageId] || []), newBubble]
            }));
            setSelectedId(newBubble.id);
            setActiveTab("OCR");
            await handleManualOcr(imageId, newBubble);
        }
        setDrawBox(null);
    };

    useEffect(() => {
        if (selectedId && activeTab === "OCR") {
            const element = document.getElementById(`sidebar-bubble-${selectedId}`);
            if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }
    }, [selectedId, activeTab]);

    const handleAutoDetect = async (imageId: string) => {
        const file = imageFiles[imageId];
        if (!file) {
            showToast("Image not loaded yet. Please wait and try again.", "error");
            return;
        }
        setProcessingItems(prev => ({ ...prev, [`detect_${imageId}`]: true }));
        try {
            const form = new FormData();
            form.append("file", file);
            form.append("client_w", String(900));
            const res = await fetch(`${API}/detect`, { method: "POST", body: form });
            const data = await res.json();
            if (data.bubbles) {
                const sortedBubbles = data.bubbles.sort((a: any, b: any) => a.y - b.y);
                const formatted = sortedBubbles.map((b: any, i: number) => ({
                    id: `bubble_${Date.now()}_${i}`,
                    x: b.x, y: b.y, w: b.w, h: b.h,
                    text: b.text || "",
                    translations: {},
                }));
                setBubbles((prev) => ({ ...prev, [imageId]: formatted }));
                showToast(`Detected ${formatted.length} bubble${formatted.length !== 1 ? "s" : ""}.`, "success");
            } else {
                showToast("No bubbles detected in this image.", "info");
            }
        } catch (e) {
            showToast("Could not reach the detection API. Is the server running?", "error");
        } finally {
            setProcessingItems(prev => ({ ...prev, [`detect_${imageId}`]: false }));
        }
    };

    const handleManualOcr = async (imageId: string, bubble: Bubble) => {
        const file = imageFiles[imageId];
        if (!file) return;
        setProcessingItems(prev => ({ ...prev, [`ocr_${bubble.id}`]: true }));
        try {
            const form = new FormData();
            form.append("file", file);
            form.append("x", String(bubble.x)); form.append("y", String(bubble.y));
            form.append("w", String(bubble.w)); form.append("h", String(bubble.h));
            form.append("client_w", String(900));
            const res = await fetch(`${API}/ocr`, { method: "POST", body: form });
            const data = await res.json();
            if (data.text) {
                updateBubble(imageId, bubble.id, { text: data.text });
            } else {
                updateBubble(imageId, bubble.id, { text: "Could not recognize text" });
            }
        } catch (e) {
            console.error(e);
            updateBubble(imageId, bubble.id, { text: "API connection error" });
            showToast("OCR failed — could not connect to the API.", "error");
        } finally {
            setProcessingItems(prev => ({ ...prev, [`ocr_${bubble.id}`]: false }));
        }
    };

    const handleTranslateAll = async () => {
        setProcessingItems(prev => ({ ...prev, translateAll: true }));
        try {
            const allBubblesToTranslate: { id: string; text: string }[] = [];
            for (const imgId in bubbles) {
                const valid = bubbles[imgId]
                    .filter(b => b.text && !b.text.trim().startsWith("❌"))
                    .map(b => ({ id: b.id, text: b.text }));
                allBubblesToTranslate.push(...valid);
            }
            if (allBubblesToTranslate.length === 0) {
                showToast("No bubbles with text to translate.", "info");
                return;
            }

            let successCount = 0;
            let errorCount = 0;

            for (const item of allBubblesToTranslate) {
                try {
                    const response = await fetch("/api/fastTranslation", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            text: item.text,
                            target_language: globalLanguage,
                        }),
                    });
                    if (!response.ok) { errorCount++; continue; }
                    const data = await response.json();
                    const translatedText = data.translation_text || data.text;
                    if (translatedText) {
                        setBubbles((prevBubbles) => {
                            const nextState = { ...prevBubbles };
                            for (const imgId in nextState) {
                                nextState[imgId] = nextState[imgId].map(b =>
                                    b.id === item.id
                                        ? { ...b, translations: { ...b.translations, [globalLanguage]: translatedText } }
                                        : b
                                );
                            }
                            return nextState;
                        });
                        successCount++;
                    }
                } catch (err) {
                    console.error(`Bubble error ${item.id}:`, err);
                    errorCount++;
                }
            }

            if (errorCount === 0) {
                showToast(`All ${successCount} translations completed!`, "success");
            } else if (successCount > 0) {
                showToast(`${successCount} translated, ${errorCount} failed.`, "info");
            } else {
                showToast("Translation failed. Check your API connection.", "error");
            }
        } catch (error: any) {
            console.error("Translation error:", error);
            showToast("An error occurred while translating.", "error");
        } finally {
            setProcessingItems(prev => ({ ...prev, translateAll: false }));
        }
    };

    const handleSaveData = async () => {
        const payload = {
            chapterId: chapterId,
            pages: [...images]
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((img) => ({
                    pageOrder: img.order,
                    bubbles: (bubbles[img.id] || []).map((b) => ({
                        box_id: b.id,
                        coordinates: {
                            x: Math.round(b.x ?? 0),
                            y: Math.round(b.y ?? 0),
                            w: Math.round(b.w ?? 0),
                            h: Math.round(b.h ?? 0),
                        },
                        original_text: (b.text ?? "").trim(),
                        translations: Object.entries(b.translations || {}).map(([language, text]) => ({
                            language,
                            text: String(text || "").trim()
                        }))
                    }))
                }))
        };

        try {
            setIsSaving(true);
            const response = await fetch('/api/saveTranslation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Error saving data');
            }
            console.log("✅ Response from n8n:", data);
            showToast("Data saved successfully!", "success");
        } catch (error) {
            console.error("Error saving data:", error);
            showToast("Error occurred while saving. Please try again.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const allBubblesFlat = useMemo(() => {
        return images.flatMap(img =>
            (bubbles[img.id] || []).map(b => ({ ...b, imageId: img.id, imageOrder: img.order }))
        );
    }, [bubbles, images]);

    return (
        <div className="fixed inset-0 z-[9999] bg-gray-100 flex overflow-hidden font-sans">

            {/* Toast notifications */}
            <ToastContainer toasts={toasts} dismiss={dismiss} />

            {/* ================= LEFT SIDEBAR ================= */}
            <div className="w-[400px] bg-white border-r shadow-2xl flex flex-col z-20">
                <div className="p-4 bg-gray-900 text-white flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="hover:text-gray-300"><ArrowLeft size={20} /></button>
                        <span className="font-bold text-lg truncate">Manga OCR</span>
                    </div>
                    <button
                        onClick={handleSaveData}
                        disabled={isSaving}
                        className="bg-emerald-600 px-3 py-1.5 rounded text-sm font-bold flex items-center gap-2 hover:bg-emerald-500 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {isSaving ? "Saving..." : "Save Data"}
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b bg-gray-50 text-sm shrink-0">
                    <button
                        className={`flex-1 py-3 flex items-center justify-center gap-2 font-semibold ${activeTab === "OCR" ? "border-b-2 border-blue-600 text-blue-600 bg-white" : "text-gray-500"}`}
                        onClick={() => setActiveTab("OCR")}
                    >
                        <Type size={16} /> Selected Frame
                    </button>
                    <button
                        className={`flex-1 py-3 flex items-center justify-center gap-2 font-semibold ${activeTab === "TRANSLATE" ? "border-b-2 border-blue-600 text-blue-600 bg-white" : "text-gray-500"}`}
                        onClick={() => setActiveTab("TRANSLATE")}
                    >
                        <ListOrdered size={16} /> All Translations ({allBubblesFlat.length})
                    </button>
                </div>

                {/* Sidebar Content */}
                <div className="flex-1 overflow-y-auto bg-white">

                    {activeTab === "OCR" && (
                        <div className="p-4 space-y-4">
                            <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded border border-blue-100 flex items-start gap-2 shrink-0">
                                <MousePointer2 size={16} className="shrink-0" />
                                <span>Scroll to view images. Drag mouse on image to create new frame (will auto OCR). Press Delete to remove.</span>
                            </div>

                            <div className="space-y-4 flex-1 pb-10">
                                {allBubblesFlat.length === 0 && <p className="text-center text-gray-400 mt-4">No frames yet.</p>}

                                {images.map((img) => {
                                    const pageBubbles = bubbles[img.id] || [];
                                    if (pageBubbles.length === 0) return null;
                                    return (
                                        <div key={`ocr_group_${img.id}`} className="space-y-3">
                                            <div className="sticky top-0 bg-white py-1 text-sm font-bold text-gray-800 border-b border-gray-200 z-10">
                                                --- Page {img.order + 1} ---
                                            </div>
                                            {pageBubbles.map((b, idx) => (
                                                <div
                                                    key={b.id}
                                                    id={`sidebar-bubble-${b.id}`}
                                                    onClick={() => {
                                                        setSelectedId(b.id);
                                                        document.getElementById(`page-${img.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    }}
                                                    className={`border p-3 rounded-lg transition-all cursor-pointer ${selectedId === b.id ? "border-blue-500 ring-2 ring-blue-500 bg-blue-50/50" : "hover:border-gray-400 bg-white"}`}
                                                >
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-semibold text-gray-600">Frame #{idx + 1}</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setBubbles((prev) => ({
                                                                    ...prev,
                                                                    [img.id]: prev[img.id].filter((bubble) => bubble.id !== b.id)
                                                                }));
                                                                if (selectedId === b.id) setSelectedId(null);
                                                            }}
                                                            className="text-red-500 hover:bg-red-100 p-1.5 rounded transition"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                    <textarea
                                                        className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y bg-white"
                                                        rows={3}
                                                        value={b.text}
                                                        onChange={(e) => updateBubble(img.id, b.id, { text: e.target.value })}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleManualOcr(img.id, b);
                                                        }}
                                                        disabled={processingItems[`ocr_${b.id}`]}
                                                        className="mt-2 w-full bg-gray-800 text-white text-xs py-2 rounded flex items-center justify-center gap-2 hover:bg-gray-700 transition disabled:opacity-50"
                                                    >
                                                        {processingItems[`ocr_${b.id}`] ? <Loader2 size={14} className="animate-spin" /> : <ScanSearch size={14} />}
                                                        Rescan this frame
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === "TRANSLATE" && (
                        <div className="p-4 flex flex-col h-full">
                            <div className="bg-gray-50 p-3 rounded-lg border mb-4 space-y-3 shrink-0">
                                <div>
                                    <label className="font-bold text-sm text-gray-700">Target language:</label>
                                    <select
                                        className="w-full p-2 border rounded mt-1 bg-white outline-none focus:border-blue-500"
                                        value={globalLanguage}
                                        onChange={(e) => setGlobalLanguage(e.target.value)}
                                    >
                                        <option value="vi">🇻🇳 Vietnamese</option>
                                        <option value="en">EN English</option>
                                        <option value="ja">JP Japanese</option>
                                        <option value="ko">KR Korean</option>
                                        <option value="zh">CN Chinese</option>
                                        <option value="es">ES Spanish</option>
                                        <option value="fr">FR French</option>
                                    </select>
                                </div>
                                <button
                                    onClick={handleTranslateAll}
                                    disabled={processingItems.translateAll || allBubblesFlat.length === 0}
                                    className="w-full bg-blue-600 text-white py-2 rounded flex items-center justify-center gap-2 hover:bg-blue-700 font-bold transition disabled:opacity-50"
                                >
                                    {processingItems.translateAll ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                    Translate all with AI
                                </button>
                            </div>

                            <div className="space-y-4 flex-1">
                                {allBubblesFlat.length === 0 && <p className="text-center text-gray-400 mt-4">No frames yet.</p>}
                                {images.map((img) => {
                                    const pageBubbles = bubbles[img.id] || [];
                                    if (pageBubbles.length === 0) return null;
                                    return (
                                        <div key={`group_${img.id}`} className="space-y-3">
                                            <div className="sticky top-0 bg-white py-1 text-sm font-bold text-gray-800 border-b border-gray-200 z-10">
                                                --- Page {img.order + 1} ---
                                            </div>
                                            {pageBubbles.map((b, idx) => (
                                                <div key={b.id}
                                                    className={`border rounded-lg p-3 space-y-2 transition-all cursor-pointer ${selectedId === b.id ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/30' : 'hover:border-gray-400'}`}
                                                    onClick={() => {
                                                        setSelectedId(b.id);
                                                        document.getElementById(`page-${img.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    }}
                                                >
                                                    <div className="text-xs text-gray-500 font-semibold mb-1">Frame #{idx + 1}</div>
                                                    <div>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Original</span>
                                                        <textarea
                                                            className="w-full text-sm p-2 border rounded bg-gray-50 focus:bg-white outline-none resize-y"
                                                            rows={2}
                                                            value={b.text}
                                                            onChange={(e) => updateBubble(img.id, b.id, { text: e.target.value })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-bold text-blue-400 uppercase">Translation ({globalLanguage})</span>
                                                        <textarea
                                                            className="w-full text-sm p-2 border rounded border-blue-200 bg-blue-50/50 focus:bg-white outline-none resize-y"
                                                            rows={2}
                                                            value={b.translations[globalLanguage] ?? ""}
                                                            onChange={(e) => updateBubble(img.id, b.id, { translations: { ...b.translations, [globalLanguage]: e.target.value } })}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ================= MAIN CONTENT ================= */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#16161c] flex flex-col items-center pb-32">
                {images.length > 0 ? (
                    images.map((img, index) => {
                        const pageBubbles = bubbles[img.id] || [];
                        const isDetecting = processingItems[`detect_${img.id}`];
                        return (
                            <div key={img.id} className="relative flex justify-center w-full">
                                <div className="relative w-[900px] shrink-0 bg-white">
                                    <div className="absolute top-4 -left-[140px] w-[120px] flex flex-col gap-2 z-20 bg-gray-900 p-3 rounded-lg border border-gray-700 shadow-xl">
                                        <span className="font-bold text-sm text-white border-b border-gray-700 pb-2 text-center">
                                            Trang {index + 1}
                                        </span>
                                        <button
                                            onClick={() => handleAutoDetect(img.id)}
                                            disabled={isDetecting}
                                            className="bg-violet-600/80 hover:bg-violet-600 text-white text-xs py-2 rounded flex flex-col items-center gap-1 transition disabled:opacity-50"
                                        >
                                            {isDetecting ? <Loader2 size={16} className="animate-spin" /> : <ScanText size={16} />}
                                            Auto Detect
                                        </button>
                                    </div>

                                    <div
                                        id={`page-${img.id}`}
                                        className="relative cursor-crosshair w-full"
                                        style={{ display: "block" }}
                                        onMouseDown={(e) => handleMouseDown(e, img.id)}
                                        onMouseMove={(e) => handleMouseMove(e, img.id)}
                                        onMouseUp={() => handleMouseUp(img.id)}
                                        onMouseLeave={() => handleMouseUp(img.id)}
                                    >
                                        <img
                                            src={img.preview}
                                            alt={`Manga page ${index + 1}`}
                                            draggable={false}
                                            className="w-full block"
                                        />
                                        <div className="absolute inset-0 z-0 pointer-events-auto"></div>

                                        {pageBubbles.map((bubble) => {
                                            const isOcrProcessing = processingItems[`ocr_${bubble.id}`];
                                            return (
                                                <Rnd
                                                    key={bubble.id}
                                                    size={{ width: bubble.w, height: bubble.h }}
                                                    position={{ x: bubble.x, y: bubble.y }}
                                                    onDragStop={(e, d) => updateBubble(img.id, bubble.id, { x: d.x, y: d.y })}
                                                    onResizeStop={(e, direction, ref, delta, position) => {
                                                        updateBubble(img.id, bubble.id, {
                                                            x: position.x, y: position.y,
                                                            w: parseFloat(ref.style.width), h: parseFloat(ref.style.height),
                                                        });
                                                    }}
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedId(bubble.id);
                                                        setActiveTab("OCR");
                                                    }}
                                                    bounds="parent"
                                                    className={`border-2 absolute transition-colors z-10 ${selectedId === bubble.id
                                                        ? "border-blue-500 bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.5)] cursor-move"
                                                        : "border-red-500 bg-red-500/10 hover:border-yellow-400 cursor-pointer"
                                                        }`}
                                                >
                                                    <div className="absolute -top-6 left-0 flex gap-1 bg-black/80 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded border border-white/20 whitespace-nowrap max-w-[200px] overflow-hidden">
                                                        {isOcrProcessing && <Loader2 size={12} className="animate-spin text-blue-400" />}
                                                        <span>{bubble.text ? bubble.text.substring(0, 20) + "..." : "Empty"}</span>
                                                    </div>
                                                </Rnd>
                                            );
                                        })}

                                        {isDrawing && drawingImageId === img.id && drawBox && (
                                            <div
                                                className="absolute border-2 border-dashed border-blue-400 bg-blue-400/20 pointer-events-none z-20"
                                                style={{ left: drawBox.x, top: drawBox.y, width: drawBox.w, height: drawBox.h }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-gray-500 flex flex-col items-center justify-center h-full gap-4 mt-20">
                        <ImagePlus size={80} className="opacity-20" />
                        <p>No images uploaded yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}