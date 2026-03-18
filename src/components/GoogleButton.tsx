"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { setCookie } from "@/lib/cookie-func";
import { useToast } from "@/hooks/use-toast";
import Cookies from "js-cookie";

const raw = Cookies.get("user_normal_info");

declare global {
    interface Window {
        google: any;
    }
}

export default function Home() {
    const router = useRouter();
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        const loadGoogle = () => {
            const script = document.createElement("script");
            script.src = "https://accounts.google.com/gsi/client?hl=en";
            script.async = true;
            script.defer = true;
            script.onload = () => {
                // Set locale before initializing
                if (window.google?.accounts?.id) {
                    window.google.accounts.id.initialize({
                        client_id: process.env.NEXT_PUBLIC_GG_ID as string,
                        callback: handleCredentialResponse,
                        locale: "en", // Force English language
                        ux_mode: "popup", // Use popup mode
                    });

                    window.google.accounts.id.renderButton(
                        document.getElementById("googleBtn"),
                        {
                            theme: "outline",
                            size: "large",
                            text: "signin_with", // "Sign in with Google" in English
                            width: "auto",
                            type: "standard"
                        }
                    );
                }
            };
            document.body.appendChild(script);
        };

        loadGoogle();
    }, []);

    async function handleCredentialResponse(response: { credential: string }) {
        setIsLoading(true);
        try {
            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`,
                { idToken: response.credential },
                { withCredentials: true },
            );

            setCookie(res.data.tokenPayload);

            toast({
                title: "Welcome back!",
                description: "You have successfully logged in",
            })

            let role = null;

            try {
                if (raw) {
                    const userInfo = JSON.parse(raw);
                    role = userInfo.role;
                }
            } catch (e) {
                console.log("JSON lỗi:", raw);
            }

            if (role === "admin") {
                return router.push("/admin/dashboard");
            } else if (role === "content_moderator") {
                return router.push("/admin/user");
            } else if (role === "financial_manager"){
                return router.push("/admin/user");
            } else if (role === "community_manager"){
                return router.push("/admin/user");
            }

            router.push("/");
        } catch (error: any) {
            if (axios.isAxiosError(error)) {
                toast({
                    title: "Login failed",
                    description: error.response?.data.message || error,
                    variant: "destructive",
                })
            } else {
                toast({
                    title: "Login failed",
                    description: `Unexpected error: ${error}`,
                    variant: "destructive",
                })
            }
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="relative">
            <div id="googleBtn" style={{ opacity: isLoading ? 0.5 : 1, pointerEvents: isLoading ? 'none' : 'auto' }}></div>
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded">
                    <div className="text-sm text-muted-foreground">Processing...</div>
                </div>
            )}
        </div>
    );
}
