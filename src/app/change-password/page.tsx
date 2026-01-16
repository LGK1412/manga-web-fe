"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import axios from "axios"

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({})
  const router = useRouter()
  const { toast } = useToast()

  const validateForm = () => {
    const newErrors: { newPassword?: string; confirmPassword?: string } = {}

    if (!newPassword) {
      newErrors.newPassword = "New password is required"
    } else if (newPassword.length < 6 || newPassword.length > 20) {
      newErrors.newPassword = "Password must be between 6 and 20 characters"
    } else if (!/^[\S]+$/.test(newPassword)) {
      newErrors.newPassword = "Password cannot contain spaces"
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Password confirmation is required"
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/change-password`,
        { password: newPassword },
        { withCredentials: true }
      )

      if (res.data.success) {
        toast({
          title: "Password changed successfully",
          description: "You can now log in with your new password",
        })
        router.push("/")
      } else {
        toast({
          title: "Failed to change password",
          description: "Please try again.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      let errorMessage = "Unable to change password. Please try again."

      if (axios.isAxiosError(error)) {
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message
        } else if (error.response?.status === 400) {
          errorMessage = "Invalid data"
        } else if (error.response?.status === 401) {
          errorMessage = "Session expired. Please log in again"
        } else if (error.response?.status === 500) {
          errorMessage = "Server error, please try again later"
        } else if (error.message === "Network Error") {
          errorMessage = "Unable to connect to server"
        }
      }

      setError(errorMessage)
      toast({
        title: "Failed to change password",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
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
            <CardTitle className="text-2xl font-bold text-center">Set new password</CardTitle>
            <CardDescription className="text-center">
              Enter your new password
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* NEW PASSWORD */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      if (errors.newPassword) {
                        setErrors({ ...errors, newPassword: undefined })
                      }
                    }}
                    className={errors.newPassword ? "border-red-500" : ""}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-sm text-red-500">{errors.newPassword}</p>
                )}
              </div>

              {/* CONFIRM PASSWORD */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (errors.confirmPassword) {
                        setErrors({ ...errors, confirmPassword: undefined })
                      }
                    }}
                    className={errors.confirmPassword ? "border-red-500" : ""}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                )}
              </div>

              {error && (
                <Alert variant="warning">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update password"}
              </Button>
            </form>

            <div className="text-center pt-4 border-t">
              <Link href="/login" className="text-sm text-primary hover:underline">
                Back to login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
