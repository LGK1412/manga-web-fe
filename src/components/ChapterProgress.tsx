"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import Cookies from "js-cookie";

export default function ChapterProgress() {
  const { id } = useParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Lấy user_id từ cookie
  useEffect(() => {
    const raw = Cookies.get("user_normal_info");

    if (raw) {
      try {
        const decoded = decodeURIComponent(raw);
        const parsed = JSON.parse(decoded);
        setUserId(parsed.user_id);
      } catch (e) {
        console.error("Invalid cookie data");
      }
    }
  }, []);

  // ✅ Theo dõi cuộn theo vùng nội dung chương (NetTruyen-style)
  useEffect(() => {
    const handleScroll = () => {
      const contentEl = document.querySelector(
        "#chapter-content"
      ) as HTMLElement | null;
      if (!contentEl) return;

      const contentTop = contentEl.offsetTop;
      const contentHeight = contentEl.scrollHeight;
      const windowHeight = window.innerHeight;
      const scrollY = window.scrollY;

      // Tính phần đã đọc
      const scrolled = scrollY - contentTop;
      const total = contentHeight - windowHeight;
      const rawPercent = (scrolled / total) * 100;

      const percent = Math.max(0, Math.min(100, rawPercent));
      setProgress(Math.round(percent));
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // chạy 1 lần đầu
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ✅ Lưu tiến trình khi rời trang
  useEffect(() => {
    const handleUnload = () => {
      if (userId && id) {
        axios
          .post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/Chapter/progress/${userId}/${id}/${progress}`
          )
          .catch(console.error);
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      handleUnload();
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [userId, id, progress]);

  // ✅ Thanh bar hiển thị (ngang top)
  return (
    <div className="fixed left-0 top-0 w-full h-[3px] bg-gray-200 z-50">
      <div
        className="h-[3px] bg-blue-500 transition-all duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
      <span className="absolute right-4 top-1 text-[11px] font-medium">
        {progress}%
      </span>
    </div>
  );
}
