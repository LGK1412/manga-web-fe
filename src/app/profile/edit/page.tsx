"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { UserIcon, Mail, Plus, FileText } from "lucide-react";
import Cookies from "js-cookie";
import axios from "axios";

export default function EditProfilePage() {
  const { toast } = useToast();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null); // State for local image preview
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // State to hold the selected file
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for the hidden file input

  useEffect(() => {
    const raw = Cookies.get("user_normal_info");
    if (!raw) {
      router.push("/login");
      return;
    }
    try {
      const decoded = decodeURIComponent(raw);
      const parsed = JSON.parse(decoded);
      setName(parsed.username || "User");
      setEmail(parsed.email || "");
      setBio(parsed.bio || "");
      // Hiển thị avatar với full URL nếu có
      if (parsed.avatar && parsed.avatar !== "avatar-default.webp") {
        setAvatarPreview(
          `${process.env.NEXT_PUBLIC_API_URL}/assets/avatars/${parsed.avatar}`
        );
      } else {
        setAvatarPreview(null);
      }
    } catch {
      router.push("/login");
    }
  }, [router]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click(); // Trigger click on hidden file input
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAvatarPreview(URL.createObjectURL(file)); // Create a local URL for preview
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("username", name);
      formData.append("bio", bio);
      if (selectedFile) {
        formData.append("avatar", selectedFile); // gửi file thật
      }

      const res = await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/profile`,
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      // cập nhật lại cookie
      const raw = Cookies.get("user_normal_info");
      const parsed = raw ? JSON.parse(decodeURIComponent(raw)) : null;

      if (parsed) {
        const serverUser = (res as any)?.data?.user;
        const serverAvatar: string | undefined = serverUser?.avatar;
        const updated = {
          user_id: parsed.user_id,
          email: parsed.email,
          username: name || parsed.username,
          role: parsed.role,
          // lưu đúng filename/path BE trả về, không tự đoán theo selectedFile.name
          avatar: serverAvatar !== undefined ? serverAvatar : parsed.avatar,
          bio: bio || parsed.bio,
        };
        Cookies.set("user_normal_info", JSON.stringify(updated), {
          expires: 360,
          path: "/",
        });
      }

      toast({
        title: "Cập nhật hồ sơ thành công",
        description: "Đã cập nhật hồ sơ thành công",
        variant: "success",
      });

      const userId = parsed?.user_id;
      if (userId) {
        router.push(`/profile/${userId}`);
      } else {
        router.push("/login");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          toast({
            title: "Phiên đăng nhập hết hạn",
            description: "Vui lòng đăng nhập lại",
            variant: "destructive",
          });
          router.push("/login");
        } else if (error.response?.status === 400) {
          console.log("400 error details:", error.response?.data);
          toast({
            title: "Lỗi cập nhật hồ sơ",
            description:
              error.response?.data?.message || "Dữ liệu không hợp lệ",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Lỗi cập nhật hồ sơ",
            description: error.response?.data?.message || "Lỗi server",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Lỗi cập nhật hồ sơ",
          description: "Lỗi không xác định",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Render form directly; access control handled via cookie in useEffect

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 pt-20">
        <h1 className="text-3xl font-bold mb-8">Chỉnh sửa thông tin</h1>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Cập nhật thông tin</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div
                  className="relative group cursor-pointer"
                  onClick={handleAvatarClick}
                >
                  <Avatar className="w-24 h-24">
                    <AvatarImage
                      src={
                        avatarPreview ||
                        "/placeholder.svg?height=96&width=96&text=User"
                      }
                      alt={name}
                    />
                    <AvatarFallback className="text-4xl">
                      {name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="h-8 w-8 text-white" />
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Nhấn vào để chỉnh sửa ảnh đại diện
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Tên</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Điền tên đăng nhập"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 bg-gray-200"
                    readOnly
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Mô tả</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="bio"
                    type="text"
                    placeholder="Điền mô tả"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
