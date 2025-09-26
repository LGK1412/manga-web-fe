"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Eye, BookOpen, Star, Calendar, ArrowRight } from "lucide-react";

interface Author {
  _id: string;
  username: string;
  avatar?: string;
}

interface Chapter {
  _id: string;
  title: string;
  order: number;
}

interface MangaDetail {
  _id: string;
  title: string;
  summary: string;
  coverImage?: string;
  author: Author;
  views: number;
  chapters: Chapter[];
}

export default function MangaDetailPage() {
  const params = useParams();
  const mangaId = params?.id as string;

  const [manga, setManga] = useState<MangaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mangaId) return;

    setLoading(true);
    setError(null);
    axios
      .get<MangaDetail>(
        `${process.env.NEXT_PUBLIC_API_URL}/api/manga/detail/${mangaId}`
      )
      .then((res) => {
        const data = res.data;
        setManga({
          ...data,
          chapters: Array.isArray(data.chapters) ? data.chapters : [],
        });
      })
      .catch((err) => {
        console.error("Lỗi khi fetch manga:", err);
        setError(err.response?.data?.message || "Không thể tải dữ liệu");
      })
      .finally(() => setLoading(false));
  }, [mangaId]);

  if (loading) {
    return <p className="text-center mt-10">Đang tải dữ liệu...</p>;
  }

  if (error) {
    return <p className="text-center mt-10 text-red-600">{error}</p>;
  }

  if (!manga) {
    return <p className="text-center mt-10">Không tìm thấy truyện.</p>;
  }

  return (
    <div className="bg-white min-h-screen">
      <Navbar />
      <div className="pt-16 max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Manga Info Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Cover Image */}
            <div className="flex-shrink-0">
              {manga.coverImage ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL}/assets/coverImages/${manga.coverImage}`}
                  alt={manga.title}
                  className="w-48 h-64 object-cover rounded border"
                />
              ) : (
                <div className="w-48 h-64 flex items-center justify-center bg-gray-100 rounded border text-gray-500">
                  <div className="text-center">
                    <BookOpen className="w-12 h-12 mx-auto mb-2" />
                    <p>No Image</p>
                  </div>
                </div>
              )}
            </div>

            {/* Manga Details */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-black mb-2">
                {manga.title}
              </h1>

              <div className="flex items-center gap-3 mb-4">
                <div>Tác giả:</div>
                <span className="text-gray-700 font-medium">
                  {manga.author.username}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-gray-600">
                  <Eye className="w-4 h-4" />
                  <span>{manga.views.toLocaleString()} lượt xem</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Star className="w-4 h-4" />
                  <span>4.0 / 5</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <BookOpen className="w-4 h-4" />
                  <span>{manga.chapters.length} chapters</span>
                </div>
              </div>

              {manga.chapters.length > 0 && (
                <Link
                  href={`/chapter/${manga.chapters[0]._id}`}
                  className="inline-flex items-center gap-2 bg-black text-white px-6 py-2 rounded hover:bg-gray-800 transition-colors"
                >
                  Đọc ngay
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Chapters List Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-black">
              Danh sách Chapter
            </h2>
            <span className="text-sm text-gray-500">
              {manga.chapters.length} chapters
            </span>
          </div>

          {manga.chapters.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">
                Chưa có chapter nào được xuất bản.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {manga.chapters.map((ch) => (
                <Link
                  key={ch._id}
                  href={`/chapter/${ch._id}`}
                  className="flex items-center justify-between p-3 border border-gray-100 rounded hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-sm font-medium text-gray-600">
                      {ch.order}
                    </div>
                    <div>
                      <span className="font-medium text-black">
                        Chapter {ch.order}
                      </span>
                      <p className="text-sm text-gray-600">{ch.title}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-black transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
