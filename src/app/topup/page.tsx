"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Crown, Gift } from "lucide-react";
import axios from "axios";
import Cookies from "js-cookie";
import { useToast } from "@/hooks/use-toast";

interface TopupPackage {
  id: number;
  price: number;
  points: number;
  effectivePoints: number;
  alreadyBought: boolean;
}

export default function TopupPage() {
  const [packages, setPackages] = useState<TopupPackage[]>([]);
  const { toast } = useToast();

  const decodeToken = () => {
    const raw = Cookies.get("user_normal_info");
    if (!raw) return null;
    try {
      return JSON.parse(decodeURIComponent(raw));
    } catch {
      return null;
    }
  };

  async function fetchPackages() {
    const raw = Cookies.get("user_normal_info");
    let userId: string | null = null;

    if (raw) {
      try {
        userId = JSON.parse(raw)?.user_id;
      } catch (e) {
        console.error("Invalid cookie data");
      }
    }

    if (!userId) return;

    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/topup/packages?userId=${userId}`,
        { withCredentials: true }
      );
      setPackages(res.data.packages);
    } catch (error) {
      console.error("Lỗi khi lấy gói nạp:", error);
    }
  }

  useEffect(() => {
    fetchPackages();
  }, []);

  async function handleBuy(pkg: TopupPackage) {
    try {
      const tokenPayload = decodeToken();
      const userId = tokenPayload?.user_id;
      if (!userId) {
        toast({
          title: "Thiếu đăng nhập",
          description: "Vui lòng đăng nhập lại trước khi mua.",
          variant: "destructive",
        });
        return;
      }

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/vnpay/create-payment-url/${userId}`,
        { packageId: pkg.id, amount: pkg.price },
        { withCredentials: true }
      );

      if (res.data?.paymentUrl) {
        window.location.href = res.data.paymentUrl;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(
        "Lỗi tạo URL thanh toán",
        error.response?.data || error.message
      );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 p-6">
      {/* Header Section */}
      <div className="max-w-6xl mx-auto mb-12 text-center">
        <h1 className="text-5xl font-bold text-white mb-4 text-balance">
          Nạp Điểm Đọc Truyện
          <Sparkles
            className="inline-block ml-2 text-teal-400 animate-pulse"
            size={40}
          />
        </h1>
        <p className="text-xl text-slate-300 text-pretty">
          Khám phá thế giới truyện tranh không giới hạn với các gói nạp hấp dẫn
        </p>
      </div>

      {/* Packages Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg, index) => {
          const delay = index * 0.1;
          const showBonus = pkg.effectivePoints > pkg.points; // chỉ hiển thị bonus nếu còn

          return (
            <Card
              key={pkg.id}
              className="relative p-6 bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-2 transition-all duration-300 hover:scale-105 hover:shadow-2xl backdrop-blur-sm border-teal-500/30 hover:border-teal-400"
              style={{ animationDelay: `${delay}s` }}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                {/* Giá + điểm cơ bản */}
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-white">
                    {pkg.price.toLocaleString()}
                    <span className="text-lg text-teal-300 ml-1">VND</span>
                  </p>
                  <p className="text-lg text-gray-400">
                    {pkg.points} điểm cơ bản
                  </p>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-teal-500 to-transparent"></div>

                {/* Chỉ hiển thị phần bonus nếu còn */}
                {showBonus && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <Zap className="text-cyan-400" size={24} />
                      <p className="text-2xl font-bold text-cyan-400 flex items-center gap-1">
                        {pkg.effectivePoints.toLocaleString()}
                        <Gift
                          className="text-yellow-400 animate-pulse"
                          size={20}
                        />
                      </p>
                      <span className="text-lg text-teal-300">điểm</span>
                    </div>
                    <p className="text-xs text-green-400 font-medium">
                      Bonus x2 điểm lần đầu trong tháng!
                    </p>
                  </div>
                )}

                <Button
                  className="w-full py-3 font-bold text-lg transition-all duration-300 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-teal-500/25"
                  onClick={() => handleBuy(pkg)}
                >
                  MUA NGAY
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Bottom info section */}
      <div className="mt-12 text-center">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-teal-500/20">
          <h3 className="text-xl font-bold text-white mb-3">
            Tại sao chọn chúng tôi?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-300">
            <div className="flex items-center justify-center space-x-2">
              <Zap className="text-cyan-400" size={16} />
              <span>Nạp điểm tức thì</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Crown className="text-yellow-400" size={16} />
              <span>Ưu đãi độc quyền</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Crown className="text-yellow-400" size={16} />
              <span>Đảm bảo an toàn</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
