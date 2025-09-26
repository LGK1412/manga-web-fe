"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Mail } from "lucide-react"
import { authAPI } from "@/lib/api"
import { useRouter, useSearchParams } from "next/navigation"
import axios from "axios"

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const token = searchParams.get("token")

    if (!token) {
      setStatus("error")
      toast({
        title: "Liên kết không hợp lệ",
        description: "Liên kết xác minh bị thiếu hoặc không hợp lệ.",
        variant: "destructive",
      })
      return
    }

    const verifyEmail = async () => {
      try {
        const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-email`, {
          code: token
        }, { withCredentials: true })

        if (res.data.success) {
          setStatus("success")
          toast({
            title: "Email đã được xác minh!",
            description: "Tài khoản của bạn đã được xác minh thành công. Bây giờ bạn có thể đăng nhập.",
          })
          router.push("/login")
        } else {
          toast({
            title: "Xác minh không thành công",
            description: "Có thể liên kết đã hết hạn.",
            variant: "destructive",
          })
        }
      } catch (err: any) {
        setStatus("error")
        toast({
          title: "Xác minh không thành công",
          description: err.response?.data?.message || err.message || "Có thể liên kết đã hết hạn.",
          variant: "destructive",
        })
      }
    }

    verifyEmail()
  }, [searchParams, toast])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Mail className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">Xác minh email</CardTitle>
          <CardDescription>
            {status === "loading" && "Đang xác minh email của bạn, vui lòng đợi..."}
            {status === "success" && "Email của bạn đã được xác minh! Đang chuyển hướng đến trang đăng nhập..."}
            {status === "error" && "Xác minh không thành công. Vui lòng thử lại hoặc yêu cầu liên kết mới."}
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  )
}
