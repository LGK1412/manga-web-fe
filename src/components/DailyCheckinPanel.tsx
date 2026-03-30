"use client";

import { DAILY_REWARD_CONFIG } from "@/data/reward";
import axios from "axios";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Award, CheckCircle2, Gift, Sparkles, X } from "lucide-react";
import { useUserPoint } from "@/contexts/UserPointContext";
import { cn } from "@/lib/utils";
import moment from "moment-timezone";

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
  open: boolean;
  onClose: () => void;
}

export default function DailyCheckinPanel({
  open,
  onClose,
}: DailyCheckinPanelProps) {
  const [status, setStatus] = useState<CheckinStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const { refreshPoints, role, isLoading: isUserLoading } = useUserPoint();
  const isAllowed = role === "user" || role === "author";
  const rewards: RewardConfigItem[] = isAllowed
    ? DAILY_REWARD_CONFIG[role]
    : [];

  const getTodayIndex = () => {
    if (!status?.weekStart) return -1;

    const timezone = "Asia/Ho_Chi_Minh";
    const now = moment.tz(timezone).startOf("day");
    const start = moment.tz(status.weekStart, timezone).startOf("day");
    const diff = now.diff(start, "days");
    return diff >= 0 && diff <= 6 ? diff : -1;
  };

  const todayIndexFromServer = getTodayIndex();

  useEffect(() => {
    if (open) fetchStatus();
  }, [open]);

  async function fetchStatus() {
    try {
      const { data } = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/checkin/status`,
        { withCredentials: true },
      );
      setStatus(data);
    } catch (err) {
      console.error("Fetch status error:", err);
    }
  }

  async function handleCheckin() {
    if (!status?.canCheckin || loading) return;

    setLoading(true);
    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/checkin/today`,
        { role },
        { withCredentials: true },
      );
      setStatus((prev) => ({
        ...prev!,
        checkins: data.checkins,
        canCheckin: false,
      }));

      await refreshPoints();
    } catch (err) {
      console.error("Checkin error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border bg-background text-foreground border-border">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-2xl">
              <Gift size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Daily Check-in</h2>
              <p className="text-xs text-muted-foreground font-medium">
                Earn points every day with us!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {!status ? (
          <div className="p-20 text-center text-muted-foreground">
            <p className="text-sm font-medium">Loading data...</p>
          </div>
        ) : (
          <div className="p-6">
            {/* Grid Rewards */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5 mb-8">
              {rewards.map((r, index) => {
                const dayIndex = r.day; // 1, 2, 3...
                const isChecked = status.checkins[dayIndex - 1];
                const isToday =
                  dayIndex - 1 === todayIndexFromServer && status.canCheckin;

                return (
                  <div
                    key={dayIndex}
                    className={cn(
                      "flex flex-col items-center p-3 rounded-2xl border-2 transition-all duration-200",
                      isChecked
                        ? "bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400 opacity-90"
                        : isToday
                          ? "bg-background border-teal-500 text-teal-600 dark:text-teal-400 ring-4 ring-teal-500/15 scale-105 z-10 shadow-md"
                          : "bg-muted/50 border-border text-muted-foreground opacity-80",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[10px] font-bold mb-2 uppercase tracking-tight",
                        isToday ? "text-teal-600 dark:text-teal-400" : "",
                      )}
                    >
                      Day {dayIndex}
                    </span>
                    <div className="mb-2">
                      {isChecked ? (
                        <CheckCircle2 size={20} className="text-teal-500" />
                      ) : (
                        <Award
                          size={20}
                          className={
                            isToday ? "text-teal-500" : "text-muted-foreground"
                          }
                        />
                      )}
                    </div>
                    <div className="text-[11px] font-black leading-none">
                      +{r.points ?? r.authorPoints}
                    </div>
                    <span className="text-[8px] font-bold uppercase mt-0.5">
                      {r.points ? "Point" : "AP"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Action Button */}
            <button
              onClick={handleCheckin}
              disabled={loading || !status.canCheckin}
              className={cn(
                "w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-500/10",
                status.canCheckin
                  ? "bg-teal-600 hover:bg-teal-700 text-white"
                  : "bg-muted text-muted-foreground cursor-not-allowed shadow-none border border-border",
              )}
            >
              {loading ? (
                "Đang xử lý..."
              ) : status.canCheckin ? (
                <>
                  <Sparkles size={18} />
                  CLAIM NOW!
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  YOU HAVE CHECKED-IN TODAY!
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
