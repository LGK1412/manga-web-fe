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
    <div id="chapter-content" className="prose mx-auto py-4 min-h-screen">
      {chapter.type === "text" ? (
        <div
          className="w-full"
          dangerouslySetInnerHTML={{ __html: chapter.content || "" }}
        />
      ) : chapter.type === "image" ? (
        <div className="flex flex-col items-center gap-2">
          {chapter.images?.map((img, i) => (
            <img
              key={i}
              src={`${process.env.NEXT_PUBLIC_API_URL}${img}`}
              alt={`Page ${i + 1}`}
              className="w-full max-w-[800px] rounded-md shadow-sm"
              loading="lazy"
            />
          ))}
        </div>
      ) : (
        <p>Không có nội dung hiển thị.</p>
      )}
    </div>
  );
}
