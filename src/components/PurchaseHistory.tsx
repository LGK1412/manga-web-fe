"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface PurchaseItem {
  _id: string;
  createdAt: string;
  chapterId: {
    title: string;
    order: number;
    manga_id: {
      title: string;
      authorId: {
        username?: string;
        avatar?: string;
      };
    };
  };
}

export default function PurchaseHistory() {
  const { toast } = useToast();
  const [history, setHistory] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/chapter-purchase/history`,
          {
            withCredentials: true,
          }
        );
        setHistory(res.data);
      } catch (error: any) {
        toast({
          title: "Lỗi khi tải lịch sử mua chương",
          description: error.response?.data?.message || "Vui lòng thử lại sau.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [toast]);

  if (loading)
    return (
      <div className="flex justify-center items-center py-10 text-gray-500">
        <Loader2 className="animate-spin w-5 h-5 mr-2" />
        Đang tải lịch sử mua...
      </div>
    );

  if (history.length === 0)
    return (
      <div className="text-center py-10 text-gray-500">
        Bạn chưa mua chương nào.
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      <h3>Lịch sử mua chapter</h3>
      {history.map((item) => {
        const chapter = item.chapterId;
        const manga = chapter?.manga_id;
        const author = manga?.authorId;

        return (
          <Card
            key={item._id}
            className="hover:shadow-md transition-shadow duration-200"
          >
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg">
                  {manga?.title || "Không rõ truyện"}
                </h3>
                <p className="text-sm text-gray-600">
                  {chapter?.title
                    ? `Chương ${chapter.order}: ${chapter.title}`
                    : "Không rõ chương"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Tác giả: {author?.username || "Không rõ"}
                </p>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(item.createdAt).toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
