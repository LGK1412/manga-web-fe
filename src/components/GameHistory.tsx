"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function GameHistory({ refreshKey }: { refreshKey: number }) {
  const [history, setHistory] = useState<any[]>([]);
  const [bestScore, setBestScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/catch-game/history`,
          { withCredentials: true }
        );
        setHistory(res.data.history);
        setBestScore(res.data.bestScore);
      } catch (err) {
        console.error("Error fetching history:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [refreshKey]);

  if (loading)
    return (
      <p className="text-center mt-6 text-slate-400 animate-pulse">
        Loading history...
      </p>
    );

  if (history.length === 0)
    return (
      <div className="text-center mt-6 bg-slate-800/70 p-4 rounded-xl border border-slate-600 shadow-md">
        <p className="text-slate-400 mb-2">No game history yet.</p>
      </div>
    );
  return (
    <div className="max-w-[800px] h-[550px] mx-auto mt-10 bg-slate-900/70 backdrop-blur-md rounded-2xl border border-slate-600 shadow-lg text-white p-5 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-teal-300 bg-clip-text text-transparent">
          Game History
        </h2>
      </div>

      <div className="bg-slate-800/80 border border-slate-600 p-4 rounded-xl mb-5 text-center">
        <p className="text-slate-300 mb-1 text-sm">🏆 Best Score</p>
        <p className="text-4xl font-extrabold text-yellow-400 drop-shadow-lg">
          {bestScore}
        </p>
      </div>

      {/* Danh sách cuộn */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scroll">
        <ul className="divide-y divide-slate-700">
          {history.map((item, idx) => (
            <li
              key={idx}
              className="py-3 px-2 flex justify-between items-center text-sm hover:bg-slate-800/50 transition-all rounded-lg"
            >
              <span className="text-slate-300">
                {new Date(item.createdAt).toLocaleString("vi-VN", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
              <span className="font-semibold text-blue-400">
                {item.score} points
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
