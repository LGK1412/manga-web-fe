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
import { ArrowLeft, Lock, CheckCircle, Eye, EyeOff } from "lucide-react"
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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
      setError("Please enter a new password")
      return
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)

    if (!code) {
      setError("Verification code not found. Please try again.")
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
          title: "Password changed successfully",
          description: "You can now log in with your new password",
          variant: "success",
        })
        setIsSuccess(true)
        router.push("/login")
      } else {
        toast({
          title: "Failed to change password",
          description: "Please try again.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        toast({
          title: "Failed to change password",
          description: error.response?.data.message || error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Failed to change password",
          description: `Unexpected error: ${error}`,
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
                <h2 className="text-2xl font-bold mb-2">Password reset successful!</h2>
                <p className="text-muted-foreground">
                  Your password has been updated successfully.
                  <br />
                  You can now log in with your new password.
                </p>
              </div>

              <div className="space-y-4">
                <Button className="w-full h-11" asChild>
                  <Link href="/login">Log in now</Link>
                </Button>

                <div className="text-center">
                  <Link href="/" className="text-sm text-primary hover:underline">
                    Back to home
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
            <CardTitle className="text-2xl font-bold text-center">Set New Password</CardTitle>
            <CardDescription className="text-center">
              Create a new password for your account
              <br />
              <strong>{email}</strong>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium">
                  New Password
                </Label>

                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password (minimum 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-11 pr-10"
                    disabled={isLoading}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Password
                </Label>

                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-11 pr-10"
                    disabled={isLoading}
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Password strength indicator */}
              {newPassword && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Password strength:</div>
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
                    {newPassword.length < 6 && "Need at least 6 characters"}
                    {newPassword.length >= 6 && newPassword.length < 8 && "Good - should have 8+ characters"}
                    {newPassword.length >= 8 &&
                      !/[A-Z]/.test(newPassword) &&
                      "Very good - add uppercase and numbers to make it stronger"}
                    {newPassword.length >= 8 &&
                      /[A-Z]/.test(newPassword) &&
                      /[0-9]/.test(newPassword) &&
                      "Strong password!"}
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
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>

            <div className="text-center pt-4 border-t">
              <Link
                href={`/verify-code?email=${encodeURIComponent(email)}`}
                className="inline-flex items-center text-sm text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to verify code
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
