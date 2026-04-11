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
    ScanText
} from "lucide-react";
import { useParams } from 'next/navigation';
const API = "http://localhost:8000";
import { Content } from "@radix-ui/react-dialog";

export interface Bubble {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    text: string;
    translations: Record<string, string>; // Translation by language, e.g. {"vi": "...", "en": "..."}
}

export interface ImageFile {
    id: string;
    preview: string;
    order: number;
}

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
    const images = useMemo(() => {
        if (chapterImages && chapterImages.length > 0) return chapterImages;
        if (imageUrl) return [{ id: "single", preview: imageUrl, order: 0 }];
        return [];
    }, [chapterImages, imageUrl]);

    const [imageFiles, setImageFiles] = useState<Record<string, File>>({});
    const [globalLanguage, setGlobalLanguage] = useState("vi");
    const params = useParams();
    // Migration: chuyển initialBubbles từ translatedText -> translations
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

    // STATE: Select current frame (Save as string ID, because generated ID is unique)
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<"OCR" | "TRANSLATE">("OCR");
    const [processingItems, setProcessingItems] = useState<Record<string, boolean>>({});
    const [isSaving, setIsSaving] = useState(false);

    // STATE: Mouse drag & drop to draw
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingImageId, setDrawingImageId] = useState<string | null>(null);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [drawBox, setDrawBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

    // --- 1. LOAD IMAGE AS FILE TO SEND API ---
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

    // --- 2. FIND WHICH IMAGE THE SELECTED FRAME BELONGS TO ---
    const selectedBubbleInfo = useMemo(() => {
        if (!selectedId) return null;
        for (const [imgId, pageBubbles] of Object.entries(bubbles)) {
            const found = pageBubbles.find(b => b.id === selectedId);
            if (found) return { imageId: imgId, bubble: found };
        }
        return null;
    }, [selectedId, bubbles]);

    // --- 3. KEYBOARD SHORTCUT DELETE FRAME ---
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

    // --- 4. UPDATE 1 BUBBLE ---
    const updateBubble = (imageId: string, bubbleId: string, updates: Partial<Bubble>) => {
        setBubbles((prev) => ({
            ...prev,
            [imageId]: (prev[imageId] || []).map((b) => (b.id === bubbleId ? { ...b, ...updates } : b)),
        }));
    };

    // --- 5. MOUSE DRAG LOGIC TO CREATE FRAME ---
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
                translations: {}, // Initialize empty object,
            };

            // Update UI immediately
            setBubbles((prev) => ({
                ...prev,
                [imageId]: [...(prev[imageId] || []), newBubble]
            }));
            setSelectedId(newBubble.id);
            setActiveTab("OCR");

            // Call OCR API for the drawn frame
            await handleManualOcr(imageId, newBubble);
        }
        setDrawBox(null);
    };
    // --- 7. AUTO-SCROLL LIST WHEN SELECT FRAME ON IMAGE ---
    useEffect(() => {
        if (selectedId && activeTab === "OCR") {
            const element = document.getElementById(`sidebar-bubble-${selectedId}`);
            if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }
    }, [selectedId, activeTab]);
    // --- 6. CALL API ---
    const handleAutoDetect = async (imageId: string) => {
        const file = imageFiles[imageId];
        if (!file) return alert("Image not loaded yet!");

        setProcessingItems(prev => ({ ...prev, [`detect_${imageId}`]: true }));
        try {
            const form = new FormData();
            form.append("file", file);
            form.append("client_w", String(900));
            const res = await fetch(`${API}/detect`, { method: "POST", body: form });
            const data = await res.json();

            if (data.bubbles) {
                // Sort from top to bottom
                const sortedBubbles = data.bubbles.sort((a: any, b: any) => a.y - b.y);
                const formatted = sortedBubbles.map((b: any, i: number) => ({
                    id: `bubble_${Date.now()}_${i}`,
                    x: b.x, y: b.y, w: b.w, h: b.h,
                    text: b.text || "",
                    translations: {}, // Initialize empty object,
                }));

                setBubbles((prev) => ({ ...prev, [imageId]: formatted }));
            }
        } catch (e) {
            alert("Error detecting image!");
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

            if (allBubblesToTranslate.length === 0) return;

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

                    if (!response.ok) continue;

                    const data = await response.json();
                    console.log(`✅ Dịch bubble ${item.id}:`, data);

                    const translatedText = data.translation_text || data.text; // ← an toàn hơn

                    if (translatedText) {
                        setBubbles((prevBubbles) => {
                            const nextState = { ...prevBubbles };
                            for (const imgId in nextState) {
                                nextState[imgId] = nextState[imgId].map(b =>
                                    b.id === item.id
                                        ? {
                                            ...b,
                                            translations: {
                                                ...b.translations,
                                                [globalLanguage]: translatedText,
                                            },
                                        }
                                        : b
                                );
                            }
                            return nextState;
                        });
                    }
                } catch (err) {
                    console.error(`Lỗi bubble ${item.id}:`, err);
                }
            }

            alert("✅ Đã dịch xong toàn bộ!");
        } catch (error: any) {
            console.error("Lỗi tổng:", error);
            alert("❌ Có lỗi khi dịch toàn bộ");
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
                            language: language,
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
            alert("✅ Data saved successfully!");
        } catch (error) {
            console.error("Lỗi khi lưu data:", error);
            alert("❌ Error occurred while saving!");
        } finally {
            setIsSaving(false);
        }
    };

    // Helper variable to render all bubbles into 1 tab
    const allBubblesFlat = useMemo(() => {
        return images.flatMap(img =>
            (bubbles[img.id] || []).map(b => ({ ...b, imageId: img.id, imageOrder: img.order }))
        );
    }, [bubbles, images]);

    return (
        <div className="fixed inset-0 z-[9999] bg-gray-100 flex overflow-hidden font-sans">

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

                    {/* TAB: OCR DETAILS (1 Frame) */}
                    {/* TAB: OCR LIST */}
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
                                                    id={`sidebar-bubble-${b.id}`} // Quan trọng: ID này để tìm và scroll tới
                                                    onClick={() => {
                                                        setSelectedId(b.id);
                                                        document.getElementById(`page-${img.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    }}
                                                    className={`border p-3 rounded-lg transition-all cursor-pointer ${selectedId === b.id ? "border-blue-500 ring-2 ring-blue-500 bg-blue-50/50" : "hover:border-gray-400 bg-white"
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-semibold text-gray-600">Frame #{idx + 1}</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // Prevent click event from propagating to parent
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
                                                        onClick={(e) => e.stopPropagation()} // Prevent continuous parent click triggers while typing
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

                    {/* TAB: ALL TRANSLATIONS */}
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
                                                        // Auto scroll tấm ảnh đó vào tầm nhìn (tùy chọn)
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

            {/* ================= MAIN CONTENT (SCROLL VERTICALLY ALL IMAGES) ================= */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#16161c] flex flex-col items-center pb-32">                {images.length > 0 ? (
                images.map((img, index) => {
                    const pageBubbles = bubbles[img.id] || [];
                    const isDetecting = processingItems[`detect_${img.id}`];

                    return (
                        <div key={img.id} className="relative flex justify-center w-full">

                            {/* Đặt width cố định (900px) để các ảnh luôn bằng nhau và dính sát mép */}
                            <div className="relative w-[900px] shrink-0 bg-white">
                                {/* THANH CÔNG CỤ: Nằm lơ lửng bên PHẢI ngoài khung ảnh */}
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

                                {/* VÙNG CHỨA ẢNH */}
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
                                        // Dùng w-full và block để ảnh bung đầy 800px và không bị hở khe hở ở dưới đáy
                                        className="w-full block"
                                    />

                                    {/* Layer ảo để bắt event chuột mượt hơn */}
                                    <div className="absolute inset-0 z-0 pointer-events-auto"></div>

                                    {/* Render Khung cho ảnh này */}
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
                                                    <span>{bubble.text ? bubble.text.substring(0, 20) + "..." : "Trống"}</span>
                                                </div>
                                            </Rnd>
                                        );
                                    })}

                                    {/* Render hộp đang vẽ (Preview) */}
                                    {isDrawing && drawingImageId === img.id && drawBox && (
                                        <div
                                            className="absolute border-2 border-dashed border-blue-400 bg-blue-400/20 pointer-events-none z-20"
                                            style={{
                                                left: drawBox.x, top: drawBox.y,
                                                width: drawBox.w, height: drawBox.h,
                                            }}
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
                    <p>Chưa có ảnh nào được tải lên</p>
                </div>
            )}
            </div>
        </div>
    );
}