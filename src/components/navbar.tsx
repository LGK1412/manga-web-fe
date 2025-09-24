"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Bell,
  BookOpen,
  PenTool,
  User,
  LogOut,
  Menu,
  Sun,
  Moon,
  Gamepad2,
} from "lucide-react";
import Cookies from "js-cookie";
import { removeCookie } from "@/lib/cookie-func";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export function Navbar() {
  const { isLogin } = useAuth();
  const [user, setUser] = useState<any | undefined>();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const router = useRouter();

  // Desktop search state
  const [searchQuery, setSearchQuery] = useState("");

  // Mobile menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState("");

  const submitSearch = (q: string) => {
    const query = q.trim();
    if (query) {
      try {
        sessionStorage.setItem("stories:q", query); // đổi key cho thống nhất /stories
      } catch {}
      router.push("/stories"); // <- dùng /stories (không param)
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const raw = Cookies.get("user_normal_info");
    if (raw) {
      try {
        const decoded = decodeURIComponent(raw);
        const parsed = JSON.parse(decoded);
        setUser(parsed);
      } catch (e) {
        console.error("Invalid cookie data");
      }
    }
  }, [isLogin, mounted]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    submitSearch(searchQuery);
  };

  async function logout() {
    const res = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`,
      { withCredentials: true }
    );

    if (res.data.success) {
      await removeCookie();
      router.push("/login");
    } else {
      toast({
        title: "Đăng xuất không thành công",
        description: `Lỗi không mong muốn`,
        variant: "destructive",
      });
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-2">
          {/* Left: Logo + primary links */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              <span className="font-bold text-xl">Manga World</span>
            </Link>

            <div className="hidden md:flex items-center">
              <Link
                href="/genres"
                className="text-sm font-medium hover:text-primary ml-4"
              >
                Genres
              </Link>
              <Link
                href="/game"
                className="text-sm font-medium hover:text-primary ml-4 flex items-center gap-1"
              >
                <Gamepad2 className="h-4 w-4" />
                Game
              </Link>
            </div>
          </div>

          {/* Desktop: centered search */}
          <form
            onSubmit={handleSearch}
            className="hidden md:block flex-1 max-w-md mx-4"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search stories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </form>

          {/* Desktop: right actions */}
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {mounted ? (
                theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )
              ) : null}
            </Button>

            {isLogin && user ? (
              <>
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/notifications">
                    <Bell className="h-5 w-5S" />
                  </Link>
                </Button>

                {user?.role?.trim() === "author" && (
                  <Button variant="ghost" size="icon" asChild>
                    <Link href="/author/dashboard">
                      <PenTool className="h-5 w-5" />
                    </Link>
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-8 w-8 rounded-full"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={
                            user.avatar
                              ? user.avatar.startsWith("http")
                                ? user.avatar
                                : `${process.env.NEXT_PUBLIC_API_URL}/assets/avatars/${user.avatar}`
                              : "/placeholder.svg?height=64&width=64&query=user-avatar"
                          }
                          alt={user.username}
                        />

                        <AvatarFallback>
                          {user?.username?.charAt(0)?.toUpperCase() ?? "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuItem asChild>
                      <Link
                        href={
                          user?.user_id ? `/profile/${user.user_id}` : "/login"
                        }
                        className="flex items-center"
                      >
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={logout}
                      className="flex items-center"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile: only the menu icon */}
          <div className="ml-auto md:hidden">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-80 p-0">
                <div className="p-6 pt-16 space-y-4">
                  {/* Mobile search */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitSearch(mobileSearch);
                      setIsMenuOpen(false);
                    }}
                    className="w-full"
                  >
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        name="q"
                        type="search"
                        placeholder="Search stories..."
                        className="pl-10 w-full h-11"
                        value={mobileSearch}
                        onChange={(e) => setMobileSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </form>

                  <Separator />

                  {/* Vertical menu list */}
                  <div className="space-y-2">
                    <div className="text-sm font-semibold">Menu</div>
                    <Link
                      href="/"
                      onClick={() => setIsMenuOpen(false)}
                      className="block py-2 text-sm hover:underline"
                    >
                      Home
                    </Link>
                    <Link
                      href="/genres"
                      onClick={() => setIsMenuOpen(false)}
                      className="block py-2 text-sm hover:underline"
                    >
                      Genres
                    </Link>
                    <Link
                      href="/game"
                      onClick={() => setIsMenuOpen(false)}
                      className="py-2 text-sm hover:underline flex items-center gap-2"
                    >
                      <Gamepad2 className="h-4 w-4" />
                      Game
                    </Link>
                  </div>

                  <Separator />

                  {/* Auth actions */}
                  {!user ? (
                    <div className="flex gap-2">
                      <Button asChild className="flex-1">
                        <Link
                          href="/register"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Sign Up
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        asChild
                        className="flex-1 bg-transparent"
                      >
                        <Link
                          href="/login"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Login
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 py-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={
                              user.avatar
                                ? user.avatar.startsWith("http")
                                  ? user.avatar
                                  : `${process.env.NEXT_PUBLIC_API_URL}/assets/avatars/${user.avatar}`
                                : "/placeholder.svg?height=64&width=64&query=user-avatar"
                            }
                            alt={user.username}
                          />

                          <AvatarFallback>
                            {user?.username && user.username.length > 0
                              ? user.username.charAt(0).toUpperCase()
                              : "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-sm">
                          <p className="font-medium">{user.name}</p>
                          <p className="text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <Link
                        href="/notifications"
                        onClick={() => setIsMenuOpen(false)}
                        className="block py-2 text-sm"
                      >
                        Notifications
                      </Link>
                      {user.role === "author" && (
                        <Link
                          href="/author/dashboard"
                          onClick={() => setIsMenuOpen(false)}
                          className="block py-2 text-sm"
                        >
                          Write
                        </Link>
                      )}
                      <Link
                        href={
                          user?.user_id ? `/profile/${user.user_id}` : "/login"
                        }
                        onClick={() => setIsMenuOpen(false)}
                        className="block py-2 text-sm"
                      >
                        Profile
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          setIsMenuOpen(false);
                        }}
                        className="block py-2 text-left text-sm w-full"
                        type="button"
                      >
                        Log out
                      </button>
                    </div>
                  )}

                  <Separator />

                  {/* Theme toggle inside menu */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Theme</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setTheme(theme === "dark" ? "light" : "dark")
                      }
                      className="bg-transparent"
                    >
                      {theme === "dark" ? (
                        <>
                          <Sun className="h-4 w-4 mr-2" /> Light
                        </>
                      ) : (
                        <>
                          <Moon className="h-4 w-4 mr-2" /> Dark
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
