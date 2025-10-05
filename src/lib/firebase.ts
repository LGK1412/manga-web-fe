// lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyB7QNUnPuyFPYhk0etHE95qUxDHObBPfiQ",
  authDomain: "push-noti-test-43e56.firebaseapp.com",
  projectId: "push-noti-test-43e56",
  storageBucket: "push-noti-test-43e56.firebasestorage.app",
  messagingSenderId: "1067744618509",
  appId: "1:1067744618509:web:ef24dbf6689c0431bb4d44",
  measurementId: "G-JZW2TVRJ8L"
};

export const app = initializeApp(firebaseConfig);

// chỉ chạy được ở browser, không phải server
export const messaging = typeof window !== "undefined" ? getMessaging(app) : null;
