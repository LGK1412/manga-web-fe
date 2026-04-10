"use client";

import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { removeCookie } from "./cookie-func";

type AuthContextType = {
  isReady: boolean;
  isLogin: boolean;
  user: any | null;
  setLoginStatus: (val: boolean, user?: any) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

    const syncLoggedOutState = async () => {
      await removeCookie();
      if (!mounted) return;
      setIsLogin(false);
      setUser(null);
      setIsReady(true);
    };

    (async () => {
      try {
        const res = await axios.get(
          apiBase ? `${apiBase}/api/auth/check-login` : "/api/auth/check-login",
          { withCredentials: true },
        );
        if (res.data.isLogin) {
          if (!mounted) return;
          setIsLogin(true);
          setUser(res.data.user ?? null);
          setIsReady(true);
          return;
        }
        await syncLoggedOutState();
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          await syncLoggedOutState();
          return;
        }

        if (!mounted) return;
        setIsLogin(false);
        setUser(null);
        setIsReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const setLoginStatus = (val: boolean, userData?: any) => {
    setIsLogin(val);
    setUser(val ? userData || null : null);
    setIsReady(true);
  };

  return (
    <AuthContext.Provider value={{ isReady, isLogin, user, setLoginStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
