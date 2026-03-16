"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Withdraw {
  _id: string;
  withdraw_point: number;

  grossAmount: number;
  taxAmount: number;
  taxRate: number;
  netAmount: number;
  taxLegalRef?: string;

  bankCode: string;
  bankAccount: string;
  accountHolder: string;

  status: string;
  note?: string;

  createdAt: string;
}

const pageSize = 5;

export default function WithdrawHistoryTable() {
  const [list, setList] = useState<Withdraw[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");

  async function fetchData() {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
      ...(status && { status }),
      ...(from && { from }),
      ...(to && { to }),
    });

    const res = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/withdraw/me?${params}`,
      { withCredentials: true },
    );

    setList(res.data.docs);
    setTotal(res.data.totalDocs);
  }

  function money(v: number) {
    return v.toLocaleString("vi-VN") + "₫";
  }

  useEffect(() => {
    fetchData();
  }, [page, status, from, to]);

  async function handleExport() {
    const token = Cookies.get("access_token");

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/reports/withdraw/statement?from=${from}&to=${to}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "withdraw-statement.xlsx";
    a.click();
  }

  function badge(status: string, note?: string) {
    const map: any = {
      pending: "bg-yellow-100 text-yellow-700",
      approved: "bg-blue-100 text-blue-700",
      settled: "bg-purple-100 text-purple-700",
      paid: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
    };

    return (
      <span className={`px-3 py-1 text-xs rounded-full ${map[status]}`}>
        {note ? `${status} (${note})` : status}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* FILTER BAR */}
      <div className="flex gap-3 items-end flex-wrap">
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">All status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="settled">Settled</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </select>

        <Button onClick={handleExport}>Export Excel</Button>
      </div>

      {/* TABLE */}
      <div className="space-y-3">
        {list.map((w) => (
          <div key={w._id} className="border p-5 rounded-lg space-y-2 bg-card">
            {/* HEADER */}
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-lg">
                  {w.withdraw_point} point → {money(w.netAmount)}
                </p>

                <p className="text-xs text-muted-foreground">
                  {new Date(w.createdAt).toLocaleString()}
                </p>
              </div>

              {badge(w.status, w.note)}
            </div>

            {/* MONEY BREAKDOWN */}
            <div className="text-sm space-y-1">
              <p>Gross: {money(w.grossAmount)}</p>

              <p className="text-red-600">
                Tax ({w.taxRate * 100}%): -{money(w.taxAmount)}
              </p>

              <p className="font-semibold text-green-600">
                Net received: {money(w.netAmount)}
              </p>
            </div>

            {/* BANK INFO */}
            <div className="text-xs text-muted-foreground">
              Bank: {w.bankAccount} ({w.accountHolder}) - {w.bankCode}
            </div>
          </div>
        ))}
      </div>

      {/* PAGINATION */}
      {total > pageSize && (
        <div className="flex justify-between items-center">
          <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Prev
          </Button>

          <span>
            {page} / {Math.ceil(total / pageSize)}
          </span>

          <Button
            disabled={page >= Math.ceil(total / pageSize)}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
