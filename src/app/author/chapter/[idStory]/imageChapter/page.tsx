"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import axios from "axios";
import {
  BookOpen,
  Plus,
  Save,
  X,
  Check,
  ChevronRight,
  Edit,
  Trash2,
  ArrowLeft,
  Loader2,
  Upload,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

// ---- Axios instance (trỏ tới NestJS)
const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api`,
});

// ---- Types
interface Chapter {
  id: string;
  title: string;
  isActive: boolean;
  number: number;
  price: number;
  is_published: boolean;
}

interface ImageFile {
  id: string;
  file?: File;
  preview: string;
  order: number;
  isExisting?: boolean; // For existing images from server
  originalUrl?: string; // Original server URL
}

// ---- Page
export default function CreateChapterPage({
  params,
}: {
  params: { idStory: string };
}) {
  const { idStory } = params;
  const mangaId = idStory;
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading & Mode
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingChapter, setIsLoadingChapter] = useState(false);
  const [isCreatingMode, setIsCreatingMode] = useState(true);
  const [currentEditingId, setCurrentEditingId] = useState<string | null>(null);

  // State
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [title, setTitle] = useState("");
  const [number, setNumber] = useState<number>(1);
  const [content, setContent] = useState("");
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);

  const [errors, setErrors] = useState<{
    title?: string;
    number?: string;
    manga?: string;
    images?: string;
  }>({});
  const [dirty, setDirty] = useState(false);
  const [price, setPrice] = useState<number>(0);

  // Refs for scroll functionality
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Position input state
  const [showPositionInput, setShowPositionInput] = useState<string | null>(
    null
  );
  const [targetPosition, setTargetPosition] = useState<string>("");

  // --- GET: load chapters by mangaId
  useEffect(() => {
    let mounted = true;
    async function fetchChapters() {
      if (!mangaId) return;
      try {
        setIsLoadingList(true);
        const res = await api.get(`/image-chapter/${mangaId}`);
        if (!mounted) return;

        const rawData = res.data?.data ?? [];
        if (!Array.isArray(rawData)) {
          console.warn("API không trả về mảng:", rawData);
          setChapters([]);
          return;
        }

        const mapped: Chapter[] = rawData.map((c: any) => ({
          id: c._id,
          title: c.title,
          number: c.order,
          price: c.price ?? 0,
          is_published: !!c.is_published,
          isActive: false,
        }));

        setChapters(mapped);
        if (isCreatingMode) {
          setNumber(mapped.length + 1);
        }
      } catch (err) {
        console.error("Lỗi tải danh sách chương", err);
        setChapters([]);
      } finally {
        if (mounted) setIsLoadingList(false);
      }
    }
    fetchChapters();
    return () => {
      mounted = false;
    };
  }, [mangaId, isCreatingMode]);

  // Cleanup scroll interval on unmount
  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, []);

  // Load chapter data when editing
  async function fetchChapterData(chapterId: string) {
    if (!chapterId) return;

    try {
      setIsLoadingChapter(true);

      const res = await api.get(`/image-chapter/id/${chapterId}`);
      const chapterData = res.data?.data;

      if (!chapterData) throw new Error("Không tìm thấy dữ liệu chương");

      // Fill form data
      setTitle(chapterData.title || "");
      setNumber(chapterData.order || 1);
      setPrice(chapterData.price || 0);
      setContent(chapterData.content || "");

      // ✅ Map images từ chapterData.images
      const imageDocs = chapterData.images?.[0]?.images || [];
      const existingImages: ImageFile[] = imageDocs.map(
        (imgPath: string, index: number) => {
          // Nếu BE trả về path tương đối => tự ghép host
          const fullUrl = imgPath.startsWith("http")
            ? imgPath
            : `${
                process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"
              }${imgPath}`;

          return {
            id: `existing-${index}`,
            preview: fullUrl, // FE dùng preview để hiển thị ảnh
            order: index,
            isExisting: true,
            originalUrl: fullUrl,
          };
        }
      );

      setImageFiles(existingImages);
      setDirty(false);
      setErrors({});
    } catch (err) {
      console.error("Lỗi tải dữ liệu chương", err);
      alert("Lỗi tải dữ liệu chương. Vui lòng thử lại.");
    } finally {
      setIsLoadingChapter(false);
    }
  }

  // Validate form
  function validate() {
    const next: typeof errors = {};
    if (!mangaId) next.manga = "Thiếu mangaId trên URL";
    if (!title.trim()) next.title = "Tiêu đề là bắt buộc";
    if (!Number.isFinite(number) || number <= 0)
      next.number = "Số chương phải > 0";
    if (imageFiles.length === 0) next.images = "Chọn ít nhất 1 ảnh";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // Handle file selection
  function handleFileSelect(files: FileList | null) {
    if (!files) return;

    const newImageFiles: ImageFile[] = Array.from(files).map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      preview: URL.createObjectURL(file),
      order: imageFiles.length + index,
      isExisting: false,
    }));

    setImageFiles((prev) => [...prev, ...newImageFiles]);
    setDirty(true);
  }

  // Remove image
  function removeImage(id: string) {
    setImageFiles((prev) => {
      const filtered = prev.filter((img) => img.id !== id);
      // Reorder remaining images
      return filtered.map((img, index) => ({
        ...img,
        order: index,
      }));
    });
    setDirty(true);
  }

  // Move image up/down
  function moveImage(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= imageFiles.length) return;

    const newImageFiles = [...imageFiles];
    [newImageFiles[index], newImageFiles[newIndex]] = [
      newImageFiles[newIndex],
      newImageFiles[index],
    ];

    // Update order
    const reorderedFiles = newImageFiles.map((img, i) => ({
      ...img,
      order: i,
    }));

    setImageFiles(reorderedFiles);
    setDirty(true);
  }

  // Move to first/last position
  function moveToPosition(index: number, position: "first" | "last") {
    const newImageFiles = [...imageFiles];
    const item = newImageFiles.splice(index, 1)[0];

    if (position === "first") {
      newImageFiles.unshift(item);
    } else {
      newImageFiles.push(item);
    }

    // Update order
    const reorderedFiles = newImageFiles.map((img, i) => ({
      ...img,
      order: i,
    }));

    setImageFiles(reorderedFiles);
    setDirty(true);
  }

  // Auto scroll functions
  function startAutoScroll(direction: "up" | "down") {
    if (scrollIntervalRef.current) return; // Already scrolling

    const container = imageContainerRef.current;
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

  // Enhanced move functions with auto-scroll
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

  // Move to specific position
  function moveToSpecificPosition(currentIndex: number, targetPos: number) {
    const targetIndex = targetPos - 1; // Convert to 0-based index
    if (
      targetIndex < 0 ||
      targetIndex >= imageFiles.length ||
      targetIndex === currentIndex
    ) {
      return;
    }

    const newImageFiles = [...imageFiles];
    const item = newImageFiles.splice(currentIndex, 1)[0];
    newImageFiles.splice(targetIndex, 0, item);

    // Update order
    const reorderedFiles = newImageFiles.map((img, i) => ({
      ...img,
      order: i,
    }));

    setImageFiles(reorderedFiles);
    setDirty(true);
  }

  // Handle position input
  function handlePositionSubmit(imageId: string, currentIndex: number) {
    const pos = parseInt(targetPosition);
    if (pos >= 1 && pos <= imageFiles.length) {
      moveToSpecificPosition(currentIndex, pos);
    }
    setShowPositionInput(null);
    setTargetPosition("");
  }

  // Handle position input key press
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

  // Save draft
  async function handleSaveDraft() {
    if (!validate()) return;

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("price", String(price));
        formData.append("is_published", "false");
        formData.append("content", content);
        formData.append("manga_id", mangaId);

        // 🟢 Sắp xếp ảnh theo order trước khi xử lý
        const sortedImages = [...imageFiles].sort((a, b) => a.order - b.order);

        // 🟢 Thêm ảnh mới vào FormData
        sortedImages.forEach((imgFile) => {
          if (imgFile.file) {
            formData.append("images", imgFile.file);
          }
        });

        // 🟢 Gửi danh sách ảnh existing với thông tin order
        if (!isCreatingMode && currentEditingId) {
          const existingImagesWithOrder = sortedImages
            .filter((img) => img.isExisting && img.originalUrl)
            .map((img, index) => ({
              url: img.originalUrl!,
              order: img.order,
            }));

          formData.append(
            "existing_images",
            JSON.stringify(existingImagesWithOrder)
          );
          console.log("Sending existing images:", existingImagesWithOrder);
        }

        let res;
        if (isCreatingMode) {
          res = await api.post(`/image-chapter`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } else {
          res = await api.patch(
            `/image-chapter/${currentEditingId}`,
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            }
          );
        }

        const chapterData = res.data?.chapter || res.data?.data;
        if (!chapterData?._id) throw new Error("Phản hồi không hợp lệ");

        if (isCreatingMode) {
          updateChaptersState(chapterData);
          resetForm();
        } else {
          // Update existing chapter in list
          setChapters((prev) =>
            prev.map((c) =>
              c.id === currentEditingId
                ? {
                    ...c,
                    title: chapterData.title,
                    number: chapterData.order,
                    price: chapterData.price ?? 0,
                    is_published: false,
                  }
                : c
            )
          );
          setDirty(false);
        }

        alert(
          isCreatingMode
            ? "Đã lưu bản nháp thành công!"
            : "Đã cập nhật bản nháp thành công!"
        );
      } catch (err) {
        console.error("Lỗi lưu bản nháp", err);
        alert("Lỗi lưu bản nháp. Vui lòng thử lại.");
      }
    });
  }

  // Create/Update chapter
  async function handleCreateOrUpdate() {
    if (!validate()) return;

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("price", String(price));
        formData.append("is_published", "true");
        formData.append("content", content);
        formData.append("manga_id", mangaId);

        // 🟢 Sắp xếp ảnh theo order trước khi xử lý
        const sortedImages = [...imageFiles].sort((a, b) => a.order - b.order);

        // 🟢 Thêm ảnh mới vào FormData
        sortedImages.forEach((imgFile) => {
          if (imgFile.file) {
            formData.append("images", imgFile.file);
          }
        });

        // 🟢 Gửi danh sách ảnh existing với thông tin order
        if (!isCreatingMode && currentEditingId) {
          const existingImagesWithOrder = sortedImages
            .filter((img) => img.isExisting && img.originalUrl)
            .map((img, index) => ({
              url: img.originalUrl!,
              order: img.order,
            }));

          formData.append(
            "existing_images",
            JSON.stringify(existingImagesWithOrder)
          );
          console.log("Sending existing images:", existingImagesWithOrder);
        }

        // 🟢 Gọi API
        let res;
        if (isCreatingMode) {
          res = await api.post(`/image-chapter`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } else {
          res = await api.patch(
            `/image-chapter/${currentEditingId}`,
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            }
          );
        }

        const chapterData =
          res.data?.chapter || res.data?.data?.chapter || res.data?.data;
        if (!chapterData?._id) throw new Error("Phản hồi không hợp lệ");

        // 🟢 Cập nhật UI
        if (isCreatingMode) {
          updateChaptersState(chapterData);
          resetForm();
        } else {
          setChapters((prev) =>
            prev.map((c) =>
              c.id === currentEditingId
                ? {
                    ...c,
                    title: chapterData.title,
                    number: chapterData.order,
                    price: chapterData.price ?? 0,
                    is_published: true,
                  }
                : c
            )
          );
          setDirty(false);
        }

        alert(
          isCreatingMode
            ? "Đã tạo chương thành công!"
            : "Đã cập nhật chương thành công!"
        );
      } catch (err) {
        console.error("Lỗi xử lý chương", err);
        alert(
          `Lỗi ${isCreatingMode ? "tạo" : "cập nhật"} chương. Vui lòng thử lại.`
        );
      }
    });
  }

  // Trong component CreateChapterPage

  function handleEditChapter(chapterId: string) {
    setIsCreatingMode(false); // Chuyển sang chế độ edit
    setCurrentEditingId(chapterId); // Lưu id đang edit
    setChapters(
      (prev) => prev.map((c) => ({ ...c, isActive: c.id === chapterId })) // Đánh dấu chương đang edit
    );

    fetchChapterData(chapterId); // Gọi API lấy dữ liệu chapter để fill form
  }

  function updateChaptersState(newChapter: any) {
    setChapters((prev) => [
      ...prev,
      {
        id: newChapter._id,
        title: newChapter.title,
        number: newChapter.order,
        price: newChapter.price ?? 0,
        is_published: !!newChapter.is_published,
        isActive: false,
      },
    ]);
  }

  function resetForm() {
    setTitle("");
    setNumber(chapters.length + 2);
    setContent("");
    setPrice(0);
    setImageFiles([]);
    setDirty(false);
    setIsCreatingMode(true);
    setCurrentEditingId(null);
    setChapters((prev) => prev.map((c) => ({ ...c, isActive: false })));
  }

  function handleDiscard() {
    if (isCreatingMode) {
      setTitle("");
      setNumber(chapters.length + 1);
      setContent("");
      setPrice(0);
      setImageFiles([]);
    } else {
      // If editing, reload the original data
      if (currentEditingId) {
        fetchChapterData(currentEditingId);
      }
    }
    setDirty(false);
    setErrors({});
  }

  function handleStartNewChapter() {
    setIsCreatingMode(true);
    resetForm();
  }

  // Delete chapter
  async function handleDelete(id: string) {
    if (!confirm("Xoá chương này (và toàn bộ nội dung)?")) return;
    try {
      await api.delete(`/image-chapter/${id}`);
      setChapters((prev) => prev.filter((c) => c.id !== id));

      // If currently editing this chapter, switch to create mode
      if (currentEditingId === id) {
        handleStartNewChapter();
      }
    } catch (err) {
      console.error("Lỗi xoá chương", err);
      alert("Lỗi xoá chương");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="hidden md:flex w-80 bg-white/80 backdrop-blur border-r border-slate-200 flex-col">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-slate-900 tracking-tight">
                  ChapterForge
                </h1>
                <p className="text-xs text-slate-500">
                  Quản lý chương truyện tranh
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {isCreatingMode ? "Tạo chương mới" : "Chỉnh sửa chương"}
                </h2>
                <p className="text-xs text-slate-500">
                  {isCreatingMode
                    ? "Bạn đang tạo một chương mới"
                    : `Đang chỉnh sửa chương ${number}`}
                </p>
              </div>
              <span
                className={`px-2 py-1 text-[10px] rounded-full ${
                  dirty
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
                title={dirty ? "Chưa lưu thay đổi" : "Đã sẵn sàng"}
              >
                {dirty ? "chưa lưu" : "sẵn sàng"}
              </span>
            </div>
          </div>

          <section className="flex-1 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Danh sách chương
              </h3>
              <button
                onClick={handleStartNewChapter}
                disabled={isCreatingMode}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                  isCreatingMode
                    ? "border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                }`}
                title={
                  isCreatingMode ? "Đang ở chế độ tạo mới" : "Tạo chương mới"
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Tạo mới
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {/* Tip */}
              <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/60 p-4">
                <div className="flex items-center gap-2 text-xs text-blue-800">
                  <span className="font-medium">Mẹo nhanh</span>
                  <ChevronRight className="h-3 w-3" />
                  <span>
                    {isCreatingMode
                      ? "Upload ảnh và sắp xếp theo thứ tự, sau đó tạo chương."
                      : "Chỉnh sửa nội dung và nhấn Cập nhật để lưu thay đổi."}
                  </span>
                </div>
              </div>

              {/* Loading indicator for chapter data */}
              {isLoadingChapter && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4">
                  <div className="flex items-center gap-2 text-xs text-blue-800">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Đang tải dữ liệu chương...</span>
                  </div>
                </div>
              )}

              {/* Skeleton */}
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
                      className={`p-3 rounded-xl border bg-white transition-all hover:shadow-sm ${
                        chapter.isActive
                          ? "border-blue-300 ring-2 ring-blue-100 bg-blue-50/30"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[11px] font-medium text-slate-500">
                              Ch. {chapter.number}
                            </span>
                            {chapter.is_published ? (
                              <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Công khai
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                Nháp
                              </span>
                            )}
                            {chapter.isActive && (
                              <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                Đang sửa
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-medium text-slate-900 truncate">
                            {chapter.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleEditChapter(chapter.id)}
                            disabled={chapter.isActive}
                            className={`p-1.5 rounded-lg transition-colors ${
                              chapter.isActive
                                ? "bg-blue-50 text-blue-600 cursor-not-allowed"
                                : "hover:bg-slate-100 text-slate-600"
                            }`}
                            title={
                              chapter.isActive ? "Đang chỉnh sửa" : "Sửa chương"
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(chapter.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Xoá chương"
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
        <main className="flex-1 flex flex-col">
          {/* Glass header */}
          <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
              {/* Breadcrumb + Back */}
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <button
                  onClick={() => (window.location.href = "/author/dashboard")}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Bảng điều khiển
                </button>
              </div>

              {/* Chapter meta + dirty + mode indicator */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-600">
                  {isCreatingMode ? `Ch. ${number} (mới)` : `Ch. ${number}`}
                </span>
                {dirty && (
                  <span className="text-[11px] text-amber-600">• chưa lưu</span>
                )}
                {isLoadingChapter && (
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDiscard}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  title={isCreatingMode ? "Huỷ tạo mới" : "Hoàn tác thay đổi"}
                >
                  {isCreatingMode ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {isCreatingMode ? "Huỷ" : "Hoàn tác"}
                </button>

                <button
                  onClick={handleSaveDraft}
                  disabled={isPending || !mangaId}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isPending
                    ? "Đang lưu..."
                    : isCreatingMode
                    ? "Lưu bản nháp"
                    : "Lưu thay đổi"}
                </button>

                <button
                  onClick={handleCreateOrUpdate}
                  disabled={isPending || !mangaId}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title={
                    !mangaId
                      ? "Thêm mangaId vào URL trước"
                      : isCreatingMode
                      ? "Tạo chương"
                      : "Cập nhật chương"
                  }
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {isPending
                    ? isCreatingMode
                      ? "Đang tạo..."
                      : "Đang cập nhật..."
                    : isCreatingMode
                    ? "Tạo chương"
                    : "Cập nhật chương"}
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Chapter Info Section - Constrained Width */}
            <div className="p-4 sm:p-6">
              <div className="mx-auto w-full max-w-4xl">
                {/* Details card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <div className="p-5 border-b border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-800">
                      Thông tin chương
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {isCreatingMode
                        ? "Thông tin cơ bản cho chương mới"
                        : "Chỉnh sửa thông tin chương hiện tại"}
                    </p>
                  </div>

                  <div className="p-5 space-y-5">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Tiêu đề <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          setDirty(true);
                        }}
                        placeholder="Nhập tiêu đề cho chương…"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-400"
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                          Ngắn gọn, mô tả đúng nội dung
                        </p>
                        {errors.title && (
                          <p className="text-xs text-red-600">{errors.title}</p>
                        )}
                      </div>
                      {errors.manga && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors.manga}
                        </p>
                      )}
                    </div>

                    {/* Number & Price */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Số chương <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={number}
                          onChange={(e) => {
                            setNumber(
                              Number.parseInt(e.target.value || "0", 10)
                            );
                            setDirty(true);
                          }}
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                        {errors.number && (
                          <p className="mt-2 text-xs text-red-600">
                            {errors.number}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Giá (VND)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="1000"
                          value={price}
                          onChange={(e) => {
                            setPrice(
                              Number.parseInt(e.target.value || "0", 10)
                            );
                            setDirty(true);
                          }}
                          placeholder="0"
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-400"
                        />
                        <p className="mt-2 text-xs text-slate-500">
                          Để 0 nếu miễn phí
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full border-t border-slate-200">
              <div className="p-4 sm:p-6 space-y-6">
                <div className="flex items-center justify-between max-w-6xl mx-auto">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">
                      Ảnh chương truyện
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {isCreatingMode
                        ? "Upload và sắp xếp ảnh theo thứ tự đọc (tối thiểu 1 ảnh)"
                        : "Chỉnh sửa và sắp xếp lại ảnh trong chương"}
                    </p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    {isCreatingMode ? "Upload ảnh" : "Thêm ảnh"}
                  </button>
                </div>
                {errors.images && (
                  <p className="text-sm text-red-600 max-w-6xl mx-auto">
                    {errors.images}
                  </p>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />

                {imageFiles.length === 0 ? (
                  <div className="max-w-6xl mx-auto">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 rounded-xl p-16 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer bg-white"
                    >
                      <ImageIcon className="h-16 w-16 text-slate-400 mx-auto mb-6" />
                      <h4 className="text-lg font-medium text-slate-700 mb-3">
                        {isCreatingMode
                          ? "Chưa có ảnh nào"
                          : "Chương này chưa có ảnh"}
                      </h4>
                      <p className="text-sm text-slate-500 mb-6">
                        Kéo thả hoặc nhấn để chọn nhiều ảnh
                      </p>
                      <button className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                        <Upload className="h-5 w-5" />
                        Chọn ảnh
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-6xl mx-auto space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-medium text-slate-700">
                        {imageFiles.length} ảnh{" "}
                        {isCreatingMode ? "đã chọn" : "trong chương"}
                      </span>
                      <span className="text-sm text-slate-500">
                        Kéo thả để sắp xếp lại hoặc dùng các nút di chuyển
                      </span>
                    </div>

                    <div ref={imageContainerRef} className="space-y-3">
                      {imageFiles
                        .sort((a, b) => a.order - b.order)
                        .map((imageFile, index) => (
                          <div
                            key={imageFile.id}
                            className={`flex items-start gap-6 p-6 bg-white border rounded-xl hover:bg-slate-50 transition-colors cursor-move shadow-sm ${
                              imageFile.isExisting
                                ? "border-slate-200"
                                : "border-blue-200 ring-1 ring-blue-100"
                            }`}
                          >
                            {/* Position field */}
                            <div className="text-sm font-mono w-12 text-center mt-2">
                              {showPositionInput === imageFile.id ? (
                                <input
                                  type="number"
                                  min="1"
                                  max={imageFiles.length}
                                  value={targetPosition}
                                  onChange={(e) =>
                                    setTargetPosition(e.target.value)
                                  }
                                  onKeyDown={(e) =>
                                    handlePositionKeyPress(
                                      e,
                                      imageFile.id,
                                      index
                                    )
                                  }
                                  onBlur={() => {
                                    setShowPositionInput(null);
                                    setTargetPosition("");
                                  }}
                                  className="w-12 h-8 text-sm text-center border border-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm transition-all"
                                  autoFocus
                                />
                              ) : (
                                <button
                                  onClick={() => {
                                    setShowPositionInput(imageFile.id);
                                    setTargetPosition((index + 1).toString());
                                  }}
                                  className="w-12 h-8 text-sm font-mono text-slate-700 border border-slate-300 bg-slate-50 rounded-md hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 shadow-sm transition-all"
                                  title="Nhấn để nhập vị trí mong muốn"
                                >
                                  {index + 1}
                                </button>
                              )}
                            </div>

                            <div className="flex-1">
                              <img
                                src={imageFile.preview || "/placeholder.svg"}
                                alt={`Preview ${index + 1}`}
                                className="w-full max-w-4xl mx-auto object-contain rounded-lg border shadow-sm"
                                style={{ maxHeight: "90vh" }}
                              />
                              <div className="mt-4 text-center">
                                <p className="text-sm font-medium text-slate-700">
                                  {imageFile.isExisting
                                    ? `Ảnh ${index + 1} (hiện tại)`
                                    : imageFile.file?.name ||
                                      `Ảnh ${index + 1}`}
                                </p>
                                {imageFile.file && (
                                  <p className="text-xs text-slate-500 mt-1">
                                    {(
                                      imageFile.file.size /
                                      1024 /
                                      1024
                                    ).toFixed(1)}{" "}
                                    MB
                                  </p>
                                )}
                                {imageFile.isExisting && (
                                  <span className="inline-block mt-2 px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-full">
                                    Ảnh gốc
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col items-center gap-2 flex-shrink-0">
                              {/* Quick move buttons */}
                              <div className="flex flex-col items-center gap-1 border-b border-slate-200 pb-3">
                                <button
                                  onMouseDown={() =>
                                    handleMouseDownMoveToPosition(
                                      index,
                                      "first"
                                    )
                                  }
                                  onMouseUp={stopAutoScroll}
                                  onMouseLeave={stopAutoScroll}
                                  disabled={index === 0}
                                  className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Di chuyển lên đầu"
                                >
                                  <ChevronsUp className="h-8 w-8 text-slate-600" />
                                </button>

                                <button
                                  onMouseDown={() =>
                                    handleMouseDownMove(index, "up")
                                  }
                                  onMouseUp={stopAutoScroll}
                                  onMouseLeave={stopAutoScroll}
                                  disabled={index === 0}
                                  className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Di chuyển lên 1 vị trí"
                                >
                                  <ChevronUp className="h-8 w-8 text-slate-600" />
                                </button>
                                <button
                                  onMouseDown={() =>
                                    handleMouseDownMove(index, "down")
                                  }
                                  onMouseUp={stopAutoScroll}
                                  onMouseLeave={stopAutoScroll}
                                  disabled={index === imageFiles.length - 1}
                                  className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Di chuyển xuống 1 vị trí"
                                >
                                  <ChevronDown className="h-8 w-8 text-slate-600" />
                                </button>

                                <button
                                  onMouseDown={() =>
                                    handleMouseDownMoveToPosition(index, "last")
                                  }
                                  onMouseUp={stopAutoScroll}
                                  onMouseLeave={stopAutoScroll}
                                  disabled={index === imageFiles.length - 1}
                                  className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Di chuyển xuống cuối"
                                >
                                  <ChevronsDown className="h-8 w-8 text-slate-600" />
                                </button>
                              </div>

                              <div className="flex flex-col items-center gap-2 border-b border-slate-200 pb-3">
                                <span className="text-base text-slate-500">
                                  Đến:
                                </span>
                                <button
                                  onClick={() => {
                                    setShowPositionInput(imageFile.id);
                                    setTargetPosition("");
                                  }}
                                  className="px-3 py-1.5 text-base bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                                  title="Nhập vị trí cụ thể (ví dụ: ảnh 15 → vị trí 5)"
                                >
                                  Vị trí
                                </button>
                              </div>

                              <button
                                onClick={() => removeImage(imageFile.id)}
                                className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                                title="Xoá ảnh"
                              >
                                <Trash2 className="h-8 w-8" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
