"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Cookies from "js-cookie";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/navbar";

interface Bank {
  id: number;
  name: string;
  code: string;
  logo?: string;
}

interface Withdraw {
  _id: string;
  withdraw_point: number;
  bankCode: string;
  bankAccount: string;
  accountHolder: string;
  status: string;
  note?: string;
  createdAt: string;

  taxAmount: number;
  netAmount: number;
  grossAmount: number;
  taxRate: number;
}

export default function WithdrawPage() {
  const [withdraw_point, setPoints] = useState<number>(0);
  const [bankList, setBankList] = useState<Bank[]>([]);
  const [bankCode, setBankCode] = useState<string>("");
  const [accountHolder, setAccountHolder] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [withdrawList, setWithdrawList] = useState<Withdraw[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [currentPoints, setCurrentPoints] = useState<number>(0);

  const { toast } = useToast();

  const pageSize = 5;

  useEffect(() => {
    const userInfo = Cookies.get("user_normal_info");
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      setAuthorId(parsed.user_id);
    }

    axios
      .get("https://api.vietqr.io/v2/banks")
      .then((res) => {
        if (res.data && res.data.data) {
          setBankList(res.data.data as Bank[]);
        }
      })
      .catch((err) => {
        console.error("Unable to fetch bank list:", err);
      });
  }, []);

  useEffect(() => {
    if (authorId) {
      axios
        .get(`${process.env.NEXT_PUBLIC_API_URL}/api/user/point`, {
          withCredentials: true,
        })
        .then((res) => {
          setCurrentPoints(res.data.author_point);
        })
        .catch((err) => {
          console.error("Unable to fetch current points:", err);
        });
    }
  }, [authorId]);

  // Lấy danh sách withdraw theo trang
  useEffect(() => {
    if (authorId) {
      axios
        .get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/withdraw/author/${authorId}?page=${page}&limit=${pageSize}`,
          { withCredentials: true }
        )
        .then((res) => {
          setWithdrawList(res.data.docs);
          setTotal(res.data.totalDocs);
        })
        .catch((err) =>
          console.error("Unable to fetch withdrawal list:", err)
        );
    }
  }, [authorId, page]);

  async function handleWithdraw() {
    if (!authorId) {
      toast({
        title: "Error",
        description:
          "Author information not found, please log in again.",
        variant: "destructive",
      });
      return;
    }
    if (withdraw_point < 50) {
      toast({
        title: "Error",
        description: "Minimum withdrawal amount is 50 points!",
        variant: "destructive",
      });
      return;
    }
    if (!bankCode) {
      toast({
        title: "Error",
        description: "Please select a bank.",
        variant: "destructive",
      });
      return;
    }
    if (!bankAccount.trim()) {
      toast({
        title: "Error",
        description: "Please enter account number.",
        variant: "destructive",
      });
      return;
    }
    if (!accountHolder.trim()) {
      toast({
        title: "Error",
        description: "Please enter account holder name.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/withdraw`,
        {
          authorId,
          withdraw_point,
          bankCode,
          bankAccount,
          accountHolder,
        },
        { withCredentials: true }
      );

      toast({
        title: "Success",
        description: "Withdrawal request created successfully!",
      });
      setPoints(0);
      setBankCode("");
      setAccountHolder("");
      setBankAccount("");
      setPage(1); // reload về trang đầu

      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/point`,
        { withCredentials: true }
      );
      setCurrentPoints(res.data.author_point);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "An error occurred!",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto pt-24 px-4 pb-10 space-y-10">
        {/* Form rút tiền */}
        <div className="bg-white dark:bg-card p-6 rounded-lg shadow border border-input">
          <h1 className="text-xl font-bold mb-6 text-foreground">
            Withdrawal Request
          </h1>
          <p className="mb-4 text-sm text-muted-foreground">
            Current points:{" "}
            <span className="font-semibold text-foreground">
              {currentPoints}
            </span>
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Points to withdraw
              </label>
              <Input
                type="number"
                value={withdraw_point}
                onChange={(e) => setPoints(Number(e.target.value) || 0)}
                placeholder="Enter points (minimum 50)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Bank
              </label>
              <select
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value)}
                className="w-full border border-input dark:bg-input/30 rounded px-3 py-2 text-foreground bg-transparent"
              >
                <option value="">-- Select bank --</option>
                {bankList.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Account number
              </label>
              <Input
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="e.g: 0123456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Account holder
              </label>
              <Input
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="Full name"
              />
            </div>

            <Button
              onClick={handleWithdraw}
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? "Processing..." : "Confirm withdrawal"}
            </Button>
          </div>
        </div>

        {/* Lịch sử rút tiền */}
        <div className="bg-white dark:bg-card p-6 rounded-lg shadow border border-input">
          <h2 className="text-lg font-bold mb-6 text-foreground">
            Lịch sử rút tiền
          </h2>
          {withdrawList.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có yêu cầu nào.
            </p>
          ) : (
            <div className="space-y-4">
              {withdrawList.map((w) => (
                <div
                  key={w._id}
                  className="p-6 border border-input rounded-lg flex justify-between items-center bg-background dark:bg-card"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {w.withdraw_point} point →{" "}
                      {w.grossAmount +
                        " - " +
                        w.taxAmount +
                        " = " +
                        w.netAmount}{" "}
                      VND (thuế {w.taxRate * 100}%)
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {w.bankAccount} ({w.accountHolder}) - {w.bankCode}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(w.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs rounded-full ${
                      w.status === "pending"
                        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                        : w.status === "completed"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                    }`}
                  >
                    {w.note ? `${w.status} (${w.note})` : w.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > pageSize && (
            <div className="flex justify-between items-center mt-6">
              <Button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                variant="outline"
              >
                Trang trước
              </Button>
              <span className="text-sm text-muted-foreground">
                Trang {page} / {Math.ceil(total / pageSize)}
              </span>
              <Button
                disabled={page >= Math.ceil(total / pageSize)}
                onClick={() => setPage((p) => p + 1)}
                variant="outline"
              >
                Trang sau
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
