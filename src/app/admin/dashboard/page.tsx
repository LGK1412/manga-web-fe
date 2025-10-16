"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Users,
  BookOpen,
  AlertCircle,
  Bell,
  Eye,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import AdminLayout from "../adminLayout/page";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ===== Types
type UserSummary = { total: number; deltaPctMoM: number }
type UsersWeeklyPoint = { week: string; new: number }
type RecentUserRow = { id: string; name: string; email: string; role: string; joinDate: string }

type MangaSummary = {
  total: number
  deltaPctMoM: number
  published: number
  byStatus: Record<string, number>
}
type MangaGrowthPoint = { month: string; stories: number }
type TopStory = { id: string; title: string; views: number; author: string; status: string }

type ReportSummary = { open: number; new7d: number } // bạn đã có ở phần trước

// ===== Dữ liệu tạm giữ cứng (đọc/tuần) vì chưa có ReadingHistory
const readsPerWeekData = [
  { week: "Week 1", reads: 12500 },
  { week: "Week 2", reads: 15200 },
  { week: "Week 3", reads: 18900 },
  { week: "Week 4", reads: 21300 },
];

export default function AdminDashboard() {
  const API = process.env.NEXT_PUBLIC_API_URL;

  // ===== User states (đã có từ trước)
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [weeklyNew, setWeeklyNew] = useState<UsersWeeklyPoint[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUserRow[]>([]);

  // ===== Report state (đã làm trước)
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null);

  // ===== MANGA states (MỚI)
  const [mangaSummary, setMangaSummary] = useState<MangaSummary | null>(null);
  const [mangaGrowth, setMangaGrowth] = useState<MangaGrowthPoint[]>([]);
  const [topStories, setTopStories] = useState<TopStory[]>([]);

  const [loading, setLoading] = useState({
    summary: true,
    weekly: true,
    recent: true,
    report: true,
    mangaSummary: true,
    mangaGrowth: true,
    topStories: true,
  });

  const [error, setError] = useState<{
    summary?: string
    weekly?: string
    recent?: string
    report?: string
    mangaSummary?: string
    mangaGrowth?: string
    topStories?: string
  }>({});

  useEffect(() => {
    let mounted = true;

    // ====== Users
    const fetchSummary = async () => {
      try {
        const res = await axios.get<UserSummary>(`${API}/api/user/admin/summary`, { withCredentials: true });
        if (mounted) setSummary(res.data);
      } catch (e: any) {
        if (mounted) setError(s => ({ ...s, summary: e?.message || "Error" }));
      } finally {
        if (mounted) setLoading(s => ({ ...s, summary: false }));
      }
    };

    const fetchWeekly = async () => {
      try {
        const res = await axios.get<UsersWeeklyPoint[]>(`${API}/api/user/admin/charts/weekly-new?weeks=4`, { withCredentials: true });
        if (mounted) setWeeklyNew(res.data || []);
      } catch (e: any) {
        if (mounted) setError(s => ({ ...s, weekly: e?.message || "Error" }));
      } finally {
        if (mounted) setLoading(s => ({ ...s, weekly: false }));
      }
    };

    const fetchRecent = async () => {
      try {
        const res = await axios.get<RecentUserRow[]>(`${API}/api/user/admin/recent?limit=5`, { withCredentials: true });
        if (mounted) setRecentUsers(res.data || []);
      } catch (e: any) {
        if (mounted) setError(s => ({ ...s, recent: e?.message || "Error" }));
      } finally {
        if (mounted) setLoading(s => ({ ...s, recent: false }));
      }
    };

    // ====== Reports (đã có)
    const fetchReportSummary = async () => {
      try {
        const res = await axios.get<ReportSummary>(`${API}/api/reports/admin/summary`, { withCredentials: true });
        if (mounted) setReportSummary(res.data);
      } catch (e: any) {
        if (mounted) setError(s => ({ ...s, report: e?.message || "Error" }));
      } finally {
        if (mounted) setLoading(s => ({ ...s, report: false }));
      }
    };

    // ====== MANGA – 3 API mới
    const fetchMangaSummary = async () => {
      try {
        const res = await axios.get<MangaSummary>(`${API}/api/manga/admin/summary`, { withCredentials: true });
        if (mounted) setMangaSummary(res.data);
      } catch (e: any) {
        if (mounted) setError(s => ({ ...s, mangaSummary: e?.message || "Error" }));
      } finally {
        if (mounted) setLoading(s => ({ ...s, mangaSummary: false }));
      }
    };

    const fetchMangaGrowth = async () => {
      try {
        const res = await axios.get<MangaGrowthPoint[]>(`${API}/api/manga/admin/charts/monthly-growth?months=6`, { withCredentials: true });
        if (mounted) setMangaGrowth(res.data || []);
      } catch (e: any) {
        if (mounted) setError(s => ({ ...s, mangaGrowth: e?.message || "Error" }));
      } finally {
        if (mounted) setLoading(s => ({ ...s, mangaGrowth: false }));
      }
    };

    const fetchTopStories = async () => {
      try {
        const res = await axios.get<TopStory[]>(`${API}/api/manga/admin/top?limit=5&by=views`, { withCredentials: true });
        if (mounted) setTopStories(res.data || []);
      } catch (e: any) {
        if (mounted) setError(s => ({ ...s, topStories: e?.message || "Error" }));
      } finally {
        if (mounted) setLoading(s => ({ ...s, topStories: false }));
      }
    };

    // gọi tất cả
    fetchSummary();
    fetchWeekly();
    fetchRecent();
    fetchReportSummary();

    fetchMangaSummary();
    fetchMangaGrowth();
    fetchTopStories();

    return () => { mounted = false; };
  }, [API]);

  // ====== user activity (returning = 0 tạm thời)
  const userActivityData = useMemo(
    () => weeklyNew.map(p => ({ week: p.week, new: p.new, returning: 0 })),
    [weeklyNew]
  );

  // ====== derive trên UI
  const totalUsers = loading.summary ? "…" : (summary?.total ?? 0).toLocaleString();
  const deltaUsers = loading.summary ? "…" :
    `${(summary?.deltaPctMoM ?? 0) >= 0 ? "+" : ""}${(summary?.deltaPctMoM ?? 0).toFixed(2)}%`;

  const storiesTotal = loading.mangaSummary ? "…" : (mangaSummary?.total ?? 0).toLocaleString();
  const storiesDelta = loading.mangaSummary ? "…" :
    `${(mangaSummary?.deltaPctMoM ?? 0) >= 0 ? "+" : ""}${(mangaSummary?.deltaPctMoM ?? 0).toFixed(2)}%`;

  const openReports = loading.report ? "…" : (reportSummary?.open ?? 0).toString();
  const newReports7d = loading.report ? "…" : (reportSummary?.new7d ?? 0).toString();

  return (
    <AdminLayout>
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
        <p className="text-sm text-gray-500 mb-6">Admin / Dashboard</p>

        {/* Statistic Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng số Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                <span className={`font-semibold ${!loading.summary && (summary?.deltaPctMoM ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {deltaUsers}
                </span>{" "}
                từ tháng trước
              </p>
              {!loading.summary && error.summary && (
                <p className="text-xs text-red-600 mt-1">Lỗi: {error.summary}</p>
              )}
            </CardContent>
          </Card>

          {/* Stories (MANGA từ BE) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Số lượng Stories</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{storiesTotal}</div>
              <p className="text-xs text-muted-foreground">
                <span className={`font-semibold ${!loading.mangaSummary && (mangaSummary?.deltaPctMoM ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {storiesDelta}
                </span>{" "}
                từ tháng trước
              </p>
              {!loading.mangaSummary && error.mangaSummary && (
                <p className="text-xs text-red-600 mt-1">Lỗi: {error.mangaSummary}</p>
              )}
            </CardContent>
          </Card>

          {/* Reports */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Báo cáo cần xử lý</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{openReports}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-red-600 font-semibold">+{newReports7d}</span> báo cáo mới (7 ngày)
              </p>
              {!loading.report && error.report && (
                <p className="text-xs text-red-600 mt-1">Lỗi: {error.report}</p>
              )}
            </CardContent>
          </Card>

          {/* Notifications (giữ cứng) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Thông báo hoạt động</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
              <p className="text-xs text-muted-foreground">Đang được gửi đến users</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {/* Users Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle>New vs Returning Users</CardTitle>
              <CardDescription>Weekly user activity</CardDescription>
            </CardHeader>
            <CardContent className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userActivityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="new" stroke="#3b82f6" strokeWidth={2} name="New Users" />
                  <Line type="monotone" dataKey="returning" stroke="#10b981" strokeWidth={2} name="Returning Users" />
                </LineChart>
              </ResponsiveContainer>
              {!loading.weekly && error.weekly && (
                <p className="text-xs text-red-600 mt-2">Lỗi: {error.weekly}</p>
              )}
            </CardContent>
          </Card>

          {/* Reads Bar Chart (giữ cứng) */}
          <Card>
            <CardHeader>
              <CardTitle>Total Reads per Week</CardTitle>
              <CardDescription>Weekly reading activity</CardDescription>
            </CardHeader>
            <CardContent className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={readsPerWeekData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="reads" fill="#8b5cf6" name="Total Reads" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Stories Growth (MANGA từ BE) */}
          <Card>
            <CardHeader>
              <CardTitle>Stories Growth</CardTitle>
              <CardDescription>Monthly story additions</CardDescription>
            </CardHeader>
            <CardContent className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mangaGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="stories" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
              {!loading.mangaGrowth && error.mangaGrowth && (
                <p className="text-xs text-red-600 mt-2">Lỗi: {error.mangaGrowth}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Users mới đăng ký</CardTitle>
                <CardDescription>5 người dùng gần nhất</CardDescription>
              </div>
              <Link href="/admin/user">
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  View all
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Vai trò</TableHead>
                    <TableHead>Ngày tham gia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* loading / error */}
                  {/* ... giữ nguyên như bạn đang làm */}
                  {(recentUsers ?? []).map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-sm text-gray-600">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role?.toLowerCase() === "author" ? "default" : "secondary"}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{user.joinDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Top Stories (MANGA từ BE) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Top Stories được đọc nhiều</CardTitle>
                <CardDescription>5 truyện hàng đầu</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View all
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên truyện</TableHead>
                    <TableHead>Tác giả</TableHead>
                    <TableHead>Lượt xem</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading.topStories && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-sm text-gray-500">Loading...</TableCell>
                    </TableRow>
                  )}
                  {!loading.topStories && error.topStories && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-sm text-red-600">Lỗi: {error.topStories}</TableCell>
                    </TableRow>
                  )}
                  {!loading.topStories && !error.topStories && topStories.map((story) => (
                    <TableRow key={story.id}>
                      <TableCell className="font-medium">{story.title}</TableCell>
                      <TableCell className="text-sm text-gray-600">{story.author}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                          {story.views.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {story.status === "ongoing" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {story.status}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {story.status}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
