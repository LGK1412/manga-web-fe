"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import axios from "axios";

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

  const fetchPoints = async () => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/point`,
        {
          withCredentials: true,
        }
      );
      setPoint(res.data.point ?? 0);
      setAuthorPoint(res.data.author_point ?? 0);
      setRole(res.data.role);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshPoints = () => fetchPoints();

  const setPointsDirectly = (p: number, ap?: number) => {
    setPoint(p);
    if (ap !== undefined) setAuthorPoint(ap);
  };

  useEffect(() => {
    fetchPoints();
  }, []);

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
