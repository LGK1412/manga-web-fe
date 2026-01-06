"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { History, Trash2 } from "lucide-react";
import Link from "next/link";
import Cookies from "js-cookie";
import axios from "axios";

export default function ReadingHistory() {
  const [readingHistory, setReadingHistory] = useState<any[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 🔹 Parse user info từ cookie chỉ 1 lần
  const user = useMemo(() => {
    const raw = Cookies.get("user_normal_info");
    if (!raw) return null;
    try {
      const decoded = decodeURIComponent(raw);
      const parsed = JSON.parse(decoded);
      return {
        id: parsed.user_id,
        name: parsed.username || "User",
        avatar: parsed.avatar || "",
        isAuthor: (parsed.role || "").trim() === "author",
      };
    } catch {
      return null;
    }
  }, []);

  // 🔹 Fetch history
  useEffect(() => {
    if (!user?.id) return;

    const fetchHistory = async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/chapter/history/user/${user.id}`,
          { withCredentials: true }
        );
        setReadingHistory(res.data || []);
      } catch (err) {
        console.error("Failed to fetch reading history", err);
      } finally {
        setHistoryLoaded(true);
      }
    };

    fetchHistory();
  }, [user?.id]);

  // 🔹 Delete 1 truyện trong lịch sử đọc
  const handleDelete = async (storyId: string) => {
    if (!user?.id) return;
    const confirm = window.confirm(
      "Are you sure you want to delete this reading history?"
    );
    if (!confirm) return;

    try {
      setDeletingId(storyId);
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chapter/history/${user.id}/${storyId}`,
        { withCredentials: true }
      );

      // Cập nhật lại danh sách (lọc bỏ item đã xoá)
      setReadingHistory((prev) =>
        prev.filter((item) => item.story_id !== storyId)
      );
    } catch (err) {
      console.error("Failed to delete reading history:", err);
      alert("Unable to delete reading history. Please try again!");
    } finally {
      setDeletingId(null);
    }
  };

  // 🔹 UI hiển thị
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" /> Reading History
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {!historyLoaded ? (
          <div className="text-center py-6 text-muted-foreground">
            Loading reading history...
          </div>
        ) : readingHistory.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            You haven't read any stories
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {readingHistory.map((item: any) => {
              const chapter = item.last_read_chapter;
              const manga = chapter?.manga_id;

              return (
                <div
                  key={item._id}
                  className="group flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                >
                  {/* Ảnh bìa */}
                  <Link
                    href={`/story/${manga?._id || item.story_id}`}
                    className="flex-shrink-0"
                  >
                    <Avatar className="w-16 h-20">
                      <AvatarImage
                        src={
                          manga?.coverImage
                            ? `${process.env.NEXT_PUBLIC_API_URL}/assets/coverImages/${manga.coverImage}`
                            : `${process.env.NEXT_PUBLIC_API_URL}/assets/coverImages/z6830618024816_726c3c47e3792500269a50d2c3fa7af3.webp`
                        }
                        alt={manga?.title || "Story"}
                      />
                      <AvatarFallback className="text-xs">
                        {manga?.title?.charAt(0) || "S"}
                      </AvatarFallback>
                    </Avatar>
                  </Link>

                  {/* Thông tin truyện */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">
                      {manga?.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Last read chapter: {chapter?.title} (#{chapter?.order})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Progress: {item.overall_progress ?? 0}%
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Last updated:{" "}
                      {new Date(item.last_read_at).toLocaleString("en-US")}
                    </p>
                  </div>

                  {/* Nút Xoá */}
                  <button
                    onClick={() => handleDelete(item.story_id)}
                    disabled={deletingId === item.story_id}
                    className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-600 disabled:opacity-50"
                    title="Remove from history"
                  >
                    {deletingId === item.story_id ? (
                      <span className="text-xs animate-pulse">...</span>
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
