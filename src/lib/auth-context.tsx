"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { User } from "./types";
import { authAPI } from "./api";
import axios from "axios";
import { removeCookie } from "./cookie-func";

interface AuthContextType {
  isLoading: boolean;
  isLogin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isLogin, setIsLogin] = useState(false);

  useEffect(() => {
    async function checkLogin() {
      try {
        setIsLoading(true);
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/check-login`,
          { withCredentials: true }
        );
        if (res.data.isLogin) {
          setIsLogin(true);
        } else {
          setIsLogin(false);
          removeCookie();
        }
      } catch (err) {
        setIsLogin(false);
      } finally {
        setIsLoading(false);
      }
    }
    checkLogin();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
