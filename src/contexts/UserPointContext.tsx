"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import axios from "axios";
import { useAuth } from "@/lib/auth-context";
import Cookies from "js-cookie";

interface UserPointContextType {
  point: number;
  authorPoint: number;
  role: string;
  refreshPoints: () => void;
  setPointsDirectly: (p: number, ap?: number) => void;
}

const UserPointContext = createContext<UserPointContextType | undefined>(
  undefined
);

export const UserPointProvider = ({ children }: { children: ReactNode }) => {
  const [point, setPoint] = useState(0);
  const [authorPoint, setAuthorPoint] = useState(0);
  const [role, setRole] = useState("");
  const { isLogin } = useAuth();

  const fetchPoints = async () => {
    // Check if user is logged in before making API call
    const accessToken = Cookies.get("access_token");
    if (!accessToken) {
      // Try to get role from cookie as fallback
      const userInfo = Cookies.get("user_normal_info");
      if (userInfo) {
        try {
          const decoded = decodeURIComponent(userInfo);
          const parsed = JSON.parse(decoded);
          if (parsed.role) {
            setRole(parsed.role);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      return; // Don't call API if user is not logged in
    }

    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/point`,
        {
          withCredentials: true,
        }
      );
      console.log("Point API response:", res.data);
      console.log("Full response:", res);
      const pointValue = Number(res.data?.point) || 0;
      const authorPointValue = Number(res.data?.author_point) || 0;
      console.log("Setting point to:", pointValue, "authorPoint to:", authorPointValue);
      console.log("Current state before update - point:", point, "authorPoint:", authorPoint);
      setPoint(pointValue);
      setAuthorPoint(authorPointValue);
      setRole(res.data?.role || "");
      console.log("State updated - point should be:", pointValue, "authorPoint should be:", authorPointValue);
    } catch (err: any) {
      console.error("Error fetching points:", err);
      console.error("Error response:", err?.response?.data);
      console.error("Error status:", err?.response?.status);
      // If API fails, try to get role from cookie as fallback
      const userInfo = Cookies.get("user_normal_info");
      if (userInfo) {
        try {
          const decoded = decodeURIComponent(userInfo);
          const parsed = JSON.parse(decoded);
          if (parsed.role) {
            setRole(parsed.role);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      // Don't reset points to 0 on error - keep previous values
      // setPoint(0);
      // setAuthorPoint(0);
    }
  };

  const refreshPoints = () => fetchPoints();

  const setPointsDirectly = (p: number, ap?: number) => {
    setPoint(p);
    if (ap !== undefined) setAuthorPoint(ap);
  };

  useEffect(() => {
    // Fetch points if user is logged in (check both isLogin and cookie)
    const accessToken = Cookies.get("access_token");
    if (isLogin || accessToken) {
      fetchPoints();
    } else {
      // If not logged in, try to get role from cookie
      const userInfo = Cookies.get("user_normal_info");
      if (userInfo) {
        try {
          const decoded = decodeURIComponent(userInfo);
          const parsed = JSON.parse(decoded);
          if (parsed.role) {
            setRole(parsed.role);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }, [isLogin]);

  return (
    <UserPointContext.Provider
      value={{ point, authorPoint, role, refreshPoints, setPointsDirectly }}
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
