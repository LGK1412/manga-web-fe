"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Mail } from "lucide-react"
import { authAPI } from "@/lib/api"
import { useSearchParams } from "next/navigation"

export default function VerifyEmailPage() {
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [email, setEmail] = useState("")
  const { toast } = useToast()
  const searchParams = useSearchParams()

  // Get email from URL params or localStorage
  useEffect(() => {
    const emailParam = searchParams.get('email')
    const storedEmail = localStorage.getItem('userEmail')
    setEmail(emailParam || storedEmail || '')
  }, [searchParams])

  // Auto-send verification code when page loads
  useEffect(() => {
    if (email) {
      handleResendCode()
    }
  }, [email])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast({
        title: "Error",
        description: "Email not found. Please try registering again.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await authAPI.verifyVerificationCode(email, code)
      
      if (response.data.success) {
        toast({
          title: "Email verified!",
          description: "Your account has been successfully verified.",
        })
        // Clear stored email and redirect to login
        localStorage.removeItem('userEmail')
        window.location.href = "/login"
      } else {
        throw new Error(response.data.message || "Verification failed")
      }
    } catch (error: any) {
      console.error("Verification error:", error)
      toast({
        title: "Verification failed",
        description: error.response?.data?.message || error.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Email not found. Please try registering again.",
        variant: "destructive",
      })
      return
    }

    setIsResending(true)

    try {
      const response = await authAPI.sendVerificationCode(email)
      
      if (response.data.success) {
        toast({
          title: "Code sent!",
          description: "A new verification code has been sent to your email.",
        })
      } else {
        throw new Error(response.data.message || "Failed to send code")
      }
    } catch (error: any) {
      console.error("Resend error:", error)
      toast({
        title: "Failed to resend",
        description: error.response?.data?.message || error.message || "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Mail className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription>
            We've sent a verification code to <strong>{email}</strong>. Please enter it below to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Verifying..." : "Verify Email"}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">{"Didn't receive the code?"}</p>
            <Button variant="outline" onClick={handleResendCode} disabled={isResending}>
              {isResending ? "Sending..." : "Resend Code"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
