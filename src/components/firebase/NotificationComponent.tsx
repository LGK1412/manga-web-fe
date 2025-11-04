"use client";
import { useEffect, useRef, useState } from "react";
import { onMessage } from "firebase/messaging";
import { messaging } from "../../lib/firebase";
import { Bell } from "lucide-react";
import { Button } from "../ui/button";
import Link from "next/link";
import Cookies from "js-cookie";
import axios from "axios";

interface Notification {
    _id: string;
    title: string;
    body: string;
    is_read: boolean;
    createdAt: string;
}

export default function NotificationComponent() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [open, setOpen] = useState(false);
    const [hasNew, setHasNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [user, setUser] = useState<any | undefined>();

    // 🔹 Lấy user từ cookie
    useEffect(() => {
        const raw = Cookies.get("user_normal_info");
        if (raw) {
            try {
                const decoded = decodeURIComponent(raw);
                const parsed = JSON.parse(decoded);
                setUser(parsed);
            } catch {
                console.error("Invalid cookie data");
            }
        }
    }, []);

    // 🔹 Fetch danh sách thông báo
    const fetchNotifications = async (id: string) => {
        try {
            setLoading(true);
            const res = await axios.get<Notification[]>(
                `${process.env.NEXT_PUBLIC_API_URL}/api/user/get-all-noti-for-user/${id}`
            );

            // 🔸 Chỉ giữ lại thông báo chưa đọc
            const unread = res.data
                .filter((n) => !n.is_read)
                .sort(
                    (a, b) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime()
                );
            setNotifications(unread);
            setHasNew(unread.length > 0);

            // if (unread.length > 0) console.log("Có thông báo chưa đọc!");
        } catch (err: any) {
            console.error(err);
            setError(err?.response?.data?.message || "Lỗi khi tải thông báo");
        } finally {
            setLoading(false);
        }
    };

    // 🔹 Gọi fetch khi user có id (render lần đầu)
    useEffect(() => {
        if (user?.user_id) {
            fetchNotifications(user.user_id);
        }
    }, [user]);

    // 🔹 Firebase foreground message
    useEffect(() => {
        if (!messaging) return;

        const unsubscribe = onMessage(messaging, (payload) => {
            // console.log("Foreground message received: ", payload);
            setHasNew(true);
            if (user?.user_id) fetchNotifications(user.user_id);
        });

        return () => unsubscribe();
    }, [user]);

    // 🔹 Khi user focus lại web → refresh noti
    useEffect(() => {
        const handleFocus = () => {
            // console.log("User focus lại web");
            if (user?.user_id) fetchNotifications(user.user_id);
        };
        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, [user]);

    // 🔹 Click outside để đóng dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        };

        if (open) document.addEventListener("mousedown", handleClickOutside);
        else document.removeEventListener("mousedown", handleClickOutside);

        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    const toggleDropdown = () => {
        setOpen((prev) => !prev);
    };

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            <Button
                variant="ghost"
                size="icon"
                onClick={toggleDropdown}
                className="relative flex items-center justify-center w-10 h-10 focus:outline-none"
            >
                <Bell className="h-5 w-5" />
                {hasNew && (
                    <span className="absolute top-1 right-1 rounded-full block w-2.5 h-2.5 bg-red-500"></span>
                )}
            </Button>

            {open && (
                <div className="absolute right-0 mt-2 w-72 rounded-md border border-gray-200 bg-white shadow-lg z-50">
                    <h4 className="flex justify-between items-center px-4 py-2 text-sm font-semibold text-gray-800 border-b border-gray-300">
                        Thông báo chưa đọc
                        <Link
                            href={`/notification/${user?.user_id}`}
                            className="text-blue-500 hover:text-blue-600 transition-colors duration-200"
                        >
                            Xem tất cả
                        </Link>
                    </h4>

                    {loading ? (
                        <p className="px-3 py-2 text-xs text-gray-500">
                            Đang tải...
                        </p>
                    ) : error ? (
                        <p className="px-3 py-2 text-xs text-red-500">
                            {error}
                        </p>
                    ) : notifications.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-gray-500">
                            Không có thông báo chưa đọc
                        </p>
                    ) : (
                        <ul className="divide-y divide-gray-100 custom-scroll max-h-80 overflow-y-auto">
                            {notifications.map((msg) => (
                                <li
                                    key={msg._id}
                                    className="px-3 py-2 bg-gray-50 font-medium"
                                >
                                    <strong className="block text-sm text-black">
                                        {msg.title}
                                    </strong>
                                    <p className="text-xs text-gray-600">
                                        {msg.body}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
