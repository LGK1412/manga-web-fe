"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Star, Eye, BookOpen, User } from "lucide-react";
import Link from "next/link";
import type { Story, User as UserType } from "@/lib/types";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  console.log("this search" + initialQuery);
}
