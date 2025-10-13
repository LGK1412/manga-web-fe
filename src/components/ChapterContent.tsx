"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";

type Chapter = {
  _id: string;
  title: string;
  type: "text" | "image" | "unknown";
  content?: string | null;
  images?: string[];
};

export default function ChapterContent() {
  const { id } = useParams();
  const [chapter, setChapter] = useState<Chapter | null>(null);

  useEffect(() => {
    if (!id) return;
    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL}/api/Chapter/content/${id}`)
      .then((res) => setChapter(res.data))
      .catch((err) => console.error(err));
  }, [id]);
  console.log("Chapter:", JSON.stringify(chapter, null, 2));

  if (!chapter) return <p className="text-center mt-10">Đang tải chương...</p>;

  return (
    <div
      id="chapter-content"
      className="prose prose-lg mx-auto min-h-screen max-w-3xl px-4 py-8 text-gray-800 dark:text-gray-100"
    >
      {/* Tiêu đề chương */}
      <div className="mb-8 border-b border-gray-300 pb-4 text-center">
        <h2 className="text-2xl font-bold tracking-wide text-gray-900 dark:text-white">
          {chapter.title}
        </h2>
        {/* <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {chapter.updatedAt
            ? new Date(chapter.updatedAt).toLocaleDateString("vi-VN")
            : ""}
        </p> */}
      </div>

      {/* Nội dung chương */}
      {chapter.type === "text" ? (
        <article
          className="prose prose-lg leading-relaxed text-justify dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: chapter.content || "" }}
        />
      ) : chapter.type === "image" ? (
        <div className="flex flex-col items-center gap-4">
          {chapter.images?.map((img, i) => (
            <figure
              key={i}
              className="relative overflow-hidden rounded-xl shadow-md transition-transform hover:scale-[1.01]"
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
