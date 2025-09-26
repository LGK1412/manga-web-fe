"use client";

import type React from "react";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Eye, EyeOff } from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { setCookie } from "@/lib/cookie-func";
import GoogleButton from "@/components/GoogleButton";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`,
        {
          email,
          password,
        },
        { withCredentials: true }
      );

      await setCookie(res.data.tokenPayload);

      toast({
        title: "Chào mừng trở lại!",
        description: "Bạn đã đăng nhập thành công",
      });

      router.push("/");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (
          error.response?.data.message.includes(
            "Tài khoản này chưa được xác minh"
          )
        ) {
          // Gửi verify nếu chưa khi login
          const resSend = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/auth/send-verify-email`,
            {
              email: email,
            },
            { withCredentials: true }
          );

          if (resSend.data.success) {
            toast({
              title: "Gửi link xác thực thành công!",
              description:
                "Vui lòng kiểm tra email để xác minh tài khoản của bạn để có thể đăng nhập.",
            });
          } else {
            toast({
              title: "Gửi link xác thực không thành công!",
              description: "Vui lòng đăng nhập để thử lại.",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Đăng nhập thất bại!",
            description: error.response?.data.message || "Lỗi server",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Đăng nhập không thành công",
          description: `Lỗi không mong muốn: ${error}`,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <BookOpen className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">Chào mừng trở lại</CardTitle>
          <CardDescription>Đăng nhập vào tài khoản Manga World của bạn</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Nhập email của bạn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập mật khẩu của bạn"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </form>

          <div className="text-center">
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              Quên mật khẩu?
            </Link>
          </div>

          <Separator />

          <div className="w-full bg-transparent">
            <GoogleButton />
          </div>

          <div className="text-center text-sm">
            {"Bạn chưa có tài khoản? "}
            <Link href="/register" className="text-primary hover:underline">
              Đăng ký
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
