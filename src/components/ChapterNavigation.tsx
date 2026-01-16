"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";

type Chapter = {
  _id: string;
  title: string;
  order: number;
  is_published: boolean;
};

export default function ChapterNavigation() {
  const { id } = useParams();
  const router = useRouter();
  const [nextId, setNextId] = useState<string | null>(null);
  const [prevId, setPrevId] = useState<string | null>(null);
  const [chapterList, setChapterList] = useState<Chapter[]>([]);

  useEffect(() => {
    if (!id) return;

    // --- Lấy chương trước/sau ---
    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL}/api/Chapter/checkchapter/${id}`)
      .then((res) => {
        setNextId(res.data.nextId);
        setPrevId(res.data.prevId);
      })
      .catch(console.error);

    // --- Lấy danh sách chương ---
    axios
      .get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chapter/checkchapterList/${id}`
      )
      .then((res) => {
        setChapterList(res.data || []);
      })
      .catch(console.error);
  }, [id]);

  return (
    <div className="mt-10 flex flex-col items-center gap-6">
      {/* ===== Navigation Buttons ===== */}
      <div className="flex w-full max-w-md justify-between">
        <button
          disabled={!prevId}
          onClick={() => prevId && router.push(`/chapter/${prevId}`)}
          className="flex-1 rounded-l-lg bg-gray-100 px-4 py-2 font-medium hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          ← Previous
        </button>
        <button
          disabled={!nextId}
          onClick={() => nextId && router.push(`/chapter/${nextId}`)}
          className="flex-1 rounded-r-lg bg-gray-100 px-4 py-2 font-medium hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          Next →
        </button>
      </div>

      {/* ===== Chapter List (Vertical Scroll) ===== */}
      {chapterList.length > 0 && (
        <div className="w-full max-w-3xl rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 text-center text-lg font-semibold text-gray-800 dark:text-gray-100">
          Chapter List ({chapterList.length})
          </h3>

          <div className="max-h-[420px] overflow-y-auto rounded-md border border-gray-100 dark:border-gray-700">
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {chapterList.map((ch) => (
                <li
                  key={ch._id}
                  onClick={() => router.push(`/chapter/${ch._id}`)}
                  className={`flex cursor-pointer items-center justify-between px-4 py-3 text-sm transition-colors ${
                    ch._id === id
                      ? "bg-blue-600 text-white font-semibold"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                  }`}
                >
                  <span className="truncate">
                    Chapter {ch.order}: {ch.title}
                  </span>
                  {ch.is_published ? (
                    <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-800 dark:text-green-300">
                      Public
                    </span>
                  ) : (
                    <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                      Draft
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
