"use client";

import { useEffect } from "react";

export default function SWRegister() {
    useEffect(() => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/firebase-messaging-sw.js")
                .then(reg => console.log("✅ Service Worker registered"))
                .catch(err => console.error("❌ SW registration failed", err));
        }
    }, []);

    return null;
}
