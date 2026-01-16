"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ChevronDown, ChevronUp, ArrowRight, Info } from "lucide-react";

export function GamePointBadge({ refreshKey }: { refreshKey: number }) {
  const [gamePoint, setGamePoint] = useState(0);
  const [transferAmount, setTransferAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  const fetchGamePoint = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/point`,
        { withCredentials: true }
      );
      setGamePoint(res.data.game_point ?? 0);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchGamePoint();
  }, [fetchGamePoint, refreshKey]);

  const handleTransfer = async () => {
    const value = Number(transferAmount);
    if (!value || value % 1000 !== 0) {
      alert("Points must be a multiple of 1000");
      return;
    }

    if (value > gamePoint) {
      alert("Insufficient game points to transfer");
      return;
    }

    try {
      setLoading(true);
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/catch-game/transfer-point`,
        { transferGamePoint: value },
        { withCredentials: true }
      );
      setTransferAmount("");
      fetchGamePoint();
      alert("Points transferred successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to transfer points!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800/80 border border-slate-600 px-4 py-3 rounded-lg shadow-md w-64 flex flex-col gap-2">
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setShowTransfer(!showTransfer)}
      >
        <span className="text-slate-300 font-semibold truncate">
          Current points:
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-yellow-400 font-bold">{gamePoint}</span>
          {showTransfer ? (
            <ChevronUp className="w-4 h-4 text-slate-300" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-300" />
          )}
        </div>
      </div>

      {/* Input + Button */}
      {showTransfer && (
        <div className="flex gap-2 mt-2 items-center group">
          {/* Info icon + tooltip */}
          <div className="relative flex items-center">
            <Info className="w-4 h-4 text-slate-400 cursor-pointer" />
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-700 text-slate-200 text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Transfer rate: 1 game_point = 1 point. Only points divisible by 1000 can be transferred.
            </div>
          </div>

          {/* Input */}
          <input
            type="number"
            placeholder="Points"
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            className="w-40 px-2 py-1 rounded border border-slate-600 bg-slate-700 text-slate-200"
          />

          {/* Transfer button */}
          <button
            onClick={handleTransfer}
            disabled={loading}
            className="w-10 h-8 flex items-center justify-center bg-yellow-500 hover:bg-yellow-400 text-black rounded disabled:opacity-50 transition-all relative group"
          >
            {loading ? (
              "..."
            ) : (
              <ArrowRight className="w-4 h-4 text-black group-hover:text-black transition-colors" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
