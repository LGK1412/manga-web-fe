"use client";

import { DAILY_REWARD_CONFIG } from "@/data/reward";
import axios from "axios";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useUserPoint } from "@/contexts/UserPointContext";

interface RewardConfigItem {
  day: number;
  points?: number;
  authorPoints?: number;
}

interface CheckinStatus {
  weekStart: string;
  checkins: boolean[];
  reward?: RewardConfigItem;
  canCheckin: boolean;
}

interface DailyCheckinPanelProps {
  role?: "user" | "author";
  open: boolean;
  onClose: () => void;
}

export default function DailyCheckinPanel({
  role = "user",
  open,
  onClose,
}: DailyCheckinPanelProps) {
  const [status, setStatus] = useState<CheckinStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const { point, authorPoint, setPointsDirectly } = useUserPoint();

  const rewards: RewardConfigItem[] = DAILY_REWARD_CONFIG[role];

  useEffect(() => {
    if (open) fetchStatus();
  }, [open]);

  async function fetchStatus() {
    try {
      const { data } = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/checkin/status`,
        { withCredentials: true }
      );
      setStatus(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCheckin() {
    if (!status?.canCheckin) return;
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/checkin/today`,
        { role },
        { withCredentials: true }
      );

      setStatus((prev) => ({
        ...prev!,
        checkins: data.checkins,
        claimedDays: data.claimedDays,
        reward: data.reward,
        canCheckin: false,
      }));

      if (data.reward) {
        if (role === "user") {
          setPointsDirectly(point + (data.reward.points ?? 0));
        } else if (role === "author") {
          setPointsDirectly(
            point + (data.reward.points ?? 0),
            authorPoint + (data.reward.authorPoints ?? 0)
          );
        }
      }
    } catch (err) {
      console.error("Lỗi khi điểm danh:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded hover:bg-gray-200"
        >
          <X className="h-5 w-5" />
        </button>

        {!status ? (
          <p>Đang tải...</p>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-4">🎁 Điểm danh 7 ngày</h2>
            <div className="grid grid-cols-7 gap-3">
              {rewards.map((r) => {
                const dayIndex = r.day;
                const checked = status.checkins[dayIndex - 1];

                let bgColor = "bg-gray-100 border-gray-300";
                let statusText = "";

                if (checked) {
                  bgColor = "bg-green-200 border-green-400";
                  statusText = "Đã nhận";
                }

                return (
                  <div
                    key={dayIndex}
                    className={`p-3 rounded-md text-center border flex flex-col items-center ${bgColor}`}
                  >
                    <div className="font-bold text-sm">Ngày {dayIndex}</div>
                    <div className="text-xs mt-1 text-gray-700">
                      {r.points ? `+${r.points} điểm` : `+${r.authorPoints} AP`}
                    </div>
                    {statusText && (
                      <div className="mt-2 text-xs font-semibold text-yellow-600">
                        {statusText}
                      </div>
                    )}
                    {status.reward &&
                      dayIndex === status.reward.day &&
                      !checked && (
                        <div className="mt-2 text-xs font-semibold text-yellow-600">
                          🎉 +
                          {status.reward.points ?? status.reward.authorPoints}{" "}
                          nhận!
                        </div>
                      )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleCheckin}
              disabled={loading || !status.canCheckin}
              className={`mt-5 w-full py-2 rounded font-semibold text-white ${
                status.canCheckin
                  ? "bg-blue-500 hover:bg-blue-600"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              {status.canCheckin ? "Điểm danh hôm nay" : "Đã điểm danh hôm nay"}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
