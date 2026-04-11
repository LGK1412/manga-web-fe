"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import PointRuleDialog from "@/components/PointRuleDialog";

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
}

// ---- Helpers
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

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Loading states
  const [isLoadingList, setIsLoadingList] = useState(true);

  // Form State
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [title, setTitle] = useState("");
  const [number, setNumber] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);
  const [isPublished, setIsPublished] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [images, setImages] = useState<ImageFile[]>([]);

  const [errors, setErrors] = useState<{
    title?: string;
    number?: string;
    manga?: string;
    images?: string;
  }>({});
  const [dirty, setDirty] = useState(false);

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

  async function handleCreateNew() {
    setIsEditMode(false);
    setEditingId(null);

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
      const res = await api.get(`/image-chapter/id/${id}`);
      const data = res.data?.data;

      setIsEditMode(true);
      setEditingId(id);
      setErrors({});

      setTitle(data.title);
      setNumber(data.order);
      setPrice(data.price || 0);
      setIsPublished(data.is_published);

      // Xử lý hiển thị ảnh cũ
      const existingImages =
        data.images?.[0]?.images?.map((imgName: string) => ({
          id: crypto.randomUUID(),
          previewUrl: `${process.env.NEXT_PUBLIC_API_URL}/uploads/image-chapters/${id}/${imgName}`,
          isExisting: true,
        })) || [];

      setImages(existingImages);
      setDirty(false);

      // Cuộn lên đầu form
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      alert("Could not load chapter data");
    }
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
          // --- UPDATE ---
          const existingImages = images
            .filter((img) => img.isExisting)
            .map((img, index) => ({
              url: img.previewUrl,
              order: index,
            }));

          const newImagesMeta = images
            .filter((img) => !img.isExisting)
            .map((img, index) => ({
              originalname: img.file?.name,
              order: index,
            }));

          formData.append("existing_images", JSON.stringify(existingImages));
          formData.append("new_images_meta", JSON.stringify(newImagesMeta));

          images.forEach((img) => {
            if (!img.isExisting && img.file) {
              formData.append("images", img.file);
            }
          });

          await api.patch(`/image-chapter/${editingId}`, formData);

          alert("Update successful!");
          setDirty(false); // không reset form khi edit
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
    setTitle("");
    setNumber(chapters.length + 1);
    setImages([]);
    setPrice(0);
    setIsPublished(false);
    setDirty(false);
    setErrors({});
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this chapter?")) return;
    try {
      await api.delete(`/image-chapter/${id}`);
      setChapters((prev) => prev.filter((c) => c.id !== id));
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
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
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

              {/* Image Upload Card (Thay cho RichEditor) */}
              {/* Image Upload Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="p-5 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">
                        Chapter Images
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Upload images in reading order
                      </p>
                    </div>

                    <label className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 cursor-pointer">
                      <UploadCloud className="h-4 w-4" />
                      Upload Images
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {errors.images && (
                    <p className="text-xs text-red-600 mt-2">{errors.images}</p>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  {images.length === 0 && (
                    <label className="flex flex-col items-center justify-center gap-3 py-14 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-all">
                      <UploadCloud className="h-8 w-8 text-slate-400" />

                      <div className="text-center">
                        <p className="text-sm font-medium text-slate-700">
                          Upload chapter images
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Click to upload or drag and drop
                        </p>
                      </div>

                      <span className="text-xs text-blue-600 font-medium">
                        Supports multiple images
                      </span>

                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}

                  {images.map((img, index) => (
                    <div
                      key={img.id}
                      className="group relative border border-slate-200 rounded-xl p-3 bg-white hover:border-blue-300 transition-all shadow-sm"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500">
                            Image {index + 1}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => moveImage(index, "up")}
                            disabled={index === 0}
                            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-20 text-slate-600"
                          >
                            <ArrowLeft className="h-4 w-4 rotate-90" />
                          </button>

                          <button
                            onClick={() => moveImage(index, "down")}
                            disabled={index === images.length - 1}
                            className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-20 text-slate-600"
                          >
                            <ArrowLeft className="h-4 w-4 -rotate-90" />
                          </button>

                          <button
                            onClick={() => removeImage(img.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Image */}
                      <div className="w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                        <img
                          src={img.previewUrl}
                          alt={`Page ${index + 1}`}
                          className="w-full object-contain max-h-[600px]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pb-10" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
