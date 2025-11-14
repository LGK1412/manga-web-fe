"use client";

import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Heart, History, UserIcon, PenTool } from "lucide-react";
import Link from "next/link";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import PurchaseHistory from "@/components/PurchaseHistory";
import ReadingHistory from "@/components/ReadingHistory";
import DonationSentList from "@/components/DonationSendList";
import DonationReceivedList from "@/components/DonationReceivedList";
import { useAuthorRequest } from "@/hooks/useAuthorRequest";
import { AuthorEligibilityChecklist } from "@/components/AuthorEligibilityChecklist";
import { AuthorRequestBanner } from "@/components/AuthorRequestBanner";

export default function ProfileByIdPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [isAuthorRole, setIsAuthorRole] = useState(false);
  const [followingAuthors, setFollowingAuthors] = useState<any[]>([]);
  const [followingLoaded, setFollowingLoaded] = useState(false);
  const [favouriteStories, setFavouriteStories] = useState<any[]>([]);
  const [favouritesLoaded, setFavouritesLoaded] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isAuthorModalOpen, setAuthorModalOpen] = useState(false);

  const user = useMemo(() => {
    const raw = Cookies.get("user_normal_info");
    if (!raw) return null;
    try {
      const decoded = decodeURIComponent(raw);
      const parsed = JSON.parse(decoded);
      return {
        id: parsed.user_id,
        name: parsed.username || "User",
        role: parsed.role,
        email: parsed.email || "",
        avatar: parsed.avatar || "",
        isAuthor: (parsed.role || "").trim() === "author",
        bio: parsed.bio || "",
        followersCount: 0,
        followingCount: 0,
      };
    } catch {
      return null;
    }
  }, []);

  const {
    data: authorRequest,
    loading: authorLoading,
    error: authorError,
    submitting: authorSubmitting,
    requestAuthor,
  } = useAuthorRequest(Boolean(user));

  // Load user info & favourites
  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    setIsAuthorRole(user.isAuthor);

    // Fetch favourite stories only once
    if (!favouritesLoaded) {
      const fetchFavourites = async () => {
        try {
          const res = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/user/favourites`,
            {
              withCredentials: true,
            }
          );
          setFavouriteStories(res.data.favourites || []);
          setFavouritesLoaded(true);
        } catch (err) {
          console.error("Failed to fetch favourites", err);
          if (axios.isAxiosError(err)) {
            if (err.response?.status === 401) {
              toast({
                title: "Phiên đăng nhập hết hạn",
                description: "Vui lòng đăng nhập lại",
                variant: "destructive",
              });
              router.push("/login");
            } else if (err.response?.status === 400) {
              console.log("400 error details:", err.response?.data);
              toast({
                title: "Lỗi dữ liệu",
                description:
                  err.response?.data?.message ||
                  "Không thể tải danh sách yêu thích",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Không thể tải danh sách yêu thích",
                description: err.response?.data?.message || "Lỗi server",
                variant: "destructive",
              });
            }
          } else {
            toast({
              title: "Không thể tải danh sách yêu thích",
              variant: "destructive",
            });
          }
          setFavouritesLoaded(true); // Set to true to prevent infinite retry
        }
      };

      fetchFavourites();
    }

    // Fetch following authors once
    if (!followingLoaded) {
      const fetchFollowing = async () => {
        try {
          const res = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/user/following`,
            { withCredentials: true }
          );
          setFollowingAuthors(res.data.following || []);
          setFollowingLoaded(true);
        } catch (err) {
          console.error("Failed to fetch following authors", err);
          setFollowingLoaded(true);
        }
      };

      fetchFollowing();
    }

    // Fetch follow stats
    (async () => {
      try {
        const stats = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/user/follow-stats`,
          { withCredentials: true }
        );
        setFollowersCount(stats.data?.followersCount || 0);
        setFollowingCount(stats.data?.followingCount || 0);
      } catch {}
    })();
  }, [user, router, toast, favouritesLoaded]);

  useEffect(() => {
    if (authorRequest?.status === "approved" && !isAuthorRole) {
      setIsAuthorRole(true);
      const raw = Cookies.get("user_normal_info");
      try {
        if (raw) {
          const parsed = JSON.parse(decodeURIComponent(raw));
          parsed.role = "author";
          Cookies.set("user_normal_info", JSON.stringify(parsed), {
            expires: 360,
            path: "/",
          });
        }
      } catch {
        // ignore cookie parse errors
      }
    }
  }, [authorRequest, isAuthorRole]);

  const handleRequestAuthor = async () => {
    try {
      const result = await requestAuthor();
      if (result?.success) {
        toast({
          title: result.autoApproved
            ? "Chúc mừng! Bạn đã trở thành tác giả"
            : "Đã gửi yêu cầu",
          description: result.message,
        });
      }
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message
        : "Không thể gửi yêu cầu";
      toast({
        title: "Lỗi",
        description: message ?? "Không thể gửi yêu cầu",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 pt-20">
        <h1 className="text-3xl font-bold mb-8">Trang cá nhân</h1>
        <div className="grid lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-1">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <Avatar className="w-24 h-24 mb-4">
                <AvatarImage
                  src={
                    user.avatar
                      ? `${process.env.NEXT_PUBLIC_API_URL}/assets/avatars/${user.avatar}`
                      : "/placeholder.svg?height=96&width=96&text=User"
                  }
                  alt={user.name}
                />
                <AvatarFallback className="text-4xl">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold mb-1">{user.name}</h2>
              <p className="text-muted-foreground mb-4">{user.email}</p>
              <p className="text-muted-foreground mb-4">{user.bio}</p>

              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary">
                  {isAuthorRole ? (
                    <>
                      <PenTool className="w-3 h-3 mr-1" /> Tác giả
                    </>
                  ) : (
                    <>
                      <UserIcon className="w-3 h-3 mr-1" /> Độc giả
                    </>
                  )}
                </Badge>
              </div>

              <div className="flex gap-6 mb-6">
                <div>
                  <p className="text-lg font-semibold">{followersCount}</p>
                  <p className="text-sm text-muted-foreground">
                    Người theo dõi
                  </p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{followingCount}</p>
                  <p className="text-sm text-muted-foreground">Đang theo dõi</p>
                </div>
              </div>

              <Button className="w-full mb-4" asChild>
                <Link href="/profile/edit">Chỉnh sửa</Link>
              </Button>

              <Separator className="w-full mb-4" />

              {isAuthorRole ? (
                <Button variant="secondary" className="w-full mb-4" asChild>
                  <Link href="/author/dashboard">Tới trang tác giả</Link>
                </Button>
              ) : (
                <div className="w-full space-y-2 mb-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setAuthorModalOpen(true)}
                  >
                    Trở thành tác giả
                  </Button>
                  <p className="text-xs text-muted-foreground text-left">
                    {authorRequest?.status === "pending"
                      ? "Yêu cầu của bạn đang được xét duyệt. Khi đủ điều kiện, hệ thống sẽ tự động phê duyệt."
                      : "Hệ thống sẽ kiểm tra số chương, người theo dõi và hoạt động gần đây để phê duyệt yêu cầu của bạn."}
                  </p>
                </div>
              )}

              <Link
                href="/change-password"
                className="text-sm font-medium underline text-left w-full decoration-red-400 decoration-2 underline-offset-2 text-red-600 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200 transition-colors"
              >
                Đổi mật khẩu
              </Link>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5" /> Tác giả đang theo dõi
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!followingLoaded ? (
                  <div className="text-center py-6 text-muted-foreground">
                    Đang tải danh sách
                  </div>
                ) : followingAuthors.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    Bạn chưa theo dõi tác giả nào
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    {followingAuthors.map((author: any) => (
                      <Link
                        key={author._id}
                        href={`/profile/user?id=${author._id}`}
                        className="flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                      >
                        <Avatar className="w-12 h-12 flex-shrink-0">
                          <AvatarImage
                            src={
                              author.avatar
                                ? `${process.env.NEXT_PUBLIC_API_URL}/assets/avatars/${author.avatar}`
                                : "/placeholder.svg"
                            }
                            alt={author.username}
                          />
                          <AvatarFallback className="text-sm">
                            {author.username?.charAt(0) || "A"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">
                            {author.username}
                          </h3>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5" /> Truyện yêu thích
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!favouritesLoaded ? (
                  <div className="text-center py-6 text-muted-foreground">
                    Đang tải danh sách
                  </div>
                ) : favouriteStories.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    Không có truyện yêu thích
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    {favouriteStories.map((story: any) => (
                      <Link
                        key={story._id}
                        href={`/story/${story._id}`}
                        className="flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                      >
                        <Avatar className="w-16 h-20 flex-shrink-0">
                          <AvatarImage
                            src={
                              story.coverImage
                                ? `${process.env.NEXT_PUBLIC_API_URL}/assets/coverImages/${story.coverImage}`
                                : `${process.env.NEXT_PUBLIC_API_URL}/assets/coverImages/z6830618024816_726c3c47e3792500269a50d2c3fa7af3.webp`
                            }
                            alt={story.title}
                          />
                          <AvatarFallback className="text-xs">
                            {story.title.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm truncate">
                              {story.title}
                            </h3>
                            {story.status && (
                              <Badge
                                variant={
                                  story.status === "completed"
                                    ? "default"
                                    : story.status === "ongoing"
                                    ? "secondary"
                                    : "destructive"
                                }
                                className="text-xs"
                              >
                                {story.status === "ongoing"
                                  ? "Ongoing"
                                  : story.status === "completed"
                                  ? "Completed"
                                  : story.status === "hiatus"
                                  ? "Hiatus"
                                  : story.status}
                              </Badge>
                            )}
                          </div>
                          {story.author && (
                            <p className="text-xs text-muted-foreground mb-1">
                              Tác giả: {story.author.username}
                            </p>
                          )}
                          {story.summary && (
                            <p
                              className="text-xs text-muted-foreground overflow-hidden"
                              style={{
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                              }}
                            >
                              {story.summary}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <ReadingHistory />
            {user && user.role !== "admin" && (
              <>
                <DonationSentList />

                {isAuthorRole && <DonationReceivedList />}

                <PurchaseHistory />
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isAuthorModalOpen} onOpenChange={setAuthorModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Đăng ký trở thành tác giả</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {authorError && (
              <p className="text-sm text-destructive">{authorError}</p>
            )}
            {authorLoading && (
              <p className="text-sm text-muted-foreground">
                Đang tải dữ liệu đánh giá...
              </p>
            )}
            {!authorLoading && authorRequest && (
              <div className="space-y-4">
                <AuthorRequestBanner
                  status={authorRequest.status}
                  message={authorRequest.message}
                  requestedAt={authorRequest.requestedAt}
                  approvedAt={authorRequest.approvedAt}
                  autoApproved={authorRequest.autoApproved}
                />
                <AuthorEligibilityChecklist criteria={authorRequest.criteria} />
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setAuthorModalOpen(false)}>
              Đóng
            </Button>
            {!isAuthorRole && (
              <Button
                onClick={handleRequestAuthor}
                disabled={
                  authorSubmitting ||
                  authorLoading ||
                  authorRequest?.status === "pending" ||
                  authorRequest?.status === "approved" ||
                  authorRequest?.canRequest === false
                }
              >
                {authorSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
