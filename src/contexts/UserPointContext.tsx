"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";
import { removeCookie } from "@/lib/cookie-func";

interface UserPointContextType {
  point: number;
  authorPoint: number;
  role: string;
  isLoading: boolean;
  refreshPoints: () => Promise<void>;
}

const UserPointContext = createContext<UserPointContextType | undefined>(
  undefined,
);

export const UserPointProvider = ({ children }: { children: ReactNode }) => {
  const [point, setPoint] = useState(0);
  const [authorPoint, setAuthorPoint] = useState(0);
  const [role, setRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = useCallback(async () => {
    try {
      setIsLoading(true);
      const resMe = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`,
        { withCredentials: true },
      );

      const userData = resMe.data;
      const currentRole = userData?.role || "";
      setRole(currentRole);

      if (currentRole !== "user" && currentRole !== "author") {
        setPoint(0);
        setAuthorPoint(0);
        return;
      }

      setPoint(Number(userData?.point) || 0);
      setAuthorPoint(Number(userData?.author_point) || 0);
    } catch (err: any) {
      setRole("");
      setPoint(0);
      setAuthorPoint(0);
      if (err?.response?.status === 401) {
        await removeCookie();
      } else {
        console.error("UserPointProvider Error:", err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  return (
    <UserPointContext.Provider
      value={{
        point,
        authorPoint,
        role,
        isLoading,
        refreshPoints: fetchUserData,
      }}
    >
      {children}
    </UserPointContext.Provider>
  );
};

export const useUserPoint = () => {
  const context = useContext(UserPointContext);
  if (!context)
    throw new Error("useUserPoint must be used within UserPointProvider");
  return context;
};
