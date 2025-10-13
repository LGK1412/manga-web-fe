"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import {
  Eye,
  BookOpen,
  Star,
  Heart,
  UserPlus,
  ThumbsUp,
  ArrowRight,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Author {
  _id: string;
  username: string;
  avatar?: string;
}

interface Chapter {
  _id: string;
  title: string;
  order: number;
  price: number;
  locked?: boolean;
}

interface MangaDetail {
  _id: string;
  title: string;
  summary: string;
  coverImage?: string;
  author: Author;
  views: number;
  chapters: Chapter[];
  ratingSummary?: { avgRating: number; count: number };
}

export default function MangaDetailPage() {
  const params = useParams();
  const mangaId = params?.id as string;

  const [manga, setManga] = useState<MangaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const [isFavourite, setIsFavourite] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [ratingSummary, setRatingSummary] = useState<{
    avgRating: number;
    count: number;
  } | null>(null);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [ratingInput, setRatingInput] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState<string>("");
  const [myRating, setMyRating] = useState<any | null>(null);
  const [allRatings, setAllRatings] = useState<any[]>([]);
  const [likesById, setLikesById] = useState<
    Record<string, { count: number; liked: boolean }>
  >({});
  const [lastRead, setLastRead] = useState<any | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    const cookie = document.cookie
      .split("; ")
      .find((r) => r.startsWith("user_normal_info="));
    if (cookie) {
      try {
        const data = JSON.parse(decodeURIComponent(cookie.split("=")[1]));
        setUserId(data.user_id);
      } catch (err) {
        console.error("Cookie parse error:", err);
      }
    }
  }, []);
  useEffect(() => {
    if (!mangaId || !userId) return;
    console.log(
      `${process.env.NEXT_PUBLIC_API_URL}/api/Chapter/history/${userId}/${mangaId}`
    );
    axios
      .get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/Chapter/history/${userId}/${mangaId}`
      )
      .then((res) => {
        if (res.data?.last_read_chapter) {
          setLastRead(res.data);
        } else {
          setLastRead(null);
        }
      })
      .catch(() => setLastRead(null));
  }, [mangaId, userId]);
  useEffect(() => {
    if (!mangaId) return;

    setLoading(true);
    setError(null);

    axios
      .get<MangaDetail>(
        `${process.env.NEXT_PUBLIC_API_URL}/api/manga/detail/${mangaId}`,
        { withCredentials: true }
      )
      .then(async (res) => {
        const data = res.data;
        setManga({
          ...data,
          chapters: Array.isArray(data.chapters) ? data.chapters : [],
        });
        setRatingSummary(data.ratingSummary || null);

        try {
          const favRes = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/user/favourites`,
            { withCredentials: true }
          );
          const favourites = favRes.data.favourites || [];
          const isFav = favourites.some(
            (fav: any) => fav._id === mangaId || fav === mangaId
          );
          setIsFavourite(isFav);
        } catch {
          setIsFavourite(false);
        }

        try {
          const followRes = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/user/following`,
            { withCredentials: true }
          );
          const following = followRes.data.following || [];
          const isFollowed = following.some(
            (a: any) => a._id === data.author._id
          );
          setIsFollowing(isFollowed);
        } catch {
          setIsFollowing(false);
        }
      })
      .catch((err) => {
        console.error("Lỗi khi fetch manga:", err);
        setError(err.response?.data?.message || "Không thể tải dữ liệu");
      })
      .finally(() => setLoading(false));
  }, [mangaId]);

  useEffect(() => {
    if (!mangaId) return;
    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL}/api/rating/all`, {
        params: { mangaId },
      })
      .then((res) => setAllRatings(res.data?.items || []))
      .catch(() => setAllRatings([]));
  }, [mangaId, ratingDialogOpen]);

  useEffect(() => {
    if (!allRatings.length) {
      setLikesById({});
      return;
    }
    (async () => {
      try {
        const results = await Promise.all(
          allRatings.map(async (r: any) => {
            const [countRes, mineRes] = await Promise.all([
              axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/api/rating-like/count`,
                { params: { ratingId: r._id } }
              ),
              axios
                .get(
                  `${process.env.NEXT_PUBLIC_API_URL}/api/rating-like/mine`,
                  { params: { ratingId: r._id }, withCredentials: true }
                )
                .catch(() => ({ data: { liked: false } })),
            ]);
            return [
              r._id,
              {
                count: countRes.data?.likesCount ?? 0,
                liked: !!mineRes.data?.liked,
              },
            ] as const;
          })
        );
        const next: Record<string, { count: number; liked: boolean }> = {};
        results.forEach(([id, v]) => {
          next[id] = v;
        });
        setLikesById(next);
      } catch {}
    })();
  }, [allRatings]);

  const toggleLike = async (ratingId: string) => {
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rating-like/toggle`,
        { ratingId },
        { withCredentials: true }
      );
      setLikesById((prev) => ({
        ...prev,
        [ratingId]: {
          liked: !!res.data?.liked,
          count: res.data?.likesCount ?? 0,
        },
      }));
    } catch {}
  };

  const handleAddToFavourite = async () => {
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/toggle-favourite`,
        { mangaId },
        { withCredentials: true }
      );

      const { isFavourite } = res.data;
      setIsFavourite(isFavourite);
    } catch (err: any) {
      console.error("Lỗi khi thêm/trừ khỏi yêu thích:", err);
      alert(err.response?.data?.message || "Có lỗi xảy ra khi xử lý yêu thích");
    }
  };

  const handleToggleFollow = async () => {
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/toggle-follow`,
        { authorId: manga?.author?._id },
        { withCredentials: true }
      );
      setIsFollowing(res.data.isFollowing);
    } catch (err: any) {
      console.error("Lỗi khi theo dõi/bỏ theo dõi:", err);
      alert(
        err.response?.data?.message || "Có lỗi xảy ra khi theo dõi tác giả"
      );
    }
  };

  const openRatingDialog = async () => {
    try {
      const mineRes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rating/mine`,
        { params: { mangaId }, withCredentials: true }
      );
      const mine = mineRes.data?.rating || null;
      setMyRating(mine);
      setRatingInput(mine?.rating || 0);
      setRatingComment(mine?.comment || "");
    } catch {
      setMyRating(null);
      setRatingInput(0);
      setRatingComment("");
    }
    setRatingDialogOpen(true);
  };

  const submitRating = async () => {
    if (!mangaId) return;
    if (!ratingInput || ratingInput < 1 || ratingInput > 5) return;
    if (!ratingComment.trim()) return;
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rating/upsert`,
        { mangaId, rating: ratingInput, comment: ratingComment.trim() },
        { withCredentials: true }
      );
      setUserRating(ratingInput);
      setMyRating({ rating: ratingInput, comment: ratingComment });
      try {
        const summaryRes = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/rating/summary`,
          { params: { mangaId } }
        );
        setRatingSummary(summaryRes.data || null);
      } catch {}
      setRatingDialogOpen(false);
    } catch {}
  };

  const handleBuyChapter = async (chapterId: string, price: number) => {
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chapter-purchase/${chapterId}`,
        {},
        { withCredentials: true }
      );

      toast({
        title: "Thành công 🎉",
        description: `Bạn đã mua chapter với giá ${price} điểm!`,
      });

      setManga((prev) =>
        prev
          ? {
              ...prev,
              chapters: prev.chapters.map((ch) =>
                ch._id === chapterId ? { ...ch, locked: false } : ch
              ),
            }
          : prev
      );
    } catch (err: any) {
      toast({
        title: "Lỗi mua chapter",
        description:
          err.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại!",
        variant: "destructive",
      });
    }
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-center mt-10">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-center mt-10 text-red-600">{error}</p>
      </div>
    );
  }

  if (!manga) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-center mt-10">Không tìm thấy truyện.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16 max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Story Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Cover Image */}
                  <div className="w-full md:w-64 flex-shrink-0">
                    <div className="aspect-[3/4] relative">
                      {manga.coverImage ? (
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_URL}/assets/coverImages/${manga.coverImage}`}
                          alt={manga.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
                          <BookOpen className="w-10 h-10" />
                        </div>
                      )}
                      <Badge
                        className="absolute top-2 right-2"
                        variant="secondary"
                      >
                        Manga
                      </Badge>
                    </div>
                  </div>

                  {/* Story Info */}
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold mb-3">{manga.title}</h1>

                    {/* Author Info */}
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar>
                        <AvatarImage
                          src={
                            manga.author.avatar
                              ? `${process.env.NEXT_PUBLIC_API_URL}/assets/avatars/${manga.author.avatar}`
                              : "/placeholder.svg"
                          }
                          alt={manga.author.username}
                        />
                        <AvatarFallback>
                          {manga.author.username.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Link
                          href={`/profile/user?id=${manga.author._id}`}
                          className="font-medium hover:underline"
                        >
                          {manga.author.username}
                        </Link>
                      </div>
                      <Button
                        variant={isFollowing ? "outline" : "default"}
                        size="sm"
                        onClick={handleToggleFollow}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        {isFollowing ? "Đang theo dõi" : "Theo dõi"}
                      </Button>
                    </div>

                    {/* Stats */}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                      <button
                        type="button"
                        onClick={openRatingDialog}
                        className="flex items-center gap-1 hover:underline"
                      >
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        {ratingSummary
                          ? Number(ratingSummary.avgRating || 0).toFixed(1)
                          : "—"}
                      </button>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {manga.views.toLocaleString()} views
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {manga.chapters.length} chapters
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      {manga.summary}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                      {manga && manga.chapters.length > 0 && (
                        <>
                          <Button size="lg" asChild>
                            <Link href={`/chapter/${manga.chapters[0]._id}`}>
                              <BookOpen className="w-4 h-4 mr-2" />
                              Đọc ngay
                            </Link>
                          </Button>

                          {lastRead && lastRead.last_read_chapter && (
                            <Button size="lg" variant="secondary" asChild>
                              <Link
                                href={`/chapter/${lastRead.last_read_chapter._id}`}
                              >
                                <ArrowRight className="w-4 h-4 mr-2" />
                                Tiếp tục đọc chương{" "}
                                {lastRead.last_read_chapter.order}
                              </Link>
                            </Button>
                          )}
                        </>
                      )}

                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handleAddToFavourite}
                        type="button"
                        className="min-w-[180px] justify-center bg-transparent"
                      >
                        <Heart
                          className={`w-4 h-4 mr-2 ${
                            isFavourite ? "fill-red-500 text-red-500" : ""
                          }`}
                        />
                        {isFavourite ? "Đã yêu thích" : "Thêm vào yêu thích"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rating Dialog */}
            <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle>Đánh giá truyện</DialogTitle>
                  <DialogDescription>
                    Chọn số sao và nhập nhận xét (bắt buộc).
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="flex items-center gap-3">
                    {Array.from({ length: 5 }).map((_, idx) => {
                      const value = ratingInput || 0;
                      const fill = Math.max(0, Math.min(1, value - idx));
                      const pct = Math.round(fill * 100);
                      return (
                        <div
                          key={idx}
                          className="relative w-7 h-7 cursor-pointer select-none"
                          onClick={(e) => {
                            const rect = (
                              e.currentTarget as HTMLDivElement
                            ).getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const ratio = x / rect.width;
                            const base = idx;
                            const next = ratio >= 0.5 ? base + 1 : base + 0.5;
                            setRatingInput(next);
                          }}
                          title={`${(idx + 1).toFixed(0)} star`}
                        >
                          <Star className="absolute inset-0 w-7 h-7 text-gray-300" />
                          <div
                            className="absolute inset-0 overflow-hidden"
                            style={{ width: `${pct}%` }}
                          >
                            <Star className="w-7 h-7 fill-yellow-400 text-yellow-400" />
                          </div>
                        </div>
                      );
                    })}
                    <span className="ml-2 text-sm text-muted-foreground">
                      {Number(ratingInput || 0).toFixed(1)} / 5
                    </span>
                  </div>
                  <Textarea
                    placeholder="Nhập nhận xét của bạn..."
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => setRatingDialogOpen(false)}
                    variant="outline"
                  >
                    Hủy
                  </Button>
                  <Button
                    onClick={submitRating}
                    disabled={!ratingInput || !ratingComment.trim()}
                  >
                    Gửi
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Ratings List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">Đánh giá truyện</CardTitle>
                  {ratingSummary && (
                    <span className="text-sm text-muted-foreground">
                      {ratingSummary.count || 0} đánh giá
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div>
                  {allRatings.map((r: any, idx: number) => (
                    <div
                      key={r._id}
                      className={`flex items-start gap-3 ${
                        idx > 0 ? "border-t pt-4 mt-4" : ""
                      }`}
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage
                          src={
                            r.user?.avatar
                              ? `${process.env.NEXT_PUBLIC_API_URL}/assets/avatars/${r.user.avatar}`
                              : "/placeholder.svg"
                          }
                          alt={r.user?.username || "User"}
                        />
                        <AvatarFallback>
                          {(r.user?.username || "U").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/profile/user?id=${r.user?._id}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {r.user?.username || "Người dùng"}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {r.createdAt
                              ? new Date(r.createdAt).toLocaleDateString()
                              : ""}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3">
                          {Array.from({ length: 5 }).map((_, idx) => {
                            const value = Number(r.rating || 0);
                            const fill = Math.max(0, Math.min(1, value - idx));
                            const pct = Math.round(fill * 100);
                            return (
                              <div key={idx} className="relative w-4 h-4">
                                <Star className="absolute inset-0 w-4 h-4 text-gray-300" />
                                <div
                                  className="absolute inset-0 overflow-hidden"
                                  style={{ width: `${pct}%` }}
                                >
                                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                </div>
                              </div>
                            );
                          })}
                          <span className="text-xs text-muted-foreground">
                            {Number(r.rating || 0).toFixed(1)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm break-words">{r.comment}</p>
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => toggleLike(r._id)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <ThumbsUp
                              className={`w-3 h-3 ${
                                likesById[r._id]?.liked
                                  ? "fill-blue-500 text-blue-500"
                                  : ""
                              }`}
                            />
                            {likesById[r._id]?.count ?? "—"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {allRatings.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      Chưa có đánh giá nào.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Chapters List */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Danh sách chương
                </CardTitle>
                <CardDescription>
                  {manga.chapters.length} chương hiện có
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {manga.chapters.length > 0 ? (
                  <div className="space-y-2">
                    {manga.chapters.map((chapter) => (
                      <div
                        key={chapter._id}
                        className="block p-3 rounded-lg border hover:bg-muted transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">
                              Chapter {chapter.order}: {chapter.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {chapter.locked ? (
                              <>
                                <Badge variant="secondary">
                                  {chapter.price} điểm
                                </Badge>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleBuyChapter(chapter._id, chapter.price)
                                  }
                                >
                                  Mua
                                </Button>
                              </>
                            ) : (
                              <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        {!chapter.locked && (
                          <Link
                            href={`/chapter/${chapter._id}`}
                            className="block mt-2 text-sm text-blue-600 hover:underline"
                          >
                            Đọc ngay
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    Chưa có chương nào.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
