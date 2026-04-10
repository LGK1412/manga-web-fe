"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { setCookie } from "@/lib/cookie-func";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { resolvePostLoginHref } from "@/lib/admin-workspace";

declare global {
  interface Window {
    google: any;
  }
}

export default function Home() {
  const router = useRouter();
  const { toast } = useToast();
  const { setLoginStatus } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      setIsLoading(true);

      try {
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`,
          { idToken: response.credential },
          { withCredentials: true },
        );

        const tokenPayload = res.data.tokenPayload;
        await setCookie(tokenPayload);
        setLoginStatus(true, tokenPayload);

        toast({
          title: "Welcome back!",
          description: "You have successfully logged in",
        });

        router.replace(resolvePostLoginHref(tokenPayload?.role));
        return;
      } catch (error: any) {
        if (axios.isAxiosError(error)) {
          toast({
            title: "Login failed",
            description: error.response?.data.message || error,
            variant: "destructive",
          });
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
    },
    [router, setLoginStatus, toast],
  );

  useEffect(() => {
    const loadGoogle = () => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client?hl=en";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google?.accounts?.id) {
          window.google.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GG_ID as string,
            callback: handleCredentialResponse,
            locale: "en",
            ux_mode: "popup",
          });

          window.google.accounts.id.renderButton(
            document.getElementById("googleBtn"),
            {
              theme: "outline",
              size: "large",
              text: "signin_with",
              width: "auto",
              type: "standard",
            },
          );
        }
      };
      document.body.appendChild(script);
    };

    loadGoogle();
  }, [handleCredentialResponse]);

  return (
    <div className="relative">
      <div
        id="googleBtn"
        style={{
          opacity: isLoading ? 0.5 : 1,
          pointerEvents: isLoading ? "none" : "auto",
        }}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center rounded bg-background/50">
          <div className="text-sm text-muted-foreground">Processing...</div>
        </div>
      )}
    </div>
  );
}
