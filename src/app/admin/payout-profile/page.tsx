"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "../adminLayout/page";

type KycStatus = "pending" | "verified" | "rejected";

export interface ProfileItem {
  _id: string;
  fullName: string;
  citizenId: string;
  dateOfBirth: Date;
  address: string;
  taxCode: string;
  bankName: string;
  bankAccount: string;
  bankAccountName: string;
  identityImages?: string[];
  kycStatus: KycStatus;
  isActive: boolean;
  createdAt: Date;
  changedAt?: Date;
  rejectReason?: string;
  isHistory?: boolean;
  user_info: {
    _id: string;
    email: string;
    username: string;
  };
}

export default function PayoutProfileManagement() {
  const { toast } = useToast();
  const [items, setItems] = useState<ProfileItem[]>([]);
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payout-profile/admin/list`,
        {
          params: { kycStatus: status || undefined, keyword, page, limit: 10 },
          withCredentials: true,
        },
      );
      setItems(res.data.items);
      setTotalPages(res.data.totalPages);
    } catch (error) {
      console.error("Fetch error", error);
    } finally {
      setLoading(false);
    }
  }, [status, keyword, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (id: string) => {
    if (!confirm("Confirm approve?")) return;
    try {
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payout-profile/admin/approve/${id}`,
        {},
        { withCredentials: true },
      );
      toast({
        title: "Approve successfully!",
        variant: "success",
      });
      fetchData();
    } catch (err) {
      toast({
        title: "An error while approving",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Reject reason:");
    if (!reason) return;

    try {
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payout-profile/admin/reject/${id}`,
        { reason },
        { withCredentials: true },
      );
      toast({
        title: "Reject successfully!",
        variant: "success",
      });
      fetchData();
    } catch (err) {
      toast({
        title: "An error while approving",
        variant: "destructive",
      });
    }
  };

  const badgeColor = (s: KycStatus) => {
    switch (s) {
      case "pending":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "verified":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "rejected":
        return "bg-rose-100 text-rose-700 border-rose-200";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Payout Profile Management
            </h1>
            <p className="text-sm text-gray-500">
              To process the author&apos;s withdrawal profiles.
            </p>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-400 uppercase mb-1">
              Search
            </label>
            <input
              placeholder="Search by name, citizen ID..."
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="w-48">
            <label className="block text-xs font-medium text-gray-400 uppercase mb-1">
              Status
            </label>
            <select
              className="w-full border border-gray-300 p-2.5 rounded-lg outline-none cursor-pointer"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Author
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Personal Information
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Bank Information
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Citizen Images
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-center">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-20 text-gray-400">
                      Loading data...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-20 text-gray-400">
                      No payout profile yet.
                    </td>
                  </tr>
                ) : (
                  items.map((p) => (
                    <tr
                      key={p._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {p.user_info?.username || "N/A"}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {p.user_info?.email}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm">
                        <div className="font-semibold text-blue-800 uppercase">
                          {p.fullName}
                        </div>
                        <div className="text-gray-600">ID: {p.citizenId}</div>
                        <div className="text-gray-400 text-xs mt-1 italic">
                          {p.address}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium">{p.bankName}</div>
                        <div className="text-gray-600">{p.bankAccount}</div>
                        <div className="text-xs text-gray-400 uppercase italic">
                          {p.bankAccountName}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex gap-1.5">
                          {p.identityImages?.map((img, i) => (
                            <div
                              key={i}
                              className="w-10 h-10 rounded border overflow-hidden cursor-zoom-in hover:scale-110 transition-transform"
                              onClick={() =>
                                window.open(
                                  `${process.env.NEXT_PUBLIC_API_URL}/payout-identity/${p.user_info._id}/${img}`,
                                )
                              }
                            >
                              <img
                                src={`${process.env.NEXT_PUBLIC_API_URL}/payout-identity/${p.user_info._id}/${img}`}
                                className="w-full h-full object-cover"
                                alt="KYC"
                              />
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${badgeColor(p.kycStatus)}`}
                        >
                          {p.kycStatus.toUpperCase()}
                        </div>
                        {p.isHistory && (
                          <div className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-tighter">
                            Archive / History
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {p.isHistory ? (
                            <span className="text-[11px] text-gray-400 italic py-2">
                              No actions
                            </span>
                          ) : p.kycStatus === "pending" ? (
                            <>
                              <button
                                onClick={() => handleApprove(p._id)}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200"
                                title="Approve"
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleReject(p._id)}
                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                                title="Reject"
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400 font-medium py-2">
                              Processed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <span className="text-sm text-gray-500">
              Page {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Front
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
