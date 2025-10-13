"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { History } from "lucide-react";
import Link from "next/link";
import Cookies from "js-cookie";
import axios from "axios";

export default function ReadingHistory() {
  const [readingHistory, setReadingHistory] = useState<any[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

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

  // 🔹 Gọi API trong useEffect, chỉ khi có user.id
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

  // 🔹 UI hiển thị
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" /> Lịch sử đọc
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {!historyLoaded ? (
          <div className="text-center py-6 text-muted-foreground">
            Đang tải lịch sử đọc...
          </div>
        ) : readingHistory.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            Bạn chưa đọc truyện nào
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {readingHistory.map((item: any) => {
              const chapter = item.last_read_chapter;
              const manga = chapter?.manga_id;
              return (
                <Link
                  key={item._id}
                  href={`/story/${manga?._id || item.story_id}`}
                  className="flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="w-16 h-20 flex-shrink-0">
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

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">
                      {manga?.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Chương cuối đọc: {chapter?.title} (#{chapter?.order})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tiến độ: {item.overall_progress ?? 0}%
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Cập nhật lần cuối:{" "}
                      {new Date(item.last_read_at).toLocaleString("vi-VN")}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
