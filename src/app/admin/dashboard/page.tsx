"use client";

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

const recentUsers = [
  {
    id: 1,
    name: "Nguyễn Văn A",
    email: "nguyenvana@email.com",
    joinDate: "2024-01-15",
    role: "User",
  },
  {
    id: 2,
    name: "Trần Thị B",
    email: "tranthib@email.com",
    joinDate: "2024-01-14",
    role: "Author",
  },
  {
    id: 3,
    name: "Lê Văn C",
    email: "levanc@email.com",
    joinDate: "2024-01-13",
    role: "User",
  },
  {
    id: 4,
    name: "Phạm Thị D",
    email: "phamthid@email.com",
    joinDate: "2024-01-12",
    role: "User",
  },
  {
    id: 5,
    name: "Hoàng Văn E",
    email: "hoangvane@email.com",
    joinDate: "2024-01-11",
    role: "Author",
  },
];

const topStories = [
  {
    id: 1,
    title: "One Piece",
    views: 15420,
    author: "Oda Eiichiro",
    status: "Ongoing",
  },
  {
    id: 2,
    title: "Naruto",
    views: 12350,
    author: "Kishimoto Masashi",
    status: "Completed",
  },
  {
    id: 3,
    title: "Attack on Titan",
    views: 11200,
    author: "Hajime Isayama",
    status: "Completed",
  },
  {
    id: 4,
    title: "Demon Slayer",
    views: 9800,
    author: "Koyoharu Gotouge",
    status: "Completed",
  },
  {
    id: 5,
    title: "My Hero Academia",
    views: 8900,
    author: "Kohei Horikoshi",
    status: "Ongoing",
  },
];

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Dashboard Overview
        </h1>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Tổng số Users
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12,543</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+12%</span> từ tháng trước
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Số lượng Stories
              </CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2,847</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+8%</span> từ tháng trước
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Báo cáo cần xử lý
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">23</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-red-600">+3</span> báo cáo mới
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Thông báo hoạt động
              </CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
              <p className="text-xs text-muted-foreground">
                Đang được gửi đến users
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Users mới đăng ký</CardTitle>
                <CardDescription>5 người dùng gần nhất</CardDescription>
              </div>
              <Link href="/admin/users">
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
                  {recentUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.role === "Author" ? "default" : "secondary"
                          }
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {user.joinDate}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Top Stories */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Top Stories được đọc nhiều</CardTitle>
                <CardDescription>5 truyện hàng đầu tuần này</CardDescription>
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
                  {topStories.map((story) => (
                    <TableRow key={story.id}>
                      <TableCell className="font-medium">
                        {story.title}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {story.author}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                          {story.views.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {story.status === "Ongoing" ? (
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
