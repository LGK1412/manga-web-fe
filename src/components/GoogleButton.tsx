"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { setCookie } from "@/lib/cookie-func";
import { useToast } from "@/hooks/use-toast";

declare global {
    interface Window {
        google: any;
    }
}

export default function Home() {
    const router = useRouter();
    const { toast } = useToast()

    useEffect(() => {
        const loadGoogle = () => {
            const script = document.createElement("script");
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.defer = true;
            script.onload = () => {
                window.google.accounts.id.initialize({
                    client_id: process.env.NEXT_PUBLIC_GG_ID as string,
                    callback: handleCredentialResponse,
                });

                window.google.accounts.id.renderButton(
                    document.getElementById("googleBtn"),
                    { theme: "outline", size: "large" }
                );
            };
            document.body.appendChild(script);
        };

        loadGoogle();
    }, []);

    async function handleCredentialResponse(response: { credential: string }) {
        try {
            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`,
                { idToken: response.credential },
                { withCredentials: true },                
            );

            setCookie(res.data.tokenPayload);

            toast({
                title: "Chào mừng trở lại!",
                description: "Bạn đã đăng nhập thành công",
            })
            router.replace("/");
        } catch (error: any) {
            if (axios.isAxiosError(error)) {
                toast({
                    title: "Đăng nhập không thành công",
                    description: error.response?.data.message || error,
                    variant: "destructive",
                })
            } else {
                toast({
                    title: "Đăng nhập không thành công",
                    description: `Lỗi không mong muốn: ${error}`,
                    variant: "destructive",
                })
            }
        }
    }

    return <div id="googleBtn"></div>;
}
