"use client";

import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Heart, History, UserIcon, PenTool } from "lucide-react";
import Link from "next/link";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import PurchaseHistory from "@/components/PurchaseHistory";

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

  const user = useMemo(() => {
    const raw = Cookies.get("user_normal_info");
    if (!raw) return null;
    try {
      const decoded = decodeURIComponent(raw);
      const parsed = JSON.parse(decoded);
      return {
        id: parsed.user_id,
        name: parsed.username || "User",
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
        const stats = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/user/follow-stats`, { withCredentials: true })
        setFollowersCount(stats.data?.followersCount || 0)
        setFollowingCount(stats.data?.followingCount || 0)
      } catch {}
    })()
  }, [user, router, toast, favouritesLoaded]);

  const handleRoleToggle = async (checked: boolean) => {
    setIsAuthorRole(checked);
    try {
      const newRole = checked ? "author" : "user";
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/update-role`,
        { role: newRole },
        { withCredentials: true }
      );

      const raw = Cookies.get("user_normal_info");
      const parsed = raw ? JSON.parse(decodeURIComponent(raw)) : null;
      if (parsed) {
        parsed.role = newRole;
        Cookies.set("user_normal_info", JSON.stringify(parsed), {
          expires: 360,
          path: "/",
        });
      }

      toast({
        title: "Cập nhật vai trò thành công",
        variant: "success",
        description: "Đã đổi vai trò!",
      });
    } catch (e) {
      setIsAuthorRole(!checked);
      toast({ title: "Cập nhật vai trò thất bại", variant: "destructive" });
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

              <div className="flex items-center justify-between w-full">
                <Label htmlFor="author-mode" className="text-base font-medium">
                  Chuyển sang chế độ Tác giả
                </Label>
                <Switch
                  id="author-mode"
                  checked={isAuthorRole}
                  onCheckedChange={handleRoleToggle}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-left w-full">
                {isAuthorRole
                  ? "Bạn đang ở chế độ tác giả. Bạn có thể viết và đăng truyện."
                  : "Bạn đang ở chế độ độc giả. Chuyển sang chế độ tác giả để viết truyện."}
              </p>
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
                  <div className="text-center py-6 text-muted-foreground">Đang tải danh sách</div>
                ) : followingAuthors.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">Bạn chưa theo dõi tác giả nào</div>
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
                            src={author.avatar ? `${process.env.NEXT_PUBLIC_API_URL}/assets/avatars/${author.avatar}` : "/placeholder.svg"}
                            alt={author.username}
                          />
                          <AvatarFallback className="text-sm">
                            {author.username?.charAt(0) || "A"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">{author.username}</h3>
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
                                : "/placeholder.svg"
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
            <PurchaseHistory />
          </div>
        </div>
      </div>
    </div>
  );
}
