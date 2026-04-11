"use client";

import { useMemo, useState, useTransition, useEffect, useRef } from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import {
  BookOpen,
  Plus,
  X,
  Check,
  Edit,
  Trash2,
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  UploadCloud,
  FileImage,
  GripVertical,
  Save,
  HelpCircle,
  RefreshCw,
  ScanText,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Upload,
} from "lucide-react";
import PointRuleDialog from "@/components/PointRuleDialog";
import MangaOCRModal from "@/components/MangaOCRViewer";


// ---- Axios instance
const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api`,
  withCredentials: true,
});

// ---- Types
interface Chapter {
  id: string;
  title: string;
  isActive: boolean;
  number: number;
  price: number;
  isPublished: boolean;
}

interface ImageFile {
  id: string;
  file?: File;
  previewUrl: string;
  isExisting?: boolean;
  order?: number;
  originalUrl?: string;
  filename?: string;
}

// ---- Helpers
function getImageUrl(chapterId: string, filename: string): string {
  return `${process.env.NEXT_PUBLIC_API_URL}/uploads/image-chapters/${chapterId}/${filename}`;
}

function clsx(...classes: Array<string | boolean | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function CreateImageChapterPage({
  params,
}: {
  params: Promise<{ idStory: string }>;
}) {
  const { idStory } = use(params);
  const mangaId = idStory;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreatingMode, setIsCreatingMode] = useState(true);
  const [currentEditingId, setCurrentEditingId] = useState<string | null>(null);

  // Loading states
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingChapter, setIsLoadingChapter] = useState(false);
  const [isLoadingTranslation, setIsLoadingTranslation] = useState(false);

  // Form State
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [title, setTitle] = useState("");
  const [number, setNumber] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);
  const [isPublished, setIsPublished] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [content, setContent] = useState("");
  const [images, setImages] = useState<ImageFile[]>([]);

  const [errors, setErrors] = useState<{
    title?: string;
    number?: string;
    manga?: string;
    images?: string;
  }>({});
  const [dirty, setDirty] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Refs
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const scrollableContainerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Position input states
  const [showPositionInput, setShowPositionInput] = useState<string | null>(null);
  const [targetPosition, setTargetPosition] = useState<string>("");

  // OCR states
  const [ocrTargetUrl, setOcrTargetUrl] = useState<string | null>(null);
  const [translationMode, setTranslationMode] = useState(false);
  const [initialBubbles, setInitialBubbles] = useState<Record<string, any>>({});

  // --- GET: load chapters
  useEffect(() => {
    let mounted = true;
    async function fetchChapters() {
      if (!mangaId) return;
      try {
        setIsLoadingList(true);
        const res = await api.get(`/image-chapter/${mangaId}`);
        if (!mounted) return;
        const mapped: Chapter[] = (res.data ?? []).map((c: any) => ({
          id: c._id,
          title: c.title,
          number: c.order,
          price: c.price ?? 0,
          isPublished: !!c.is_published,
          isActive: false,
        }));
        setChapters(mapped);
        setNumber(mapped.length + 1);
      } catch (err) {
        console.error("Error loading chapter list", err);
      } finally {
        if (mounted) setIsLoadingList(false);
      }
    }
    fetchChapters();
    return () => {
      mounted = false;
    };
  }, [mangaId]);

  // Cleanup scroll interval
  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, []);

  // Reset dragging state when window loses focus
  useEffect(() => {
    const handleWindowBlur = () => {
      setIsDragging(false);
    };

    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  // Handle mouse wheel scroll during drag
  useEffect(() => {
    if (!isDragging) return;

    const container = scrollableContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Check if the target is within the scrollable container
      const isWithinContainer = container.contains(e.target as Node);
      if (!isWithinContainer) return;

      e.preventDefault();
      e.stopPropagation();
      
      // Smooth scroll with better sensitivity
      const scrollAmount = e.deltaY > 0 ? 60 : -60;
      const currentScroll = container.scrollTop;
      const maxScroll = container.scrollHeight - container.clientHeight;
      
      // Ensure scroll doesn't go beyond bounds
      const newScroll = Math.max(0, Math.min(currentScroll + scrollAmount, maxScroll));
      
      container.scrollTop = newScroll;
    };

    // Listen on document level with capture phase (passive: false allows preventDefault)
    document.addEventListener("wheel", handleWheel, { 
      capture: true,
      passive: false 
    });

    return () => {
      document.removeEventListener("wheel", handleWheel, { capture: true });
    };
  }, [isDragging]);

  // Image Handlers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newImages = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file: file,
      previewUrl: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newImages]);
    setDirty(true);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const filtered = prev.filter((img) => img.id !== id);
      // Clean up memory
      const target = prev.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return filtered;
    });
    setDirty(true);
  };

  // Validate
  function validate() {
    const next: typeof errors = {};
    if (!mangaId) next.manga = "Missing mangaId in URL";
    if (!title.trim()) next.title = "Title is required";
    if (!Number.isFinite(number) || number <= 0)
      next.number = "Chapter number must be > 0";
    if (images.length === 0) next.images = "Please upload at least one image";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // Fetch chapter data for editing
  async function fetchChapterData(chapterId: string) {
    if (!chapterId) return;
    try {
      setIsLoadingChapter(true);
      const res = await api.get(`/image-chapter/id/${chapterId}`);
      const data = res.data?.data;

      setTitle(data.title);
      setNumber(data.order);
      setPrice(data.price || 0);
      setIsPublished(data.is_published);

      // Handle existing images
      const existingImages =
        data.images?.[0]?.images?.map((imgName: string, index: number) => ({
          id: `existing-${index}`,
          previewUrl: getImageUrl(chapterId, imgName),
          isExisting: true,
          originalUrl: getImageUrl(chapterId, imgName),
          filename: imgName,
          order: index,
        })) || [];

      setImages(existingImages);
      setDirty(false);
      setErrors({});
    } catch (err) {
      console.error("Error loading chapter data", err);
      alert("Could not load chapter data");
    } finally {
      setIsLoadingChapter(false);
    }
  }

  // Move image to specific position
  function moveToPosition(index: number, position: "first" | "last") {
    const newImages = [...images];
    const item = newImages.splice(index, 1)[0];

    if (position === "first") {
      newImages.unshift(item);
    } else {
      newImages.push(item);
    }

    const reorderedImages = newImages.map((img, i) => ({
      ...img,
      order: i,
    }));

    setImages(reorderedImages);
    setDirty(true);
  }

  // Auto scroll functionality
  function startAutoScroll(direction: "up" | "down") {
    if (scrollIntervalRef.current) return;

    const container = scrollableContainerRef.current;
    if (!container) return;

    const scrollAmount = direction === "up" ? -50 : 50;

    scrollIntervalRef.current = setInterval(() => {
      container.scrollBy({
        top: scrollAmount,
        behavior: "smooth",
      });
    }, 100);
  }

  function stopAutoScroll() {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }

  function handleMouseDownMove(index: number, direction: "up" | "down") {
    moveImage(index, direction);
    startAutoScroll(direction);
  }

  function handleMouseDownMoveToPosition(
    index: number,
    position: "first" | "last"
  ) {
    moveToPosition(index, position);
    startAutoScroll(position === "first" ? "up" : "down");
  }

  function moveToSpecificPosition(currentIndex: number, targetPos: number) {
    const targetIndex = targetPos - 1;
    if (
      targetIndex < 0 ||
      targetIndex >= images.length ||
      targetIndex === currentIndex
    ) {
      return;
    }

    const newImages = [...images];
    const item = newImages.splice(currentIndex, 1)[0];
    newImages.splice(targetIndex, 0, item);

    const reorderedImages = newImages.map((img, i) => ({
      ...img,
      order: i,
    }));

    setImages(reorderedImages);
    setDirty(true);
  }

  function handlePositionSubmit(imageId: string, currentIndex: number) {
    const pos = Number.parseInt(targetPosition);
    if (pos >= 1 && pos <= images.length) {
      moveToSpecificPosition(currentIndex, pos);
    }
    setShowPositionInput(null);
    setTargetPosition("");
  }

  function handlePositionKeyPress(
    e: React.KeyboardEvent,
    imageId: string,
    currentIndex: number
  ) {
    if (e.key === "Enter") {
      handlePositionSubmit(imageId, currentIndex);
    } else if (e.key === "Escape") {
      setShowPositionInput(null);
      setTargetPosition("");
    }
  }

  async function handleCreateNew() {
    setIsEditMode(false);
    setEditingId(null);
    setIsCreatingMode(true);
    setCurrentEditingId(null);

    setTitle("");
    setPrice(0);
    setIsPublished(false);
    setIsCompleted(false);
    setImages([]);

    const nextNumber =
      chapters.length > 0 ? Math.max(...chapters.map((c) => c.number)) + 1 : 1;

    setNumber(nextNumber);

    setDirty(false);
    setErrors({});

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleEdit(id: string) {
    try {
      setIsEditMode(true);
      setEditingId(id);
      setIsCreatingMode(false);
      setCurrentEditingId(id);
      setChapters((prev) =>
        prev.map((c) => ({ ...c, isActive: c.id === id }))
      );
      setErrors({});
      await fetchChapterData(id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      alert("Could not load chapter data");
    }
  }

  async function handleEditChapter(chapterId: string) {
    await handleEdit(chapterId);
  }

  async function handleSaveDraft() {
    if (!validate()) return;

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("order", number.toString());
        formData.append("price", price.toString());
        formData.append("is_published", "false");
        formData.append("is_completed", String(isCompleted));

        if (isEditMode && editingId) {
          // UPDATE DRAFT: Send kept_images for deletion/reordering
          const keptImages = images
            .filter((img) => img.isExisting)
            .map((img) => img.filename)
            .filter(Boolean);

          formData.append("kept_images", JSON.stringify(keptImages));

          images.forEach((img) => {
            if (!img.isExisting && img.file) {
              formData.append("images", img.file);
            }
          });

          await api.patch(`/image-chapter/${editingId}`, formData);
          alert("Draft updated successfully!");
          setDirty(false);
        } else {
          // CREATE
          formData.append("manga_id", mangaId as string);

          images.forEach((img) => {
            if (img.file) {
              formData.append("images", img.file);
            }
          });

          await api.post(`/image-chapter`, formData);
          alert("Draft saved successfully!");
          handleDiscard();
        }

        const res = await api.get(`/image-chapter/${mangaId}`);
        setChapters(
          res.data.map((c: any) => ({
            id: c._id,
            title: c.title,
            number: c.order,
            price: c.price ?? 0,
            isPublished: !!c.is_published,
          }))
        );
      } catch (err: any) {
        alert(err?.response?.data?.message || "Error saving draft");
      }
    });
  }

  async function handleOpenTranslation() {
    if (!currentEditingId) return;

    setIsLoadingTranslation(true);
    try {
      const res = await fetch("/api/getTranslation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId: currentEditingId }),
      });
      const data = await res.json();

      if (data.pages && data.pages.length > 0) {
        const newBubbles: Record<string, any> = {};
        data.pages.forEach((page: any) => {
          const imgId =
            images.find((img) => img.order === page.pageOrder)?.id ||
            `page-${page.pageOrder}`;

          newBubbles[imgId] = page.bubbles.map((b: any) => ({
            id: b.box_id,
            x: b.coordinates.x,
            y: b.coordinates.y,
            w: b.coordinates.w,
            h: b.coordinates.h,
            text: b.original_text,
            translations: Array.isArray(b.translations)
              ? b.translations.reduce(
                (acc: any, t: any) => {
                  acc[t.language] = t.text;
                  return acc;
                },
                {} as Record<string, string>
              )
              : b.translations || {},
          }));
        });
        setInitialBubbles(newBubbles);
      }
    } catch (err) {
      console.error("Error loading translation:", err);
    } finally {
      setIsLoadingTranslation(false);
      setTranslationMode(true);
    }
  }

  function handleStartNewChapter() {
    setIsCreatingMode(true);
    setIsEditMode(false);
    setEditingId(null);
    setCurrentEditingId(null);
    handleCreateNew();
  }

  function resetForm() {
    setTitle("");
    setNumber(chapters.length + 2);
    setPrice(0);
    setImages([]);
    setDirty(false);
    setIsCreatingMode(true);
    setIsEditMode(false);
    setEditingId(null);
    setCurrentEditingId(null);
  }

  async function handleSubmit() {
    if (!validate()) return;

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("order", number.toString());
        formData.append("price", price.toString());
        formData.append("is_published", String(isPublished));
        formData.append("is_completed", String(isCompleted));

        if (isEditMode && editingId) {
          // --- UPDATE: Send kept_images in correct order + new images ---
          const keptImages = images
            .filter((img) => img.isExisting)
            .map((img) => img.filename)
            .filter(Boolean);

          formData.append("kept_images", JSON.stringify(keptImages));

          // Only append new (non-existing) images
          images.forEach((img) => {
            if (!img.isExisting && img.file) {
              formData.append("images", img.file);
            }
          });

          await api.patch(`/image-chapter/${editingId}`, formData);
          alert("Update successful!");
          setDirty(false);
        } else {
          // --- CREATE ---
          formData.append("manga_id", mangaId);

          images.forEach((img) => {
            if (img.file) {
              formData.append("images", img.file);
            }
          });

          await api.post(`/image-chapter`, formData);
          alert("Create successful!");
          handleDiscard();
        }

        router.refresh();
        const res = await api.get(`/image-chapter/${mangaId}`);

        setChapters(
          res.data.map((c: any) => ({
            id: c._id,
            title: c.title,
            number: c.order,
            price: c.price ?? 0,
            isPublished: !!c.is_published,
          })),
        );
      } catch (err: any) {
        alert(err?.response?.data?.message || "Error saving chapter");
      }
    });
  }

  function handleDiscard() {
    if (isCreatingMode) {
      setTitle("");
      setNumber(chapters.length + 1);
      setContent("");
      setPrice(0);
      setImages([]);
    } else {
      if (currentEditingId) {
        fetchChapterData(currentEditingId);
      }
    }
    setDirty(false);
    setErrors({});
    setIsPublished(false);
    setIsCompleted(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this chapter?")) return;
    try {
      await api.delete(`/image-chapter/${id}`);
      setChapters((prev) => prev.filter((c) => c.id !== id));
      if (currentEditingId === id) {
        handleStartNewChapter();
      }
    } catch (err) {
      alert("Error deleting chapter");
    }
  }

  function moveImage(index: number, direction: "up" | "down") {
    setImages((prev) => {
      const newImages = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;

      if (target < 0 || target >= prev.length) return prev;

      [newImages[index], newImages[target]] = [
        newImages[target],
        newImages[index],
      ];

      return newImages;
    });

    setDirty(true);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white text-slate-900">
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="hidden md:flex w-80 bg-white/80 backdrop-blur border-r border-slate-200 flex-col">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-slate-900 tracking-tight">
                  Chapter Forge
                </h1>
                <p className="text-xs text-slate-500">Manage image chapters</p>
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Create New Chapter
                </h2>
                <p className="text-xs text-slate-500">Uploading manga images</p>
              </div>
              <span
                className={clsx(
                  "text-[10px] px-2 py-0.5 rounded-full border",
                  dirty
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200",
                )}
              >
                {dirty ? "unsaved" : "ready"}
              </span>
            </div>
          </div>

          <section className="flex-1 p-4 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Chapter List
              </h3>
              <button
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                onClick={handleCreateNew}
              >
                <Plus className="h-3.5 w-3.5" /> Create New
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {isLoadingList &&
                Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 rounded-xl border border-slate-200 bg-slate-100 animate-pulse"
                  />
                ))}
              {!isLoadingList &&
                chapters
                  .sort((a, b) => a.number - b.number)
                  .map((chapter) => (
                    <div
                      key={chapter.id}
                      className="p-3 rounded-xl border bg-white transition-all border-slate-200 hover:border-slate-300 hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[11px] font-medium text-slate-500">
                              Ch. {chapter.number}
                            </span>
                            <span
                              className={clsx(
                                "px-2 py-0.5 text-[10px] rounded-full border",
                                chapter.isPublished
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200",
                              )}
                            >
                              {chapter.isPublished ? "Published" : "Draft"}
                            </span>
                          </div>
                          <h4 className="text-sm font-medium text-slate-900 truncate">
                            {chapter.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleEdit(chapter.id)}
                            className="p-1.5 rounded-lg hover:bg-slate-100"
                          >
                            <Edit className="h-4 w-4 text-slate-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(chapter.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
          </section>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col bg-white">
          {/* Glass header */}
          <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/70 backdrop-blur">
            <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <button
                  onClick={() => router.push("/author/dashboard")}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <ArrowLeft className="h-4 w-4" /> Dashboard
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-600">
                  Ch. {number} {" • "}
                  {isEditMode
                    ? isPublished
                      ? "Publish on save"
                      : "Draft on save"
                    : isPublished
                      ? "Publish on create"
                      : "Draft"}
                </span>
                {dirty && (
                  <span className="text-[11px] text-amber-600">• unsaved</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDiscard}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                  {isEditMode ? "Discard Changes" : "Cancel"}
                </button>

                {isEditMode && (
                  <button
                    onClick={handleSubmit}
                    disabled={isPending || !dirty}
                    title={!dirty ? "No changes to save" : "Save changes"}
                    className={clsx(
                      "inline-flex items-center gap-2 rounded-lg px-4 py-2 shadow-sm transition-all duration-200 transform",
                      isPending || !dirty
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:scale-[1.02] active:scale-[0.98]",
                    )}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}

                    {isPending ? "Saving..." : "Save Changes"}
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsPublished(true);
                    handleSubmit();
                  }}
                  disabled={isPending || !mangaId}
                  className={clsx(
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2 shadow-sm transition-all",

                    // Edit mode style
                    isEditMode
                      ? isPublished
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                      : // Create mode style
                      isPending || !mangaId
                        ? "bg-blue-400 text-white cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700",
                  )}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}

                  {isPending
                    ? isEditMode
                      ? "Saving..."
                      : "Creating..."
                    : isEditMode
                      ? isPublished
                        ? "Publish"
                        : "Keep Draft"
                      : isPublished
                        ? "Create & Publish"
                        : "Create Draft"}
                </button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div ref={scrollableContainerRef} className="flex-1 p-4 sm:p-6 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl space-y-6">
              {/* Info Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="p-5 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Chapter Information
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Basic info for your image chapter
                  </p>
                </div>
                <div className="p-5 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setDirty(true);
                      }}
                      placeholder="Enter chapter title..."
                      className={clsx(
                        "mt-1 w-full rounded-xl border px-3.5 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-200 outline-none",
                        errors.title ? "border-red-300" : "border-slate-300",
                      )}
                    />
                    <p className="text-[11px] text-slate-500">
                      {isEditMode
                        ? "Keep it brief and clear"
                        : "Brief, accurately describes content"}
                    </p>
                    {errors.title && (
                      <p className="mt-1 text-[11px] text-red-600">
                        {errors.title}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Chapter Number
                      </label>
                      <input
                        type="number"
                        value={number}
                        onChange={(e) => {
                          setNumber(parseInt(e.target.value || "0"));
                          setDirty(true);
                        }}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <label className="block text-sm font-medium text-slate-700">
                          Points
                        </label>
                        <PointRuleDialog />
                      </div>

                      <input
                        type="number"
                        min={0}
                        value={price}
                        onChange={(e) => {
                          const value = Math.max(
                            0,
                            parseInt(e.target.value || "0"),
                          );
                          setPrice(value);
                          setDirty(true);
                        }}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="publishCheck"
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => {
                        setIsPublished(e.target.checked);
                        setDirty(true);
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label
                      htmlFor="publishCheck"
                      className="text-sm text-slate-700"
                    >
                      {isEditMode
                        ? "Publish this chapter when saving changes"
                        : "Publish immediately after creating this chapter"}
                    </label>
                  </div>

                  {isEditMode && (
                    <div className="flex items-center gap-2">
                      <input
                        id="isCompleted"
                        type="checkbox"
                        checked={isCompleted}
                        onChange={(e) => {
                          setIsCompleted(e.target.checked);
                          setDirty(true);
                        }}
                        className="h-4 w-4"
                      />
                      <label
                        htmlFor="isCompleted"
                        className="text-sm text-slate-700"
                      >
                        Mark content as completed
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Image Upload Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="p-5 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">
                        Chapter Images
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {translationMode
                          ? "Đang ở chế độ OCR & Dịch toàn chapter"
                          : isEditMode
                            ? "Edit and rearrange images..."
                            : "Upload and arrange images..."}
                      </p>
                    </div>

                    {/* Batch OCR Button */}
                    {images.length > 0 && !translationMode && (
                      <button
                        onClick={handleOpenTranslation}
                        disabled={isLoadingTranslation || !currentEditingId}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-2xl hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isLoadingTranslation ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <ScanText className="h-5 w-5" />
                        )}
                        🚀 OCR & Dịch Toàn Bộ Chapter
                      </button>
                    )}

                    {/* Upload Button */}
                    {!translationMode && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Upload className="h-4 w-4" />
                        {isCreatingMode ? "Upload Images" : "Add Images"}
                      </button>
                    )}
                  </div>

                  {errors.images && (
                    <p className="text-xs text-red-600 mt-2">{errors.images}</p>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImageUpload(e)}
                  className="hidden"
                />

                <div className="p-5 space-y-4">
                  {images.length === 0 ? (
                    <label
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-3 py-14 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-all"
                    >
                      <ImageIcon className="h-16 w-16 text-slate-400" />

                      <div className="text-center">
                        <p className="text-lg font-medium text-slate-700 mb-3">
                          {isCreatingMode
                            ? "No images yet"
                            : "This chapter has no images"}
                        </p>
                        <p className="text-sm text-slate-500 mb-6">
                          Drag and drop or click to select multiple images
                        </p>
                      </div>

                      <button className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                        <Upload className="h-5 w-5" />
                        Select Images
                      </button>
                    </label>
                  ) : (
                    <div className="space-y-6">
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-medium text-slate-700">
                            {images.length} image
                            {images.length !== 1 ? "s" : ""}{" "}
                            {isCreatingMode ? "selected" : "in chapter"}
                          </span>
                          <span className="text-sm text-slate-500">
                            Drag and drop to rearrange or use move buttons
                          </span>
                        </div>

                        {/* ==================== DANH SÁCH ẢNH CÓ DRAG & DROP ==================== */}
                        <div ref={imageContainerRef} className="space-y-3">
                          {images
                            .sort((a, b) => (a.order || 0) - (b.order || 0))
                            .map((imageFile, index) => (
                              <div
                                key={imageFile.id}
                                draggable
                                onDragStart={(e) => {
                                  setIsDragging(true);
                                  e.dataTransfer.setData("text/plain", index.toString());
                                  e.currentTarget.classList.add("opacity-30", "scale-95");
                                }}
                                onDragEnd={(e) => {
                                  setIsDragging(false);
                                  e.currentTarget.classList.remove("opacity-30", "scale-95");
                                }}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  const draggedIndex = parseInt(e.dataTransfer.getData("text/plain"));
                                  const newImages = [...images];

                                  const [movedItem] = newImages.splice(draggedIndex, 1);
                                  newImages.splice(index, 0, movedItem);

                                  // Cập nhật lại order
                                  const reordered = newImages.map((img, i) => ({
                                    ...img,
                                    order: i,
                                  }));

                                  setImages(reordered);
                                  setDirty(true);
                                }}
                                className={`flex items-start gap-6 p-6 bg-white border rounded-2xl hover:bg-slate-50 transition-all cursor-grab active:cursor-grabbing shadow-sm ${imageFile.isExisting
                                  ? "border-slate-200"
                                  : "border-blue-200 ring-1 ring-blue-100"
                                  }`}
                              >
                                {/* Số thứ tự + nút position */}
                                <div className="text-sm font-mono w-12 text-center mt-2">
                                  {showPositionInput === imageFile.id ? (
                                    <input
                                      type="number"
                                      min="1"
                                      max={images.length}
                                      value={targetPosition}
                                      onChange={(e) => setTargetPosition(e.target.value)}
                                      onKeyDown={(e) =>
                                        handlePositionKeyPress(e, imageFile.id, index)
                                      }
                                      onBlur={() => {
                                        setShowPositionInput(null);
                                        setTargetPosition("");
                                      }}
                                      className="w-12 h-8 text-sm text-center border border-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      autoFocus
                                    />
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setShowPositionInput(imageFile.id);
                                        setTargetPosition((index + 1).toString());
                                      }}
                                      className="w-12 h-8 text-sm font-mono text-slate-700 border border-slate-300 bg-slate-50 rounded-md hover:border-blue-400 hover:text-blue-600 transition-all"
                                    >
                                      {index + 1}
                                    </button>
                                  )}
                                </div>

                                {/* Ảnh preview */}
                                <div className="flex-1">
                                  <img
                                    src={imageFile.previewUrl}
                                    alt={`Preview ${index + 1}`}
                                    className="w-full max-w-4xl mx-auto object-contain rounded-2xl border shadow-sm"
                                    style={{ maxHeight: "90vh" }}
                                  />
                                  <div className="mt-4 text-center">
                                    <p className="text-sm font-medium text-slate-700">
                                      {imageFile.isExisting
                                        ? `Ảnh ${index + 1} (cũ)`
                                        : imageFile.filename || `Ảnh ${index + 1}`}
                                    </p>
                                  </div>
                                </div>

                                {/* Control buttons */}
                                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                                  {/* Nút OCR và Xóa */}
                                  <button
                                    onClick={() => setOcrTargetUrl(imageFile.previewUrl)}
                                    className="p-2 rounded-xl hover:bg-emerald-50 text-emerald-600"
                                    title="OCR & Dịch ảnh này"
                                  >
                                    <ScanText className="h-7 w-7" />
                                  </button>

                                  <button
                                    onClick={() => removeImage(imageFile.id)}
                                    className="p-2 rounded-xl hover:bg-red-50 text-red-500"
                                    title="Xóa ảnh"
                                  >
                                    <Trash2 className="h-7 w-7" />
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </>
                    </div>
                  )}
                </div>
              </div>

              <div className="pb-10" />
            </div>
          </div>
        </main>
      </div>

      {/* OCR Modal */}
      {ocrTargetUrl && (
        <MangaOCRModal
          imageUrl={ocrTargetUrl}
          onClose={() => setOcrTargetUrl(null)}
        />
      )}

      {/* Batch OCR & Translation Modal */}
      {translationMode && (
        <MangaOCRModal
          chapterId={currentEditingId as string}
          chapterImages={images.map((img) => ({
            id: img.id,
            preview: img.previewUrl,
            order: img.order || 0,
          }))}
          initialBubbles={initialBubbles}
          onClose={() => {
            setTranslationMode(false);
            setInitialBubbles({});
          }}
        />
      )}
    </div>
  );
}
