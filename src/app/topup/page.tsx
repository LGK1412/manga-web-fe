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

interface Transaction {
  packageId: number;
  price: number;
  pointReceived: number;
  status: "pending" | "success" | "failed";
  txnRef: string;
  createdAt: string;
}

export default function TopupPage() {
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [packages, setPackages] = useState<TopupPackage[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();

  async function fetchUser() {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`,
        { withCredentials: true },
      );
      setUser(res.data);
    } catch (error) {
      console.error("Không lấy được user:", error);
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  }

  async function fetchPackages() {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/topup/packages`,
        { withCredentials: true },
      );
      setPackages(res.data.packages);
    } catch (error) {
      console.error("Error fetching top-up packages:", error);
    }
  }
  async function fetchTransactions() {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/topup/transactions`,
        { withCredentials: true },
      );
      setTransactions(res.data.transactions);
    } catch (error) {
      console.error("Error fetching transaction history:", error);
    }
  }

  async function handleBuy(pkg: TopupPackage) {
    try {
      if (!user?.user_id) {
        toast({
          title: "Lack of login information!",
          description: "Please login before buying point",
          variant: "destructive",
        });
        return;
      }

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/vnpay/create-payment-url/${user.user_id}`,
        { packageId: pkg.id, amount: pkg.price },
        { withCredentials: true },
      );

      if (res.data?.paymentUrl) {
        window.location.href = res.data.paymentUrl;
      }
    } catch (error: any) {
      console.error(
        "Error creating payment URL",
        error.response?.data || error.message
      );
    }
  }

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user?.user_id) {
      fetchPackages();
      fetchTransactions();
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 p-6">
      {/* Header Section */}
      <div className="flex justify-end max-w-6xl mx-auto mb-6">
        <Button
          onClick={() => {
            fetchTransactions();
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-800 text-white"
        >
          Lịch sử giao dịch
        </Button>
      </div>

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
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-slate-900 text-white rounded-xl w-11/12 max-w-3xl p-6 relative">
            <h2 className="text-2xl font-bold mb-4">Lịch sử giao dịch</h2>
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
              onClick={() => setShowModal(false)}
            >
              ✕
            </button>
            <div className="max-h-96 overflow-y-auto">
              {transactions.length === 0 ? (
                <p className="text-center text-gray-400">
                  Chưa có giao dịch nào.
                </p>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <Card
                      key={tx.txnRef}
                      className="p-4 bg-slate-800/80 border border-teal-500/30"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1 text-slate-200">
                          <p>Gói: {tx.packageId}</p>
                          <p>Giá: {tx.price.toLocaleString()} VND</p>
                          <p>Điểm nhận: {tx.pointReceived}</p>
                          <p>Ngày: {new Date(tx.createdAt).toLocaleString()}</p>
                        </div>
                        <div>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              tx.status === "success"
                                ? "bg-green-600 text-white"
                                : tx.status === "failed"
                                  ? "bg-red-600 text-white"
                                  : "bg-yellow-600 text-white"
                            }`}
                          >
                            {tx.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
