"use client";

import { useEffect, useRef, useState } from "react";
import { onMessage } from "firebase/messaging";
import { messaging } from "../../lib/firebase";
import { Bell } from "lucide-react";
import { Button } from "../ui/button";
import Link from "next/link";
import Cookies from "js-cookie";

export default function NotificationComponent() {
    const [messages, setMessages] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const [hasNew, setHasNew] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [user, setUser] = useState<any | undefined>()

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
    }, [])

    useEffect(() => {
        if (!messaging) return;

        const unsubscribe = onMessage(messaging, (payload) => {
            console.log("Foreground message received: ", payload);
            setMessages((prev) => [payload.notification, ...prev]);
            setHasNew(true);
        });

        return () => unsubscribe();
    }, []);

    // 👇 handle click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        };

        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open]);

    const toggleDropdown = () => {
        setOpen((prev) => !prev);
        setHasNew(false);
    };

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            {/* Nút chuông */}
            <Button
                variant="ghost" size="icon"
                onClick={toggleDropdown}
                className="relative flex items-center justify-center w-10 h-10 focus:outline-none"
            >
                <Bell className="h-5 w-5" />
                {hasNew && (
                    <span className="absolute top-1 right-1 rounded-full block w-2.5 h-2.5 bg-red-500"></span>
                )}
            </Button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 mt-2 w-72 rounded-md border border-gray-200 bg-white shadow-lg">
                    <h4 className="flex justify-between items-center px-4 py-2 text-sm font-semibold text-gray-800 border-b border-gray-300">
                        Thông báo
                        <Link
                            href={`/notification/${user.user_id}`}
                            className="text-blue-500 hover:text-blue-600 transition-colors duration-200"
                        >
                            Xem thêm
                        </Link>
                    </h4>

                    {messages.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-gray-500">Chưa có thông báo nào</p>
                    ) : (
                        <ul className="divide-y divide-gray-100 custom-scroll">
                            {messages.map((msg, idx) => (
                                <li key={idx} className="px-3 py-2">
                                    <strong className="block text-sm text-black">{msg?.title}</strong>
                                    <p className="text-xs text-gray-600">{msg?.body}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
