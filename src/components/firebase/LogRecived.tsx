"use client";

import { useEffect } from "react";
import { onMessage } from "firebase/messaging";
import { messaging } from "../../lib/firebase";

export default function NotificationListener() {
    useEffect(() => {
        if (!messaging) return;

        const unsubscribe = onMessage(messaging, (payload) => {
            console.log("Foreground message received: ", payload);
        });

        return () => unsubscribe();
    }, []);

    return null;
}
