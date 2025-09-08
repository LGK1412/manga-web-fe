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
import { ArrowLeft, Shield } from "lucide-react"
import { authAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function VerifyCodePage() {
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState("")
  const [email, setEmail] = useState("")

  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    const emailParam = searchParams.get("email")
    if (emailParam) {
      setEmail(emailParam)
    } else {
      // If no email parameter, redirect back to forgot password
      router.push("/forgot-password")
    }
  }, [searchParams, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!code) {
      setError("Vui lòng nhập mã xác nhận")
      return
    }

    if (code.length !== 6) {
      setError("Mã xác nhận phải có 6 số")
      return
    }

    setIsLoading(true)

    // Just validate code format and redirect to reset password
    // The actual verification will happen in reset-password page
    if (code.length === 6 && /^\d+$/.test(code)) {
      toast({
        title: "Mã xác nhận hợp lệ!",
        description: "Bạn có thể đặt lại mật khẩu.",
      })
      // Redirect to reset password page with email and code parameters
      router.push(`/reset-password?email=${encodeURIComponent(email)}&code=${code}`)
    } else {
      setError("Mã xác nhận phải có 6 chữ số")
    }
    
    setIsLoading(false)
  }

  const handleResendCode = async () => {
    if (!email) {
      setError("Email không tìm thấy. Vui lòng thử lại.")
      return
    }

    setIsResending(true)
    setError("")

    try {
      const response = await authAPI.sendResetCode(email)
      
      if (response.data.success) {
        toast({
          title: "Mã xác nhận đã được gửi lại!",
          description: "Vui lòng kiểm tra email của bạn.",
        })
      } else {
        throw new Error(response.data.message || "Failed to resend code")
      }
    } catch (error: any) {
      console.error("Resend code error:", error)
      setError(error.response?.data?.message || error.message || "Không thể gửi lại mã. Vui lòng thử lại.")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background pt-20 pb-8">
      <div className="max-w-md w-full mx-4">
        <Card>
          <CardHeader className="space-y-1 pb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center">Xác nhận mã</CardTitle>
            <CardDescription className="text-center">
              Chúng tôi đã gửi mã xác nhận 6 số đến
              <br />
              <strong>{email}</strong>
              <br />
              Vui lòng kiểm tra email và nhập mã bên dưới
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm font-medium">
                  Mã xác nhận
                </Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="h-12 text-center text-2xl tracking-[0.5em] font-mono"
                  disabled={isLoading}
                  maxLength={6}
                  autoComplete="one-time-code"
                />
                <p className="text-xs text-muted-foreground text-center">Nhập 6 chữ số được gửi đến email của bạn</p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full h-11" disabled={isLoading || code.length !== 6}>
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang xác nhận...
                  </>
                ) : (
                  "Xác nhận mã"
                )}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">Không nhận được mã?</p>
              <Button variant="outline" onClick={handleResendCode} disabled={isResending} className="bg-transparent">
                {isResending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Đang gửi lại...
                  </>
                ) : (
                  "Gửi lại mã"
                )}
              </Button>
            </div>

            <div className="text-center pt-4 border-t">
              <Link href="/forgot-password" className="inline-flex items-center text-sm text-primary hover:underline">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Thay đổi email
              </Link>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Đã có tài khoản?{" "}
                <Link href="/login" className="text-primary hover:underline">
                  Đăng nhập ngay
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
