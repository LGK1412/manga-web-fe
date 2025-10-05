"use client";

import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

type AuthContextType = {
  isLogin: boolean;
  user: any | null;
  setLoginStatus: (val: boolean, user?: any) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLogin, setIsLogin] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("/api/auth/check-login", { withCredentials: true });
        if (res.data.isLogin) {
          
          setIsLogin(true);
          setUser(res.data.user);
        }
      } catch (err) {
        setIsLogin(false);
        setUser(null);
      }
    })();
  }, []);

  const setLoginStatus = (val: boolean, userData?: any) => {
    setIsLogin(val);
    setUser(val ? userData || null : null);
  };

  return (
    <AuthContext.Provider value={{ isLogin, user, setLoginStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
