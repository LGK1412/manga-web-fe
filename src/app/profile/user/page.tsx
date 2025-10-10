"use client";

import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BookOpen, PenTool, User as UserIcon } from "lucide-react";
import axios from "axios";
import Link from "next/link";

interface PublicUser {
  _id: string;
  username: string;
  avatar?: string;
  bio?: string;
  role: "author" | "user";
}

interface AuthorStoryItem {
  _id: string;
  title: string;
  coverImage?: string;
  status?: string;
}

export default function PublicUserProfile({ searchParams }: { searchParams: { id?: string } }) {
  const userId = useMemo(() => searchParams?.id || "", [searchParams]);

  const [user, setUser] = useState<PublicUser | null>(null);
  const [stories, setStories] = useState<AuthorStoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const userRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/user/public/${userId}`);
        const u = userRes.data;
        setUser(u);

        try {
          const statsRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/user/public-follow-stats/${userId}`);
          setFollowersCount(statsRes.data?.followersCount || 0);
          setFollowingCount(statsRes.data?.followingCount || 0);
        } catch {}

        if (u?.role === "author") {
          const storiesRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/manga/get/all`, { params: { authorId: userId, page: 1, limit: 50 } });
          const data = storiesRes.data?.data || [];
          setStories(data);
        } else {
          setStories([]);
        }
      } catch (e: any) {
        setError(e?.response?.data?.message || "Không thể tải hồ sơ người dùng");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-20">
        {loading && <p className="text-center">Đang tải...</p>}
        {!loading && error && <p className="text-center text-red-600">{error}</p>}
        {!loading && !error && user && (
          <div className="grid lg:grid-cols-3 gap-8 mt-15">
            <Card className="lg:col-span-1">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <Avatar className="w-24 h-24 mb-4">
                  <AvatarImage src={user.avatar ? `${process.env.NEXT_PUBLIC_API_URL}/assets/avatars/${user.avatar}` : "/placeholder.svg?height=96&width=96"} alt={user.username} />
                  <AvatarFallback className="text-4xl">{user.username?.charAt(0)}</AvatarFallback>
                </Avatar>
                <h2 className="text-2xl font-bold mb-1">{user.username}</h2>
                {user.bio && <p className="text-muted-foreground mb-4 max-w-sm">{user.bio}</p>}
                <Badge variant="secondary">
                  {user.role === "author" ? (
                    <><PenTool className="w-3 h-3 mr-1" /> Tác giả</>
                  ) : (
                    <><UserIcon className="w-3 h-3 mr-1" /> Độc giả</>
                  )}
                </Badge>
                <div className="flex gap-6 mt-4">
                  <div>
                    <p className="text-lg font-semibold">{followersCount}</p>
                    <p className="text-sm text-muted-foreground">Người theo dõi</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{followingCount}</p>
                    <p className="text-sm text-muted-foreground">Đang theo dõi</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-8">
              {user.role === "author" ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5" /> Truyện đã viết</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {stories.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">Chưa có truyện</div>
                    ) : (
                      <div className="max-h-96 overflow-y-auto">
                        {stories.map((story) => (
                          <Link key={story._id} href={`/story/${story._id}`} className="flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
                            <Avatar className="w-16 h-20 flex-shrink-0">
                              <AvatarImage src={story.coverImage ? `${process.env.NEXT_PUBLIC_API_URL}/assets/coverImages/${story.coverImage}` : "/placeholder.svg"} alt={story.title} />
                              <AvatarFallback className="text-xs">{story.title?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm truncate">{story.title}</h3>
                              {story.status && <p className="text-xs text-muted-foreground">{story.status}</p>}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Thông tin người dùng</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">Người dùng chưa phải tác giả. Không có danh sách truyện.</div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


