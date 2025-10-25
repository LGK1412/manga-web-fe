// public/firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyA0b1vU8X1y3Yk3F7KXGZJH2gk8b8b8b8",
  authDomain: "push-noti-test-43e56.firebaseapp.com",
  projectId: "push-noti-test-43e56",
  storageBucket: "push-noti-test-43e56.firebasestorage.app",
  messagingSenderId: "1067744618509",
  appId: "1:1067744618509:web:ef24dbf6689c0431bb4d44",
  measurementId: "G-JZW2TVRJ8L"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("Received background message: ", payload);

  const notificationTitle = payload.notification?.title || "Default Title";
  const notificationOptions = {
    body: payload.notification?.body || "No body",
    icon: "/next.svg",   // thêm icon
    badge: "/next.svg", // optional
    silent: true, // 👈 tắt sound
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
