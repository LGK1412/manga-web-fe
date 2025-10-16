"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Policy = {
  _id: string;
  title: string;
  type: string;         // ví dụ: "Terms", "Privacy", ...
  description: string;
  content: string;
  status: string;       // "Active" / "Draft" / ...
  isPublic: boolean;
  updatedAt: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional: lọc theo type, vd: ["Terms"] hoặc ["Privacy"] */
  typeFilter?: string[];
  /** Optional: tiêu đề modal */
  title?: string;
  /** Optional: mô tả modal */
  description?: string;
};

export default function ActivePoliciesModal({
  open,
  onOpenChange,
  typeFilter,
  title = "Active Policies",
  description = "Các chính sách đang có hiệu lực",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (!open) return;
    let mounted = true;

    const fetchPolicies = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get<Policy[]>(`${API}/api/policies`, {
          withCredentials: true,
        });
        if (!mounted) return;
        const active = (res.data || []).filter(
          (p) => p.status?.toLowerCase() === "active" && p.isPublic
        );
        const filtered =
          typeFilter && typeFilter.length > 0
            ? active.filter((p) => typeFilter.includes(p.type))
            : active;
        setPolicies(filtered);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Không thể tải policies");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    fetchPolicies();
    return () => {
      mounted = false;
    };
  }, [open, API, typeFilter]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {loading && <p className="text-sm text-gray-500">Đang tải…</p>}
        {error && <p className="text-sm text-red-600">Lỗi: {error}</p>}

        {!loading && !error && policies.length === 0 && (
          <p className="text-sm text-gray-500">Chưa có policy công khai nào.</p>
        )}

        {!loading && !error && policies.length > 0 && (
          <div className="space-y-6">
            {policies.map((p) => (
              <div key={p._id} className="border-b pb-6">
                <h3 className="text-lg font-semibold text-gray-900">{p.title}</h3>
                {p.description && (
                  <p className="text-sm text-gray-500 mb-3">{p.description}</p>
                )}
                <div className="bg-gray-50 p-4 rounded text-gray-800 whitespace-pre-wrap">
                  {p.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
