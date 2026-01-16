"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { Trash2, Check, CheckSquare, Bookmark, BookmarkPlus } from "lucide-react";
import { useTheme } from "next-themes";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Cookies from "js-cookie";
import { useToast } from "@/hooks/use-toast";

interface Notification {
    _id: string;
    sender_id: string;
    receiver_id: string;
    title: string;
    body: string;
    is_read: boolean;
    is_save: boolean;
    createdAt: string;
    updatedAt: string;
}

export default function NotificationPage() {
    const params = useParams();
    const id = params.id;
    const { theme } = useTheme();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any | undefined>();

    const { toast } = useToast()

    const fetchNotifications = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const res = await axios.get<Notification[]>(
                `${process.env.NEXT_PUBLIC_API_URL}/api/notification/get-all-noti-for-user/${id}`,
                { withCredentials: true }
            );

            // 🔽 Sắp xếp thông báo mới nhất lên đầu
            const sorted = res.data.sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            setNotifications(sorted);
        } catch (err: any) {
            console.error(err);
            setError(err?.response?.data?.message || "Lỗi khi tải thông báo");
            toast({
                title: "Lỗi",
                description: err?.response?.data?.message || "Lỗi khi tải thông báo",
                variant: "destructive",
            })
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const raw = Cookies.get("user_normal_info");
        if (raw) {
            try {
                const decoded = decodeURIComponent(raw);
                const parsed = JSON.parse(decoded);
                setUser(parsed);
            } catch (e) {
                console.error("Invalid cookie data");
            }
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [id]);

    const markAsRead = async (notiId: string) => {
        try {
            await axios.patch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/notification/mark-noti-as-read/${notiId}`,
                {},
                { withCredentials: true }
            );

            setNotifications(prev =>
                prev.map(n => (n._id === notiId ? { ...n, is_read: true } : n))
            );
        } catch (err) {
            console.error(err);
        }
    };


    const deleteNotification = async (notiId: string) => {
        try {
            await axios.delete(
                `${process.env.NEXT_PUBLIC_API_URL}/api/notification/delete-noti/${notiId}`,
                { withCredentials: true }
            );
            setNotifications(prev => prev.filter(n => n._id !== notiId));
        } catch (err) {
            console.error(err);
        }
    };

    const markAllAsRead = async () => {
        try {
            await axios.patch(`${process.env.NEXT_PUBLIC_API_URL}/api/notification/mark-all-noti-as-read/`, {}, { withCredentials: true });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (err) {
            console.error(err);
        }
    };

    const toggleSaveNotification = async (notiId: string) => {
        try {
            const noti = notifications.find(n => n._id === notiId);
            if (!noti) return;

            await axios.patch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/notification/save-noti/${notiId}`,
                {},
                { withCredentials: true }
            );

            // Cập nhật state local: toggle is_save và set is_read = true
            setNotifications(prev =>
                prev.map(n =>
                    n._id === notiId
                        ? { ...n, is_save: !n.is_save, is_read: true }
                        : n
                )
            );
        } catch (err) {
            console.error(err);
        }
    };


    if (loading) return <p className="p-4 text-gray-500">Đang tải thông báo...</p>;
    if (error) return <p className="p-4 text-red-500">{error}</p>;

    return (
        <>
            <Navbar />
            <div
                className={`${theme === "dark" ? "bg-[#1F1F1F]" : "bg-white"} rounded-2xl border border-slate-200 shadow-sm p-5 max-w-5xl mx-auto mb-20 space-y-4 mt-20`}
            >
                {/* Header */}
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
                        Thông báo của người dùng {user?.username}
                    </h1>

                    <button
                        onClick={markAllAsRead}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                    >
                        <CheckSquare className="w-4 h-4" /> Đánh dấu tất cả là đã đọc
                    </button>
                </div>

                {/* Notification list */}
                <div className="max-h-[600px] overflow-y-auto space-y-3 custom-scroll">
                    {notifications.length === 0 && (
                        <p className="text-sm text-gray-500">Chưa có thông báo nào.</p>
                    )}
                    {notifications.map(noti => (
                        <div
                            key={noti._id}
                            className={`p-3 border rounded-xl flex justify-between items-start transition-all duration-200
              ${theme === "dark"
                                    ? "bg-[#181818] border-[#2F2F2F] shadow-[0_4px_5px_rgba(0,0,0,0.6)]"
                                    : "bg-white border-gray-300 shadow-[0_4px_10px_rgba(0,0,0,0.1)]"
                                } hover:border-blue-400 hover:shadow-[0_6px_5px_rgba(59,130,246,0.3)]`}
                        >
                            <div className="flex-1">
                                <h2 className={`font-semibold ${noti.is_read ? "text-gray-400" : ""}`}>{noti.title}</h2>
                                <p className={`text-sm leading-relaxed ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                                    {noti.body}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">{new Date(noti.createdAt).toLocaleString()}</p>
                            </div>

                            <div className="flex flex-col gap-2 ml-4">
                                {!noti.is_read && (
                                    <button
                                        onClick={() => markAsRead(noti._id)}
                                        className="flex items-center gap-1 text-green-600 text-sm hover:underline"
                                    >
                                        <Check className="w-4 h-4" /> Đã đọc
                                    </button>
                                )}
                                <button
                                    onClick={() => toggleSaveNotification(noti._id)}
                                    className="flex items-center gap-1 text-yellow-600 text-sm hover:underline"
                                >
                                    {noti.is_save ? (
                                        <>
                                            <Bookmark className="w-4 h-4" /> Đã lưu
                                        </>
                                    ) : (
                                        <>
                                            <BookmarkPlus className="w-4 h-4" /> Lưu
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => deleteNotification(noti._id)}
                                    className="flex items-center gap-1 text-red-600 text-sm hover:underline"
                                >
                                    <Trash2 className="w-4 h-4" /> Xóa
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <Footer />
        </>
    );
}
