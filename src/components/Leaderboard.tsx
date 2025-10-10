"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function Leaderboard({ refreshKey }: { refreshKey: number }) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/catch-game/leaderboard`,
          { withCredentials: true }
        );
        setLeaderboard(res.data.leaderboard);
      } catch (err) {
        console.error("Lỗi khi lấy bảng xếp hạng:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, [refreshKey]);

  if (loading)
    return (
      <p className="text-center mt-6 text-slate-400 animate-pulse">
        Đang tải bảng xếp hạng...
      </p>
    );

  if (leaderboard.length === 0)
    return (
      <div className="text-center mt-6 bg-slate-800/70 p-4 rounded-xl border border-slate-600 shadow-md">
        <p className="text-slate-400 mb-2">Chưa có dữ liệu bảng xếp hạng.</p>
      </div>
    );

  return (
    <div className="max-w-[800px] mx-auto mt-10 bg-slate-900/70 backdrop-blur-md rounded-2xl border border-slate-600 shadow-lg text-white p-5">
      <h2 className="text-xl font-bold mb-4 text-center bg-gradient-to-r from-yellow-400 to-orange-300 bg-clip-text text-transparent">
        Bảng Xếp Hạng
      </h2>

      <ul className="divide-y divide-slate-700">
        {leaderboard.map((item, idx) => (
          <li
            key={idx}
            className="flex justify-between items-center py-3 px-2 text-sm hover:bg-slate-800/50 transition-all rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <span className="font-bold text-yellow-400 w-6 text-center">
                {idx + 1}
              </span>
              <span className="text-slate-300 font-medium">
                {item.username}
              </span>
            </div>
            <span className="font-semibold text-blue-400">
              {item.bestScore} điểm
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
