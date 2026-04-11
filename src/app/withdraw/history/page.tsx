"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  CalendarIcon,
  CreditCard,
  ArrowRight,
  Wallet,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Withdraw {
  _id: string;
  withdraw_point: number;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  grossAmount: number;
  taxAmount: number;
  netAmount: number;
  taxRate: number;
  status: "pending" | "approved" | "rejected" | "settled" | "paid";
  createdAt: string;
  approvedAt?: string;
  settledAt?: string;
  paidAt?: string;
  note?: string;
}

const pageSize = 5;

const TABS = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Settled", value: "settled" },
  { label: "Paid", value: "paid" },
  { label: "Rejected", value: "rejected" },
];

export default function WithdrawHistoryTable() {
  const { toast } = useToast();
  const [list, setList] = useState<Withdraw[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [date, setDate] = useState<DateRange | undefined>();
  const [status, setStatus] = useState("");

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        ...(status && { status }),
        ...(date?.from && {
          from: format(date.from, "yyyy-MM-dd"),
        }),
        ...(date?.to && {
          to: format(date.to, "yyyy-MM-dd"),
        }),
      });

      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/withdraw/me?${params}`,
        { withCredentials: true },
      );

      setList(res.data.docs);
      setTotal(res.data.totalDocs);
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoading(false);
    }
  }

  const handleExportProof = async () => {
    try {
      setExporting(true);
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tax-settlement/export/me`,
        {
          responseType: "blob",
          withCredentials: true,
        },
      );

      const contentType = res.headers["content-type"];
      const blob = new Blob([res.data], { type: contentType });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `tax-proof-${new Date().getFullYear() - 1}.zip`;

      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      let errorMessage = "No data or server error";

      if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const json = JSON.parse(text);
          errorMessage = json.message || errorMessage;
        } catch (e) {
          console.error("Error parsing error blob", e);
        }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      toast({
        variant: "destructive",
        title: "Export failed",
        description: errorMessage,
      });
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, status, date]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US").format(v) + "₫";

  const getStatusStyle = (status: string) => {
    const styles: any = {
      pending: "bg-amber-50 text-amber-600 border-amber-200",
      approved: "bg-blue-50 text-blue-600 border-blue-200",
      settled: "bg-purple-50 text-purple-600 border-purple-200",
      paid: "bg-emerald-50 text-emerald-600 border-emerald-200",
      rejected: "bg-rose-50 text-rose-600 border-rose-200",
    };
    return styles[status] || "bg-gray-50 text-gray-600";
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4">
      {/* HEADER & DATE FILTER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800">
          Withdrawal History
        </h2>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-[260px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "dd/MM/yyyy")} -{" "}
                    {format(date.to, "dd/MM/yyyy")}
                  </>
                ) : (
                  format(date.from, "dd/MM/yyyy")
                )
              ) : (
                <span>Pick date range</span>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={(range) => {
                setDate(range);
                setPage(1);
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setDate(undefined);
            setPage(1);
          }}
        >
          Clear
        </Button>
      </div>

      <Button
        onClick={handleExportProof}
        disabled={exporting}
        className="gap-2"
      >
        {exporting ? "Exporting..." : "Export documents"}
      </Button>

      {/* STATUS TABS */}
      <div className="flex overflow-x-auto pb-2 gap-1 no-scrollbar border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
            className={`px-5 py-3 text-sm font-medium transition-all whitespace-nowrap border-b-2 ${
              status === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TRANSACTION LIST */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-20 text-slate-400 animate-pulse">
            Loading data...
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed">
            <p className="text-slate-500 text-sm">No requests found.</p>
          </div>
        ) : (
          list.map((w) => (
            <div
              key={w._id}
              className="group bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow relative overflow-hidden"
            >
              {/* BADGE STATUS */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-full group-hover:bg-primary/10 transition-colors">
                    <Wallet
                      size={20}
                      className="text-slate-600 group-hover:text-primary"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                      ID: #{w._id.slice(-6)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(w.createdAt).toLocaleString("en-US")}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 text-[11px] font-bold rounded-full border shadow-sm ${getStatusStyle(w.status)}`}
                >
                  {w.status.toUpperCase()}
                </span>
              </div>

              {/* MAIN INFO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-800">
                      {formatCurrency(w.netAmount)}
                    </span>
                    <span className="text-xs text-slate-400 line-through">
                      {formatCurrency(w.grossAmount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium">
                    <Info size={12} />
                    Tax ({w.taxRate * 100}%): -{formatCurrency(w.taxAmount)}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl flex items-center gap-3 border border-slate-100">
                  <div className="text-primary bg-white p-2 rounded-lg shadow-sm border border-slate-200">
                    <CreditCard size={18} />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-slate-700">
                      {w.bankAccountName}
                    </p>
                    <p className="text-slate-500 truncate max-w-[150px]">
                      {w.bankName} • {w.bankAccount}
                    </p>
                  </div>
                </div>
              </div>

              {/* NOTES (If any) */}
              {w.note && (
                <div className="mt-4 p-2 bg-orange-50/50 rounded-lg text-[11px] text-orange-600 italic">
                  * Note: {w.note}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* PAGINATION */}
      {total > pageSize && (
        <div className="flex justify-center items-center gap-6 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="rounded-full px-6 hover:bg-slate-100"
          >
            Prev
          </Button>
          <span className="text-sm font-medium">
            Page <span className="text-primary">{page}</span> /{" "}
            {Math.ceil(total / pageSize)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= Math.ceil(total / pageSize)}
            onClick={() => setPage(page + 1)}
            className="rounded-full px-6 hover:bg-slate-100"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
