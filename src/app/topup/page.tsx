"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Crown, Gift, ArrowLeft } from "lucide-react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { TransactionHistoryModal } from "@/components/TransactionHistoryModal";

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
  const router = useRouter();
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
      console.error("Unable to fetch user:", error);
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
      setTransactions(res.data);
    } catch (error) {
      console.error("Error fetching transaction history:", error);
    }
  }

  async function handleBuy(pkg: TopupPackage) {
    try {
      if (!user?.user_id) {
        toast({
          title: "Not Logged In",
          description: "Please log in before purchasing points",
          variant: "destructive",
        });
        return;
      }

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/vnpay/create-payment-url`,
        { packageId: pkg.id, amount: pkg.price },
        { withCredentials: true },
      );

      if (res.data?.paymentUrl) {
        window.location.href = res.data.paymentUrl;
      }
    } catch (error: any) {
      console.error(
        "Error creating payment URL",
        error.response?.data || error.message,
      );
      toast({
        title: "Error",
        description: "Failed to create payment. Please try again.",
        variant: "destructive",
      });
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
      <div className="flex justify-between items-center max-w-6xl mx-auto mb-8">
        <Button
          onClick={() => router.back()}
          variant="ghost"
          className="group flex items-center gap-2 text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back
        </Button>
        <Button
          onClick={() => {
            fetchTransactions();
            setShowModal(true);
          }}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
        >
          Transaction History
        </Button>
      </div>

      <div className="max-w-6xl mx-auto mb-12 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <h1 className="text-5xl font-bold text-white text-balance">
            Top Up Points
          </h1>
          <Sparkles
            className="text-teal-400 animate-pulse flex-shrink-0"
            size={40}
          />
        </div>
        <p className="text-xl text-slate-300 text-pretty max-w-2xl mx-auto">
          Discover unlimited manga stories with our attractive top-up packages and special bonuses
        </p>
      </div>

      {/* Packages Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {packages.map((pkg, index) => {
          const delay = index * 0.1;
          const showBonus = pkg.effectivePoints > pkg.points;

          return (
            <Card
              key={pkg.id}
              className="relative p-6 bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-2 transition-all duration-300 hover:scale-105 hover:shadow-2xl backdrop-blur-sm border-teal-500/30 hover:border-teal-400"
              style={{ animationDelay: `${delay}s` }}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                {/* Price + Base Points */}
                <div className="space-y-2">
                  <p className="text-3xl font-bold text-white">
                    {pkg.price.toLocaleString()}
                    <span className="text-lg text-teal-300 ml-1">VND</span>
                  </p>
                  <p className="text-lg text-gray-400">
                    {pkg.points} base points
                  </p>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-teal-500 to-transparent"></div>

                {/* Display bonus if available */}
                {showBonus && (
                  <div className="space-y-2 w-full">
                    <div className="bg-gradient-to-r from-cyan-500/20 to-teal-500/20 rounded-lg p-3 border border-cyan-400/30">
                      <div className="flex items-center justify-center space-x-2">
                        <Zap className="text-cyan-400" size={24} />
                        <p className="text-2xl font-bold text-cyan-400 flex items-center gap-1">
                          {pkg.effectivePoints.toLocaleString()}
                          <Gift
                            className="text-yellow-400 animate-pulse"
                            size={20}
                          />
                        </p>
                        <span className="text-lg text-teal-300">points</span>
                      </div>
                      <p className="text-xs text-green-400 font-medium text-center mt-2">
                        🎁 Bonus 2x points on first purchase this month!
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full py-3 font-bold text-lg transition-all duration-300 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-teal-500/25"
                  onClick={() => handleBuy(pkg)}
                >
                  BUY NOW
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Bottom info section */}
      <div className="mt-16 text-center">
        <div className="bg-gradient-to-r from-slate-800/50 to-teal-800/30 backdrop-blur-sm rounded-2xl p-8 border border-teal-500/30 shadow-xl">
          <h3 className="text-2xl font-bold text-white mb-6">
            Why Choose Us?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-300">
            <div className="flex flex-col items-center justify-center space-y-2 p-4 rounded-lg bg-cyan-500/10 border border-cyan-400/20">
              <Zap className="text-cyan-400" size={24} />
              <span className="font-medium">Instant Points</span>
            </div>
            <div className="flex flex-col items-center justify-center space-y-2 p-4 rounded-lg bg-yellow-500/10 border border-yellow-400/20">
              <Crown className="text-yellow-400" size={24} />
              <span className="font-medium">Exclusive Deals</span>
            </div>
            <div className="flex flex-col items-center justify-center space-y-2 p-4 rounded-lg bg-green-500/10 border border-green-400/20">
              <Crown className="text-green-400" size={24} />
              <span className="font-medium">100% Secure</span>
            </div>
          </div>
        </div>
      </div>
      {showModal && (
        <TransactionHistoryModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          transactions={transactions}
        />
      )}
    </div>
  );
}
