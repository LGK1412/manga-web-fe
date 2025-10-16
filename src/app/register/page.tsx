"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { BookOpen, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import axios from "axios"
import { useRouter } from "next/navigation"
import GoogleButton from "@/components/GoogleButton"
import ActivePoliciesModal from "@/components/ActivePoliciesModal"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)

  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Mật khẩu không khớp",
        description: "Mật khẩu không khớp.",
        variant: "destructive",
      })
      return
    }

    if (!formData.agreeToTerms) {
      toast({
        title: "Cần chấp nhận điều khoản",
        description: "Vui lòng chấp nhận điều khoản và điều kiện.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`,
        { email: formData.email, password: formData.password, username: formData.name },
        { withCredentials: true }
      )

      if (res.data.success) {
        // gửi verify email
        const resSend = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/send-verify-email`,
          { email: formData.email },
          { withCredentials: true }
        )

        if (resSend.data.success) {
          toast({
            title: "Gửi link xác thực thành công!",
            description: "Vui lòng kiểm tra email để xác minh tài khoản của bạn.",
          })
        } else {
          toast({
            title: "Gửi link xác thực không thành công!",
            description: "Vui lòng đăng nhập để thử lại.",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Đăng ký không thành công",
          description: res.data.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast({
          title: "Đăng ký không thành công",
          description: (error.response?.data as any)?.message || `${error}`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Đăng ký không thành công",
          description: `Lỗi không mong muốn: ${error}`,
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Modals */}
      <ActivePoliciesModal
        open={termsOpen}
        onOpenChange={setTermsOpen}
        typeFilter={["Terms"]}
        title="Điều khoản dịch vụ"
        description="Các điều khoản hiện đang có hiệu lực"
      />
      <ActivePoliciesModal
        open={privacyOpen}
        onOpenChange={setPrivacyOpen}
        typeFilter={["Privacy"]}
        title="Chính sách bảo mật"
        description="Chính sách bảo mật hiện đang có hiệu lực"
      />

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <BookOpen className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">Tạo tài khoản</CardTitle>
          <CardDescription>Tham gia Manga World và bắt đầu hành trình đọc của bạn</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên người dùng</Label>
              <Input
                id="name"
                type="text"
                placeholder="Nhập tên người dùng của bạn"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Nhập email của bạn"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Tạo mật khẩu"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Xác nhận mật khẩu của bạn"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={formData.agreeToTerms}
                onCheckedChange={(checked) => setFormData({ ...formData, agreeToTerms: checked as boolean })}
                required
              />
              <Label htmlFor="terms" className="text-sm">
                Tôi đồng ý với{" "}
                <button type="button" onClick={() => setTermsOpen(true)} className="text-primary hover:underline">
                  Điều khoản dịch vụ
                </button>{" "}
                và{" "}
                <button type="button" onClick={() => setPrivacyOpen(true)} className="text-primary hover:underline">
                  Chính sách bảo mật
                </button>
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
            </Button>
          </form>

          <Separator />

          <GoogleButton />

          <div className="text-center text-sm">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Đăng nhập
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
