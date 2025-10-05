"use client";

import { useState } from "react";
import { messaging } from "../../lib/firebase";
import { getToken } from "firebase/messaging";

export default function FCMTokenButton() {
  const [token, setToken] = useState<string | null>(null);

  async function requestPermission() {
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
      const currentToken = await getToken(messaging, {
        vapidKey: "BPqOfDkQEjrwl5_6k2LzKttoDnKq5kgPLHEbnB4vZNRzj_ZglnZl8Km5p3c_G0xiOMd1JdIkpmNiKJcjQiAtpKo",
        serviceWorkerRegistration: await navigator.serviceWorker.ready,
      });

      if (currentToken) {
        console.log("FCM Token:", currentToken);
        setToken(currentToken);
      } else {
        console.warn("No registration token available.");
      }
    } catch (err) {
      console.error("An error occurred while retrieving token:", err);
    }
  }

  return (
    <div>
      <button onClick={requestPermission}>Get FCM Token</button>
      {token && (
        <p>
          <strong>Token:</strong> {token}
        </p>
      )}
    </div>
  );
}

