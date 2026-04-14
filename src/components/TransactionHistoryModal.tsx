"use client";

import { Card } from "@/components/ui/card";
import {
  X,
  History,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Transaction {
  packageId: number;
  price: number;
  pointReceived: number;
  status: "pending" | "success" | "failed";
  txnRef: string;
  createdAt: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
}

const formatDateTime = (dateString: string | Date) => {
  const date = new Date(dateString);

  if (isNaN(date.getTime())) return "N/A";

  const pad = (num: number) => num.toString().padStart(2, "0");

  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();

  return `${hours}:${minutes} - ${day}/${month}/${year}`;
};

export function TransactionHistoryModal({
  isOpen,
  onClose,
  transactions,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-slate-900 border border-teal-500/30 rounded-2xl shadow-2xl shadow-teal-500/10 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-teal-500/20 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
              <History size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Transaction history
              </h2>
              <p className="text-xs text-slate-400">
                Track your top-up transactions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <div className="p-4 rounded-full bg-slate-800/50 mb-4">
                <History size={40} className="opacity-20" />
              </div>
              <p>No transaction data yet</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {transactions.map((tx) => (
                <TransactionCard key={tx.txnRef} tx={tx} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900/80 border-t border-teal-500/10 text-center">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">
            Secure payments powered by VNPay
          </p>
        </div>
      </div>
    </div>
  );
}

function TransactionCard({ tx }: { tx: Transaction }) {
  const statusConfig = {
    success: {
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      icon: <CheckCircle2 size={16} />,
      label: "Success",
    },
    failed: {
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      icon: <XCircle size={16} />,
      label: "Failed",
    },
    pending: {
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      icon: <Clock size={16} />,
      label: "Pending",
    },
  };

  const config = statusConfig[tx.status] || statusConfig.pending;

  return (
    <Card
      className={cn(
        "relative group overflow-hidden bg-slate-800/40 border transition-all duration-300 hover:bg-slate-800/60",
        config.border,
      )}
    >
      <div className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={cn("p-3 rounded-xl shrink-0", config.bg, config.color)}
          >
            <Package size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-slate-400 text-xs">
                Ref: {tx.txnRef.slice(0, 10)}...
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">
                +{tx.pointReceived}
              </span>
              <span className="text-xs text-teal-400 font-semibold uppercase tracking-tighter">
                Points
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
              config.bg,
              config.color,
            )}
          >
            {config.icon}
            {config.label}
          </div>
          <div className="flex items-center gap-1 text-slate-500 text-[11px]">
            <Clock size={12} />
            {formatDateTime(new Date(tx.createdAt))}
          </div>
        </div>
      </div>

      {/* Giá tiền nằm dưới cùng tinh tế */}
      <div className="px-4 py-2 bg-slate-950/30 flex justify-between items-center border-t border-white/5">
        <span className="text-[11px] text-slate-500 uppercase">
          Payment amount
        </span>
        <span className="text-sm font-semibold text-slate-300">
          {tx.price.toLocaleString()} VND
        </span>
      </div>
    </Card>
  );
}
