"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Lock, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import axios from "axios"

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    const emailParam = searchParams.get("email")
    const codeParam = searchParams.get("code")

    if (emailParam) {
      setEmail(emailParam)
    } else {
      // If no email parameter, redirect back to forgot password
      router.push("/forgot-password")
    }
    if (codeParam) {
      setCode(codeParam)
    }
  }, [searchParams, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!newPassword) {
      setError("Vui lòng nhập mật khẩu mới")
      return
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp")
      return
    }

    setIsLoading(true)

    if (!code) {
      setError("Mã xác nhận không tìm thấy. Vui lòng thử lại.")
      setIsLoading(false)
      return
    }

    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-forgot-password`, {
        password: newPassword,
        code
      }, { withCredentials: true })

      if (res.data.success) {
        toast({
          title: "Đổi mật khẩu thành công",
          description: "Có thể đăng nhập lại bằng mật khẩu mới",
        })
        setIsSuccess(true)
        router.push("/login")
      } else {
        toast({
          title: "Đổi mật khẩu không thành công",
          description: "Vui lòng làm lại.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast({
          title: "Đổi mật khẩu không thành công",
          description: error.response?.data.message || error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Đổi mật khẩu không thành công",
          description: `Lỗi không mong muốn: ${error}`,
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background pt-20 pb-8">
        <div className="max-w-md w-full mx-4">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Đặt lại mật khẩu thành công!</h2>
                <p className="text-muted-foreground">
                  Mật khẩu của bạn đã được cập nhật thành công.
                  <br />
                  Bạn có thể đăng nhập với mật khẩu mới.
                </p>
              </div>

              <div className="space-y-4">
                <Button className="w-full h-11" asChild>
                  <Link href="/login">Đăng nhập ngay</Link>
                </Button>

                <div className="text-center">
                  <Link href="/" className="text-sm text-primary hover:underline">
                    Về trang chủ
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background pt-20 pb-8">
      <div className="max-w-md w-full mx-4">
        <Card>
          <CardHeader className="space-y-1 pb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <Lock className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center">Đặt mật khẩu mới</CardTitle>
            <CardDescription className="text-center">
              Tạo mật khẩu mới cho tài khoản
              <br />
              <strong>{email}</strong>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium">
                  Mật khẩu mới
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-11"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Xác nhận mật khẩu
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11"
                  disabled={isLoading}
                />
              </div>

              {/* Password strength indicator */}
              {newPassword && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Độ mạnh mật khẩu:</div>
                  <div className="flex gap-1">
                    <div
                      className={`h-1 flex-1 rounded ${newPassword.length >= 6 ? "bg-green-500" : "bg-gray-300"}`}
                    ></div>
                    <div
                      className={`h-1 flex-1 rounded ${newPassword.length >= 8 ? "bg-green-500" : "bg-gray-300"}`}
                    ></div>
                    <div
                      className={`h-1 flex-1 rounded ${/[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) ? "bg-green-500" : "bg-gray-300"}`}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {newPassword.length < 6 && "Cần ít nhất 6 ký tự"}
                    {newPassword.length >= 6 && newPassword.length < 8 && "Tốt - nên có 8+ ký tự"}
                    {newPassword.length >= 8 &&
                      !/[A-Z]/.test(newPassword) &&
                      "Rất tốt - thêm chữ hoa và số để mạnh hơn"}
                    {newPassword.length >= 8 &&
                      /[A-Z]/.test(newPassword) &&
                      /[0-9]/.test(newPassword) &&
                      "Mật khẩu mạnh!"}
                  </div>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang cập nhật...
                  </>
                ) : (
                  "Cập nhật mật khẩu"
                )}
              </Button>
            </form>

            <div className="text-center pt-4 border-t">
              <Link
                href={`/verify-code?email=${encodeURIComponent(email)}`}
                className="inline-flex items-center text-sm text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Quay lại xác nhận mã
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
