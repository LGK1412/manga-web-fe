"use client";

import type React from "react";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Eye, EyeOff } from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { setCookie } from "@/lib/cookie-func";
import GoogleButton from "@/components/GoogleButton";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
  }>({})
  const { toast } = useToast();
  const router = useRouter();
  const { setLoginStatus } = useAuth();

  const validateForm = () => {
    const newErrors: typeof errors = {}

    if (!email) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email format"
    }

    if (!password) {
      newErrors.password = "Password is required"
    } else if (password.length < 6 || password.length > 20) {
      newErrors.password = "Password must be between 6 and 20 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return
    }

    setIsLoading(true);

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`,
        {
          email,
          password,
        },
        { withCredentials: true }
      );

      await setCookie(res.data.tokenPayload);

      toast({
        title: "Welcome back!",
        description: "You have successfully logged in",
        variant: "success"
      });
      setLoginStatus(true);
      window.location.href = "/";
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (
          error.response?.data.message.includes(
            "This account has not been verified"
          ) || error.response?.data.message.includes(
            "This account has not been verified"
          )
        ) {
          setIsSendingEmail(true);
          try {
            const resSend = await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL}/api/auth/send-verify-email`,
              {
                email: email,
              },
              { withCredentials: true }
            );

            if (resSend.data.success) {
              toast({
                title: "Verification email sent successfully!",
                description:
                  "Please check your email to verify your account before logging in.",
                variant: "success"
              });
            } else {
              toast({
                title: "Failed to send verification email!",
                description: "Please try again later.",
                variant: "destructive",
              });
            }
          } catch (emailError) {
            if (axios.isAxiosError(emailError)) {
              toast({
                title: "Failed to send verification email!",
                description: emailError.response?.data?.message || "An error occurred while sending email",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Failed to send verification email!",
                description: "Unexpected error while sending email",
                variant: "destructive",
              });
            }
          } finally {
            setIsSendingEmail(false);
          }
        } else {
          toast({
            title: "Login failed!",
            description: error.response?.data.message || "Server error",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Login failed",
          description: `Unexpected error: ${error}`,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <BookOpen className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>
            Sign in to your Manga World account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
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
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
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
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || isSendingEmail}>
              {isLoading 
                ? "Logging in..." 
                : isSendingEmail 
                ? "Sending verification email..." 
                : "Login"}
            </Button>
          </form>

          <div className="text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Separator />

          <div className="w-full bg-transparent">
            <GoogleButton />
          </div>

          <div className="text-center text-sm">
            {"Don't have an account? "}
            <Link href="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
