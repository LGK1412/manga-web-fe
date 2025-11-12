"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import NativeRichEditor from "@/components/NativeRichEditor";


// ---- Axios instance (trỏ tới NestJS)
const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api`,
});

// ---- Types
interface Chapter {
  id: string; // chapter._id
  title: string; // chapter.title
  isActive: boolean; // UI only
  number: number; // chapter.order
  price: number; // chapter.price
  isPublished: boolean; // chapter.is_published
}

// ---- Helpers
function clsx(...classes: Array<string | boolean | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}
function countWords(text: string) {
  const cleaned = text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return 0;
  return cleaned.split(" ").length;
}

// ---- Page
export default function CreateChapterPage({
  params,
}: {
  params: Promise<{ idStory: string }>;
}) {
  const { idStory } = use(params);
  const mangaId = idStory;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Loading
  const [isLoadingList, setIsLoadingList] = useState(true);

  // State
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [title, setTitle] = useState("");
  const [number, setNumber] = useState<number>(1);
  const [content, setContent] = useState("");
  const [errors, setErrors] = useState<{
    title?: string;
    number?: string;
    manga?: string;
  }>({});
  const [dirty, setDirty] = useState(false);
  const [price, setPrice] = useState<number>(0);

  // Word counter
  const liveWordCount = useMemo(() => countWords(content), [content]);

  // --- GET: load chapters by mangaId
  useEffect(() => {
    let mounted = true;
    async function fetchChapters() {
      if (!mangaId) return;
      try {
        setIsLoadingList(true);
        const res = await api.get(`/text-chapter/${mangaId}`);
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
        setNumber(mapped.length + 1); // gợi ý số chương tiếp theo
      } catch (err) {
        console.error("Lỗi tải danh sách chương", err);
      } finally {
        if (mounted) setIsLoadingList(false);
      }
    }
    fetchChapters();
    return () => {
      mounted = false;
    };
  }, [mangaId]);

  // Validate form
  function validate() {
    const next: typeof errors = {};
    if (!mangaId) next.manga = "Thiếu mangaId trên URL";
    if (!title.trim()) next.title = "Tiêu đề là bắt buộc";
    if (!Number.isFinite(number) || number <= 0)
      next.number = "Số chương phải > 0";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // Save draft (POST with isPublished: false)
  async function handleSaveDraft() {
    if (!validate()) return;
    startTransition(async () => {
      try {
        const res = await api.post(`/text-chapter`, {
          title,
          order: number,
          price,
          isPublished: false, // lưu nháp
          content,
          manga_id: mangaId,
        });

        const newChapter = res.data?.chapter;
        if (!newChapter?._id) throw new Error("Phản hồi không hợp lệ");

        setChapters((prev) => [
          ...prev,
          {
            id: newChapter._id,
            title: newChapter.title,
            number: newChapter.order,
            price: newChapter.price ?? 0,
            isPublished: !!newChapter.is_published,
            isActive: false,
          },
        ]);

        // Clear form
        setTitle("");
        setNumber(chapters.length + 2);
        setContent("");
        setPrice(0);
        setDirty(false);

        router.push(`/author/chapter/${mangaId}/textChapter/create`);
      } catch (err) {
        console.error("Lỗi lưu bản nháp", err);
        alert("Lỗi lưu bản nháp");
      }
    });
  }

  // Create chapter (POST with isPublished: true)
  async function handleCreate() {
    if (!validate()) return;
    startTransition(async () => {
      try {
        const payload = {
          title,
          order: number,
          price,
          isPublished: true, // tạo & công khai
          content,
          manga_id: mangaId,
        };
        const res = await api.post(`/text-chapter`, payload);

        const newChapter = res.data?.chapter;
        if (!newChapter?._id) throw new Error("Phản hồi không hợp lệ");

        setChapters((prev) => [
          ...prev,
          {
            id: newChapter._id,
            title: newChapter.title,
            number: newChapter.order,
            price: newChapter.price ?? 0,
            isPublished: !!newChapter.is_published,
            isActive: false,
          },
        ]);

        // Clear form
        setTitle("");
        setNumber(chapters.length + 2);
        setContent("");
        setPrice(0);
        setDirty(false);

        router.push(`/author/chapter/${mangaId}/textChapter/create`);
      } catch (err) {
        console.error("Lỗi tạo chương", err);
        alert("Lỗi tạo chương");
      }
    });
  }

  function handleDiscard() {
    setTitle("");
    setNumber(chapters.length + 1);
    setContent("");
    setPrice(0);
    setDirty(false);
    setErrors({});
  }

  // Delete chapter
  async function handleDelete(id: string) {
    if (!confirm("Xoá chương này (và toàn bộ nội dung)?")) return;
    try {
      await api.delete(`/text-chapter/${id}`);
      setChapters((prev) => prev.filter((c) => c.id !== id));
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
                <p className="text-xs text-slate-500">Quản lý chương chữ</p>
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Tạo chương mới
                </h2>
                <p className="text-xs text-slate-500">
                  Bạn đang tạo một chương mới
                </p>
                {!mangaId && (
                  <p className="text-xs text-red-600 mt-1">
                    Thêm <code>mangaId</code> vào URL để bật chức năng tạo
                  </p>
                )}
              </div>
              <span
                className={clsx(
                  "text-[10px] px-2 py-0.5 rounded-full border",
                  dirty
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                )}
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
              <Link
                href={`/author/chapter/${mangaId}/textChapter/create`}
                aria-label="Đi tới trang tạo"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Tạo mới
              </Link>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {/* Tip */}
              <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/60 p-4">
                <div className="flex items-center gap-2 text-xs text-blue-800">
                  <span className="font-medium">Mẹo nhanh</span>
                  <ChevronRight className="h-3 w-3" />
                  <span>Điền thông tin bên phải rồi bấm “Tạo chương”.</span>
                </div>
              </div>

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
                      className="p-3 rounded-xl border bg-white transition-all border-slate-200 hover:border-slate-300 hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[11px] font-medium text-slate-500">
                              Ch. {chapter.number}
                            </span>
                            {chapter.isPublished ? (
                              <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Công khai
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                Nháp
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-medium text-slate-900 truncate">
                            {chapter.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/author/chapter/${mangaId}/textChapter/edit/${chapter.id}`}
                            className="p-1.5 rounded-lg hover:bg-slate-100"
                            title="Sửa chương"
                          >
                            <Edit className="h-4 w-4 text-slate-600" />
                          </Link>
                          <button
                            onClick={() => handleDelete(chapter.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50"
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
                  onClick={() => router.push("/author/dashboard")}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Bảng điều khiển
                </button>
              </div>

              {/* Chapter meta + dirty */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-600">
                  Ch. {number}
                </span>
                {dirty && (
                  <span className="text-[11px] text-amber-600">• chưa lưu</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDiscard}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                  Huỷ
                </button>

                <button
                  onClick={handleSaveDraft}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 hover:bg-slate-50"
                >
                  <Save className="h-4 w-4" />
                  Lưu bản nháp
                </button>

                <button
                  onClick={handleCreate}
                  disabled={isPending || !mangaId}
                  title={!mangaId ? "Thêm mangaId vào URL trước" : "Tạo chương"}
                  className={clsx(
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-white shadow-sm",
                    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                    isPending || !mangaId
                      ? "bg-blue-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {isPending ? "Đang tạo..." : "Tạo chương"}
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl space-y-6">
              {/* Details card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="p-5 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Thông tin chương
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Thông tin cơ bản cho chương mới
                  </p>
                </div>

                <div className="p-5 space-y-5">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Tiêu đề <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setDirty(true);
                      }}
                      placeholder="Đặt tiêu đề cho chương…"
                      className={clsx(
                        "mt-1 w-full rounded-xl border px-3.5 py-2.5 text-slate-900 placeholder-slate-400",
                        "focus:outline-none focus:ring-2 focus:ring-blue-200",
                        errors.title ? "border-red-300" : "border-slate-300"
                      )}
                    />
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-[11px] text-slate-500">
                        Ngắn gọn, mô tả đúng nội dung
                      </p>
                      {errors.title && (
                        <p className="text-[11px] text-red-600">
                          {errors.title}
                        </p>
                      )}
                    </div>
                    {errors.manga && (
                      <p className="mt-1 text-[11px] text-red-600">
                        {errors.manga}
                      </p>
                    )}
                  </div>

                  {/* Number & Price */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Số chương
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={number}
                        onChange={(e) => {
                          setNumber(parseInt(e.target.value || "0", 10));
                          setDirty(true);
                        }}
                        className={clsx(
                          "mt-1 w-full rounded-xl border px-3.5 py-2.5 text-slate-900",
                          "focus:outline-none focus:ring-2 focus:ring-blue-200",
                          errors.number ? "border-red-300" : "border-slate-300"
                        )}
                      />
                      {errors.number && (
                        <p className="mt-1 text-[11px] text-red-600">
                          {errors.number}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Point
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="1000"
                        value={price}
                        onChange={(e) => {
                          setPrice(parseInt(e.target.value || "0", 10));
                          setDirty(true);
                        }}
                        placeholder="Không bắt buộc"
                        className="mt-1 w-full rounded-xl border px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200 border-slate-300"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">
                        Để 0 nếu miễn phí
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="text-sm text-slate-700 font-medium">
                    Nội dung
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-[11px] text-slate-500">
                      {liveWordCount} từ
                    </div>
                  </div>
                </div>
                <div className="p-5 text-black">
                  <NativeRichEditor
                    value={content} 
                    onChange={(html) => {
                      setContent(html);
                      setDirty(true);
                    }}
                    placeholder="Bắt đầu viết câu chuyện của bạn…"
                    className="w-full"
                    minHeight={320}
                  />

                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-[11px] text-slate-500">
                      Bạn có thể chỉnh sửa hoặc đăng sau ở trang chỉnh sửa.
                    </p>
                    {dirty && (
                      <span className="text-[11px] text-amber-600">
                        Chưa lưu
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pb-8" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
