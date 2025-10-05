"use client";

import { useEffect, useState } from "react";
import { messaging } from "../../lib/firebase";
import { getToken } from "firebase/messaging";
import axios from "axios";

export default function FCMToken() {
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        async function fetchToken() {
            try {
                if (!messaging || !("Notification" in window)) {
                    console.warn("FCM not supported in this environment.");
                    return;
                }

                // check quyền trước
                let permission = Notification.permission;
                if (permission === "default") {
                    permission = await Notification.requestPermission();
                }

                if (permission !== "granted") {
                    console.warn("Notification permission not granted:", permission);
                    return;
                }

                // lấy token
                const reg = await navigator.serviceWorker.ready;
                const currentToken = await getToken(messaging, {
                    vapidKey: "BPqOfDkQEjrwl5_6k2LzKttoDnKq5kgPLHEbnB4vZNRzj_ZglnZl8Km5p3c_G0xiOMd1JdIkpmNiKJcjQiAtpKo",
                    serviceWorkerRegistration: reg,
                });

                if (currentToken) {
                    console.log("FCM Token:", currentToken);

                    try {
                        await axios.patch(
                            `${process.env.NEXT_PUBLIC_API_URL}/api/user/add-device-id`,
                            { device_id: currentToken },
                            { withCredentials: true }
                        );

                    } catch (err) {
                        console.error("❌ Failed to send device token:", err);
                    }
                }
            } catch (err) {
                console.error("An error occurred while retrieving token:", err);
            }
        }

        fetchToken();
    }, []); // [] → chạy 1 lần khi component mount

    return null; // không cần nút nữa
}
