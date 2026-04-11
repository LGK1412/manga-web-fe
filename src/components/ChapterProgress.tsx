"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { useParams } from "next/navigation";

export default function ChapterProgress() {
  const { id } = useParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0); 

  useLayoutEffect(() => {
    const raw = Cookies.get("user_normal_info");
    if (raw) {
      try {
        const decoded = decodeURIComponent(raw);
        const parsed = JSON.parse(decoded);
        setUserId(parsed.user_id);
      } catch (e) {}
    }
  }, []);

  // ✅ Theo dõi scroll + lắng nghe ảnh load xong
  useEffect(() => {
    const calcProgress = () => {
      const contentEl = document.querySelector(
        "#chapter-content"
      ) as HTMLElement | null;
      if (!contentEl) return;

      const contentTop = contentEl.getBoundingClientRect().top + window.scrollY;
      const contentHeight = contentEl.scrollHeight;
      const windowHeight = window.innerHeight;
      const scrollY = window.scrollY;

      const scrolled = scrollY + windowHeight - contentTop;
      const total = contentHeight;
      const rawPercent = (scrolled / total) * 100;

      const percent = Math.max(0, Math.min(100, rawPercent));
      const rounded = Math.round(percent);

      setProgress(rounded);
      progressRef.current = rounded; // ✅ Cập nhật ref đồng thời
    };

    // Lắng nghe từng ảnh load xong để recalculate
    const observeImages = () => {
      const contentEl = document.querySelector("#chapter-content");
      if (!contentEl) return;

      const images = contentEl.querySelectorAll("img");
      let loadedCount = 0;
      let totalCount = images.length;

      images.forEach((img) => {
        if (img.complete) {
          // Ảnh đã load sẵn
          loadedCount++;
        } else {
          // Ảnh chưa load - lắng nghe
          const handleLoad = () => {
            loadedCount++;
            calcProgress(); // Recalculate khi mỗi ảnh load xong
          };
          
          img.addEventListener("load", handleLoad, { once: true });
          img.addEventListener("error", handleLoad, { once: true });
        }
      });

      // Nếu tất cả ảnh đã load, recalculate ngay
      if (loadedCount === totalCount) {
        calcProgress();
      }
    };

    // ResizeObserver: ảnh load làm thay đổi chiều cao → tự recalculate
    let resizeObserver: ResizeObserver | null = null;
    const contentEl = document.querySelector("#chapter-content");
    if (contentEl) {
      resizeObserver = new ResizeObserver(calcProgress);
      resizeObserver.observe(contentEl);
    }

    // MutationObserver: detect khi ảnh mới được thêm vào DOM
    let mutationObserver: MutationObserver | null = null;
    if (contentEl) {
      mutationObserver = new MutationObserver(() => {
        observeImages();
        calcProgress();
      });
      mutationObserver.observe(contentEl, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["src"],
      });
    }

    window.addEventListener("scroll", calcProgress, { passive: true });
    calcProgress();
    observeImages();

    return () => {
      window.removeEventListener("scroll", calcProgress);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, []);

  // ✅ Lưu tiến trình khi rời trang — dùng ref để tránh stale closure
  useEffect(() => {
    const saveProgress = () => {
      if (userId && id) {
        axios
          .post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/Chapter/progress/${userId}/${id}/${progressRef.current}`
          )
          .catch(() => {});
      }
    };

    window.addEventListener("beforeunload", saveProgress);
    return () => {
      saveProgress();
      window.removeEventListener("beforeunload", saveProgress);
    };
  }, [userId, id]); // ✅ Không cần progress trong deps vì dùng ref

  useEffect(() => {
    if (id) {
      axios
        .patch(`${process.env.NEXT_PUBLIC_API_URL}/api/manga/view/${id}/increase`)
        .catch(() => {});
    }
  }, [id]);

  return (
    <div className="fixed left-0 top-0 w-full h-[3px] bg-gray-200 z-50">
      <div
        className="h-[3px] bg-blue-500 transition-all duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
      <span className="absolute right-4 top-1 text-[11px] text-gray-700 font-medium">
        {progress}%
      </span>
    </div>
  );
}