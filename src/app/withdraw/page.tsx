"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Cookies from "js-cookie";
import { useToast } from "@/hooks/use-toast";

interface Bank {
  id: number;
  name: string;
  code: string;
  logo?: string;
}

interface Withdraw {
  _id: string;
  amount: number;
  bankCode: string;
  bankAccount: string;
  accountHolder: string;
  status: string;
  createdAt: string;
  withdraw_point: number;
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
        console.error("Không lấy được danh sách ngân hàng:", err);
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
          console.error("Không lấy được số điểm hiện tại:", err);
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
          console.error("Không lấy được danh sách rút tiền:", err)
        );
    }
  }, [authorId, page]);

  async function handleWithdraw() {
    if (!authorId) {
      toast({
        title: "Lỗi",
        description:
          "Không tìm thấy thông tin tác giả, vui lòng đăng nhập lại.",
        variant: "destructive",
      });
      return;
    }
    if (withdraw_point < 50) {
      toast({
        title: "Lỗi",
        description: "Số điểm rút tối thiểu là 50 điểm!",
        variant: "destructive",
      });
      return;
    }
    if (!bankCode) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ngân hàng.",
        variant: "destructive",
      });
      return;
    }
    if (!bankAccount.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập số tài khoản.",
        variant: "destructive",
      });
      return;
    }
    if (!accountHolder.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên chủ tài khoản.",
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
        title: "Thành công",
        description: "Tạo yêu cầu rút thành công!",
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
        title: "Lỗi",
        description: err.response?.data?.message || "Có lỗi xảy ra!",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 space-y-10">
      {/* Form rút tiền */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-xl font-bold mb-6">Yêu cầu rút tiền</h1>
        <p className="mb-4 text-sm text-gray-600">
          Điểm hiện tại: <span className="font-semibold">{currentPoints}</span>
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Số điểm muốn rút
            </label>
            <Input
              type="number"
              value={withdraw_point}
              onChange={(e) => setPoints(Number(e.target.value) || 0)}
              placeholder="Nhập số điểm (tối thiểu 50)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ngân hàng</label>
            <select
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">-- Chọn ngân hàng --</option>
              {bankList.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Số tài khoản
            </label>
            <Input
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              placeholder="VD: 0123456789"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Chủ tài khoản
            </label>
            <Input
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="Tên đầy đủ"
            />
          </div>

          <Button
            onClick={handleWithdraw}
            disabled={loading}
            className="w-full bg-primary text-white"
          >
            {loading ? "Đang xử lý..." : "Xác nhận rút tiền"}
          </Button>
        </div>
      </div>

      {/* Lịch sử rút tiền */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-bold mb-6">Lịch sử rút tiền</h2>
        {withdrawList.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có yêu cầu nào.</p>
        ) : (
          <div className="space-y-4">
            {withdrawList.map((w) => (
              <div
                key={w._id}
                className="p-6 border rounded-lg flex justify-between items-center"
              >
                <div>
                  <p className="font-medium">
                    {w.withdraw_point} điểm → {w.amount.toLocaleString()} VND
                  </p>
                  <p className="text-sm text-gray-600">
                    {w.bankAccount} ({w.accountHolder}) - {w.bankCode}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(w.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 text-xs rounded-full ${
                    w.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : w.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {w.status}
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
            <span className="text-sm text-gray-600">
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
  );
}
