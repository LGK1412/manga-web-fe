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
        title: "Invalid link",
        description: "Verification link is missing or invalid.",
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
            title: "Email verified!",
            description: "Your account has been verified successfully. You can now log in.",
            variant: "success",
          })
          router.push("/login")
        } else {
          toast({
            title: "Verification failed",
            description: "The link may have expired.",
            variant: "destructive",
          })
        }
      } catch (err: any) {
        setStatus("error")
        toast({
          title: "Verification failed",
          description: err.response?.data?.message || err.message || "The link may have expired.",
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
          <CardTitle className="text-2xl">Verify Email</CardTitle>
          <CardDescription>
            {status === "loading" && "Verifying your email, please wait..."}
            {status === "success" && "Your email has been verified! Redirecting to login page..."}
            {status === "error" && "Verification failed. Please try again or request a new link."}
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  )
}
