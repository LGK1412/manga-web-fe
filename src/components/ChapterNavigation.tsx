"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, BookOpen, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Chapter = {
  _id: string;
  title: string;
  order: number;
  price?: number;
  locked?: boolean;
  is_published?: boolean;
};

type ChapterDetail = {
  _id: string;
  manga_id?: string;
  mangaId?: string;
  title: string;
  order: number;
  price?: number;
};

type MangaDetail = {
  _id: string;
  chapters: Chapter[];
};

export default function ChapterNavigation() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [chapterList, setChapterList] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [mangaId, setMangaId] = useState<string | null>(null);

  // Fetch current chapter để lấy mangaId, rồi fetch full chapter list từ manga detail
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    axios
      .get<ChapterDetail>(`${process.env.NEXT_PUBLIC_API_URL}/api/Chapter/content/${id}`, {
        withCredentials: true,
      })
      .then((res) => {
        // Lấy mangaId từ chapter data
        const chapterData = res.data;
        const extractedMangaId = chapterData.manga_id || chapterData.mangaId;

        if (extractedMangaId) {
          setMangaId(extractedMangaId);

          // Fetch full manga detail với chapter list
          return axios.get<MangaDetail>(
            `${process.env.NEXT_PUBLIC_API_URL}/api/manga/detail/${extractedMangaId}`,
            { withCredentials: true }
          );
        } else {
          throw new Error("Cannot find mangaId in chapter data");
        }
      })
      .then((res) => {
        const sorted = [...(res.data.chapters || [])].sort((a, b) => a.order - b.order);
        setChapterList(sorted);
      })
      .catch((err) => {
        console.error(err);
        toast({
          title: "Error",
          description: "Unable to load the chapter list",
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, [id, toast]);

  // Tìm vị trí chapter hiện tại
  const currentIndex = useMemo(() =>
    chapterList.findIndex((ch) => ch._id === id),
    [chapterList, id]
  );

  const prevChapter = currentIndex > 0 ? chapterList[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapterList.length - 1 ? chapterList[currentIndex + 1] : null;

  // Hàm mua chapter (copy từ Story page)
  const handleBuyChapter = async (chapterId: string, price: number) => {
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chapter-purchase/${chapterId}`,
        {},
        { withCredentials: true }
      );

      toast({
        title: "Purchase successful",
        description: `You purchased this chapter for ${price} points.`,
      });

      // Cập nhật lại list (bỏ lock cho chapter vừa mua)
      setChapterList((prev) =>
        prev.map((ch) =>
          ch._id === chapterId ? { ...ch, locked: false } : ch
        )
      );
    } catch (err: any) {
      toast({
        title: "Purchase failed",
        description: err.response?.data?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mt-10 flex flex-col items-center gap-8">
      {/* Prev / Next Buttons */}
      <div className="flex w-full max-w-md justify-between gap-3">
        <Button
          variant="outline"
          size="lg"
          disabled={!prevChapter}
          onClick={() => prevChapter && router.push(`/chapter/${prevChapter._id}`)}
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <Button
          variant="outline"
          size="lg"
          disabled={!nextChapter}
          onClick={() => nextChapter && router.push(`/chapter/${nextChapter._id}`)}
          className="flex-1"
        >
          Next
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Chapter List - Giống 100% style trong Story */}
      {chapterList.length > 0 && (
        <div className="w-full max-w-3xl rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Chapter List
            </h3>
            <span className="text-sm text-muted-foreground">
              {chapterList.length} chapters
            </span>
          </div>

          <div className="max-h-[480px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {chapterList.map((chapter) => {
              const isCurrent = chapter._id === id;

              return (
                <div
                  key={chapter._id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? "bg-primary/10 border-primary cursor-default"
                      : chapter.locked
                      ? "bg-amber-50/50 border-amber-200 hover:bg-amber-100/50 cursor-not-allowed"
                      : "hover:bg-muted cursor-pointer"
                  }`}
                  onClick={() => {
                    if (!isCurrent && !chapter.locked) {
                      router.push(`/chapter/${chapter._id}`);
                    }
                  }}
                >
                  {/* Left: Chapter info */}
                  <div className="flex items-center gap-3 flex-1">
                    <span className="font-medium">Chapter {chapter.order}</span>
                    <span className="text-sm line-clamp-1">{chapter.title}</span>

                    {isCurrent && (
                      <Badge variant="secondary" className="text-xs font-medium">
                        Now reading
                      </Badge>
                    )}

                    {chapter.locked && (
                      <Lock className="w-4 h-4 text-amber-600" />
                    )}
                  </div>

                  {/* Right: Locked / Unlocked UI */}
                  <div className="flex items-center gap-3">
                    {chapter.locked ? (
                      <>
                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                          {chapter.price} points
                        </Badge>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation(); // ngăn click vào item
                            handleBuyChapter(chapter._id, chapter.price || 0);
                          }}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Buy
                        </Button>
                      </>
                    ) : (
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading chapter list...</p>}
    </div>
  );
}