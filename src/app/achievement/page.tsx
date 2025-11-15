"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Trophy, Zap, CheckCircle2, Clock, Coins, Gift } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { useToast } from "@/hooks/use-toast";
import { useUserPoint } from "@/contexts/UserPointContext";

export default function AchievementsPage() {
  const { toast } = useToast();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const { point, authorPoint, setPointsDirectly, refreshPoints } =
    useUserPoint();

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/achievements/me`,
        { withCredentials: true }
      );
      setAchievements(res.data);
    } catch (err) {
      console.error("Lỗi tải thành tựu:", err);
      toast({
        title: "Lỗi tải thành tựu",
        description: "Không thể tải danh sách thành tựu",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (id: string) => {
    try {
      setClaiming(id);

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/achievements/${id}/claim`,
        {},
        { withCredentials: true }
      );

      const reward = res.data.reward;

      if (reward) {
        setPointsDirectly(
          point + (reward.point ?? 0),
          authorPoint + (reward.author_point ?? 0)
        );
      }

      toast({
        title: "Thành công",
        description: "Nhận thưởng thành công",
      });

      fetchAchievements();
    } catch (err: any) {
      console.error("Lỗi nhận thưởng:", err);

      toast({
        title: "Lỗi",
        description: err.response?.data?.message || "Không thể nhận thưởng",
      });
    } finally {
      setClaiming(null);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-500">Đang tải thành tựu...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 p-6">
      <Navbar />
      <div className="max-w-5xl mx-auto m-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <Trophy className="w-8 h-8 text-amber-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-indigo-400 dark:to-blue-400 bg-clip-text text-transparent">
              Thành tựu
            </h1>
          </div>
          <p className="text-muted-foreground text-lg italic">
            Hoàn thành các nhiệm vụ để nhận phần thưởng!
          </p>
        </div>

        {/* Achievements List */}
        {achievements.length > 0 ? (
          <div className="space-y-4">
            {achievements.map((a) => {
              const ach = a.achievementId;
              const percent =
                Math.min((a.progressCount / ach.threshold) * 100, 100) || 0;
              const isCompleted = a.isCompleted;
              const isRewardClaimed = a.rewardClaimed;

              return (
                <div
                  key={a._id}
                  className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-blue-200 overflow-hidden"
                >
                  <div className="p-6 flex items-center gap-6">
                    {/* Icon */}
                    <div
                      className={`flex-shrink-0 w-16 h-16 rounded-lg flex items-center justify-center transition-all duration-300 ${
                        isCompleted
                          ? "bg-gradient-to-br from-amber-100 to-amber-50"
                          : "bg-gradient-to-br from-blue-100 to-indigo-50"
                      }`}
                    >
                      {isCompleted ? (
                        <Trophy className="w-8 h-8 text-amber-600" />
                      ) : (
                        <Clock className="w-8 h-8 text-blue-600" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-semibold text-foreground mb-2">
                        {ach.name}
                      </h2>
                      <p className="text-muted-foreground text-sm mb-4">
                        {ach.description}
                      </p>

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">
                            Tiến độ:{" "}
                            <span className="font-semibold text-gray-800">
                              {a.progressCount}/{ach.threshold}
                            </span>
                          </span>
                          <span className="font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            {percent.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 h-3 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              isCompleted
                                ? "bg-gradient-to-r from-amber-400 to-amber-500"
                                : "bg-gradient-to-r from-blue-500 to-indigo-500"
                            }`}
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Rewards & Action */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-3">
                      {/* Reward Info */}
                      <div className="text-right">
                        {ach.reward?.author_point > 0 && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            <span className="font-semibold">
                              {ach.reward.author_point}
                            </span>
                            <span>điểm tác giả</span>
                          </div>
                        )}

                        {ach.reward?.point > 0 && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Coins className="w-4 h-4 text-blue-500" />
                            <span className="font-semibold">
                              {ach.reward.point}
                            </span>
                            <span>điểm thông thường</span>
                          </div>
                        )}
                      </div>

                      {/* Status Button */}
                      {!isCompleted ? (
                        <div className="text-xs text-muted-foreground px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                          Đang tiến hành
                        </div>
                      ) : isCompleted && !isRewardClaimed ? (
                        <Button
                          onClick={() => handleClaim(ach._id)}
                          disabled={claiming === ach._id}
                          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
                          size="sm"
                        >
                          {claiming === ach._id ? (
                            <span className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Đang nhận...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <Gift className="w-4 h-4" />
                              Nhận thưởng
                            </span>
                          )}
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1 text-green-600 font-medium text-sm px-3 py-1 bg-green-50 dark:bg-green-900/30 rounded-full">
                          <CheckCircle2 className="w-4 h-4" />
                          Đã nhận
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">
              Chưa có thành tựu nào.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
