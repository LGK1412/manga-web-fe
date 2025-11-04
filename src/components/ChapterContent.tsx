"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import TTSReader from "./TTSReader";
import translateWithGemini from "./Aitranlation";

type Chapter = {
  _id: string;
  title: string;
  type: "text" | "image" | "unknown";
  content?: string | null;
  images?: string[];
};

export default function ChapterContent() {
  const { id } = useParams();
  const [chapterInfo, setChapterInfo] = useState<Omit<
    Chapter,
    "content"
  > | null>(null);

  // "Default" - Bất biến, chỉ dùng để dịch
  const [originalContent, setOriginalContent] = useState<string | null>(null);
  // "Final" - Dùng để hiển thị (article) và để đọc (TTS)
  const [finalContent, setFinalContent] = useState<string | null>(null);

  const [targetLang, setTargetLang] = useState("");
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL}/api/Chapter/content/${id}`)
      .then((res) => {
        const data: Chapter = res.data;
        const { content, ...info } = data;
        setChapterInfo(info);

        if (data.type === "text" && data.content) {
          setOriginalContent(data.content);
          setFinalContent(data.content);
        }
      })
      .catch((err) => console.error(err));
  }, [id]);

  // === ĐÃ SỬA LỖI CÚ PHÁP TẠI ĐÂY ===
  const handleTranslate = async () => {
    // 3. Dùng "default" (originalContent) để dịch
    if (!targetLang || !originalContent) return;
    setTranslating(true);
    setError("");

    try {
      const result = await translateWithGemini(originalContent, targetLang);
      if (typeof result === "string") {
        // 4. Set kết quả vào "final" (finalContent)
        setFinalContent(result);
      } else {
        setError("Lỗi: Kết quả dịch không hợp lệ.");
      }
    } catch (err: any) {
      // <-- Sửa lỗi: Xóa <[number]>
      console.error("Translate error:", err);
      setError(err?.message ?? "Đã xảy ra lỗi khi dịch");
    }
    setTranslating(false);
  };
  // ====================================

  // 5. TTS dùng "final" (finalContent)
  const plainText = finalContent?.replace(/<[^>]*>/g, "") || "";

  const isTextChapter = !!originalContent;

  const isTranslated = isTextChapter && finalContent !== originalContent;

  if (!chapterInfo)
    return <p className="text-center mt-10">Đang tải chương...</p>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Tiêu đề */}
      <div className="mb-8 border-b border-gray-300 pb-4 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {chapterInfo.title}
        </h2>
      </div>

      {/* Nếu là chương text */}
      {chapterInfo.type === "text" ? (
        <>
          {/* TTS (Luôn đọc "finalContent") */}
          <TTSReader text={plainText} />

          {/* AI translation (Luôn dịch "originalContent") */}
          <div className="mt-8 p-4 border rounded-lg">
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                placeholder="Target language (e.g., English, vi)"
                className="flex-1 px-3 py-2 border rounded"
              />
              <button
                onClick={handleTranslate}
                disabled={translating || !targetLang}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
              >
                {translating ? "Đang dịch..." : "Dịch"}
              </button>
            </div>

            {error && <div className="text-red-600 mb-3">{error}</div>}

            {/* Chỉ hiển thị nút "Xem lại" nếu nội dung đã bị thay đổi */}
            {isTranslated && (
              <button
                onClick={() => setFinalContent(originalContent)} // Reset "final" về "default"
                className="px-3 py-1 rounded border"
              >
                Xem lại nội dung gốc
              </button>
            )}
          </div>

          {/* Nội dung (Luôn hiển thị "finalContent") */}
          <article
            className="prose prose-lg leading-relaxed text-justify dark:prose-invert mt-6"
            dangerouslySetInnerHTML={{ __html: finalContent || "" }}
          />
        </>
      ) : chapterInfo.type === "image" ? (
        <div className="flex flex-col items-center gap-4">
          {chapterInfo.images?.map((img, i) => (
            <figure
              key={i}
              className="relative overflow-hidden rounded-xl shadow-md"
            >
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL}${img}`}
                alt={`Trang ${i + 1}`}
                className="w-full max-w-[900px] rounded-xl object-contain"
                loading="lazy"
              />
            </figure>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 dark:text-gray-400">
          Không có nội dung hiển thị.
        </p>
      )}
    </div>
  );
}
