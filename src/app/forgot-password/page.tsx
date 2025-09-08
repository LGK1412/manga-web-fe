"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Mail } from "lucide-react"
import { authAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email) {
      setError("Vui lòng nhập địa chỉ email")
      return
    }

    if (!email.includes("@")) {
      setError("Vui lòng nhập địa chỉ email hợp lệ")
      return
    }

    setIsLoading(true)

    try {
      const response = await authAPI.sendResetCode(email)
      
      if (response.data.success) {
        toast({
          title: "Mã xác nhận đã được gửi!",
          description: "Vui lòng kiểm tra email của bạn.",
        })
        // Redirect to verify code page with email parameter
        router.push(`/verify-code?email=${encodeURIComponent(email)}`)
      } else {
        throw new Error(response.data.message || "Failed to send reset code")
      }
    } catch (error: any) {
      console.error("Send reset code error:", error)
      setError(error.response?.data?.message || error.message || "Không thể gửi mã xác nhận. Vui lòng thử lại.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background pt-20 pb-8">
      <div className="max-w-md w-full mx-4">
        <Card>
          <CardHeader className="space-y-1 pb-6">ryk67k6r7k56k
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center">Quên mật khẩu?</CardTitle>
            <CardDescription className="text-center">
              Nhập địa chỉ email của bạn và chúng tôi sẽ gửi mã xác nhận để đặt lại mật khẩu
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-yyg-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Địa chỉ email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang gửi mã...
                  </>
                ) : (
                  "Gửi mã xác nhận"
                )}
              </Button>
            </form>

            <div className="text-center pt-4">
              <Link href="/login" className="inline-flex items-center text-sm text-primary hover:underline">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Quay lại đăng nhập
              </Link>
            </div>

            <div className="text-center pt-2">
              <p className="text-sm text-muted-foreground">
                Chưa có tài khoản?{" "}
                <Link href="/register" className="text-primary hover:underline">
                  Đăng ký ngay
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
