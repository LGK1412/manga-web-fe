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
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string
    email?: string
    password?: string
    confirmPassword?: string
  }>({})

  const router = useRouter()
  const { toast } = useToast()

  const validateForm = () => {
    const newErrors: typeof errors = {}

    if (!formData.name || formData.name.trim().length < 3) {
      newErrors.name = "Username must be at least 3 characters"
    } else if (formData.name.length > 30) {
      newErrors.name = "Username must not exceed 30 characters"
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.name)) {
      newErrors.name = "Username can only contain letters, numbers, and underscores"
    }

    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format"
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 6 || formData.password.length > 20) {
      newErrors.password = "Password must be between 6 and 20 characters"
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Password confirmation is required"
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    if (!formData.agreeToTerms) {
      toast({
        title: "Terms acceptance required",
        description: "Please accept the terms and conditions.",
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
        setIsSendingEmail(true)
        try {
          const resSend = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/auth/send-verify-email`,
            { email: formData.email },
            { withCredentials: true }
          )

          if (resSend.data.success) {
            toast({
              title: "Registration successful!",
              description: "Please check your email to verify your account.",
              variant: "success",
            })
            router.push("/login")
          } else {
            toast({
              title: "Registration successful but failed to send verification email",
              description: "Please log in and request to resend the verification email.",
              variant: "destructive",
            })
          }
        } catch (emailError) {
          toast({
            title: "Registration successful but failed to send verification email",
            description: axios.isAxiosError(emailError)
              ? (emailError.response?.data as any)?.message || "Error sending email"
              : "Unexpected error while sending email",
            variant: "destructive",
          })
        } finally {
          setIsSendingEmail(false)
        }
      } else {
        toast({
          title: "Registration failed",
          description: res.data.message || "An error occurred during registration",
          variant: "destructive",
        })
      }
    } catch (error) {
      let errorMessage = "An error occurred during registration"
      
      if (axios.isAxiosError(error)) {
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message
        } else if (error.response?.status === 400) {
          errorMessage = "Invalid data"
        } else if (error.response?.status === 500) {
          errorMessage = "Server error, please try again later"
        } else if (error.message === "Network Error") {
          errorMessage = "Unable to connect to server"
        }
      }
      
      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive",
      })
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
        title="Terms of Service"
        description="Currently active terms"
      />
      <ActivePoliciesModal
        open={privacyOpen}
        onOpenChange={setPrivacyOpen}
        typeFilter={["Privacy"]}
        title="Privacy Policy"
        description="Currently active privacy policy"
      />

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <BookOpen className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">Create account</CardTitle>
          <CardDescription>Join Manga World and start your reading journey</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Username</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your username"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  if (errors.name) {
                    setErrors({ ...errors, name: undefined })
                  }
                }}
                required
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value })
                  if (errors.email) {
                    setErrors({ ...errors, email: undefined })
                  }
                }}
                required
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create password (6-20 characters)"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value })
                    if (errors.password) {
                      setErrors({ ...errors, password: undefined })
                    }
                  }}
                  required
                  className={`pr-10 ${errors.password ? "border-red-500" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, confirmPassword: e.target.value })
                    if (errors.confirmPassword) {
                      setErrors({ ...errors, confirmPassword: undefined })
                    }
                  }}
                  required
                  className={`pr-10 ${errors.confirmPassword ? "border-red-500" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={formData.agreeToTerms}
                onCheckedChange={(checked) => setFormData({ ...formData, agreeToTerms: checked as boolean })}
                required
              />
              <Label htmlFor="terms" className="text-sm">
                I agree to the{" "}
                <button type="button" onClick={() => setTermsOpen(true)} className="text-primary hover:underline">
                  Terms of Service
                </button>{" "}
                and{" "}
                <button type="button" onClick={() => setPrivacyOpen(true)} className="text-primary hover:underline">
                  Privacy Policy
                </button>
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || isSendingEmail}>
              {isLoading 
                ? "Creating account..." 
                : isSendingEmail 
                ? "Sending verification email..." 
                : "Create account"}
            </Button>
          </form>

          <Separator />

          <GoogleButton />

          <div className="text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
