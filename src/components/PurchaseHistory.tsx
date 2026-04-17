"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BookOpen } from "lucide-react";

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
          },
        );
        setHistory(res.data);
      } catch (error: any) {
        toast({
          title: "Error loading purchase history",
          description:
            error.response?.data?.message || "Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [toast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Chapter Purchase History
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center items-center py-6 text-muted-foreground">
            <Loader2 className="animate-spin w-4 h-4 mr-2" />
            Loading purchase history...
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            You haven&apos;t purchased any chapters yet
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {history.map((item) => {
              const chapter = item.chapterId;
              const manga = chapter?.manga_id;
              const author = manga?.authorId;

              return (
                <div
                  key={item._id}
                  className="flex justify-between items-center p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-sm">
                      {manga?.title || "Unknown story"}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {chapter?.title
                        ? `Chapter ${chapter.order}: ${chapter.title}`
                        : "Unknown chapter"}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Author: {author?.username || "Unknown"}
                    </p>
                  </div>

                  <div className="text-xs text-muted-foreground text-right">
                    {new Date(item.createdAt).toLocaleString("en-US")}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
