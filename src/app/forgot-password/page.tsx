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
import { useToast } from "@/hooks/use-toast"
import axios from "axios"

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [emailError, setEmailError] = useState("")
    const router = useRouter()
    const { toast } = useToast()

    const validateEmail = () => {
        if (!email) {
            setEmailError("Email is required")
            return false
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError("Invalid email format")
            return false
        }
        setEmailError("")
        return true
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        
        if (!validateEmail()) {
            return
        }

        setIsLoading(true)

        try {
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/send-forgot-password`, { email })

            if (response.data.success) {
                toast({
                    title: "Password reset link sent!",
                    description: "Please check your email.",
                    variant: "success",
                })
            } else {
                throw new Error(response.data.message || "Failed to send reset code")
            }
        } catch (error: any) {
            let errorMessage = "Unable to send verification code. Please try again."
            
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
            
            setError(errorMessage)
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
                            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                                <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold text-center">Forgot password?</CardTitle>
                        <CardDescription className="text-center">
                            Enter your email address and we'll send you a verification code to reset your password
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium">
                                    Email address
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="example@email.com"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value)
                                        if (emailError) {
                                            setEmailError("")
                                        }
                                    }}
                                    className={`h-11 ${emailError ? "border-red-500" : ""}`}
                                    disabled={isLoading}
                                    required
                                />
                                {emailError && (
                                    <p className="text-sm text-red-500">{emailError}</p>
                                )}
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
                                        Sending code...
                                    </>
                                ) : (
                                    "Send verification code"
                                )}
                            </Button>
                        </form>

                        <div className="text-center pt-4">
                            <Link href="/login" className="inline-flex items-center text-sm text-primary hover:underline">
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                Back to login
                            </Link>
                        </div>

                        <div className="text-center pt-2">
                            <p className="text-sm text-muted-foreground">
                                Don't have an account?{" "}
                                <Link href="/register" className="text-primary hover:underline">
                                    Sign up now
                                </Link>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
