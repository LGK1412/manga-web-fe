"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import ImageBox from "@/components/image-box";
import { Card } from "@/components/ui/card";
import { InfoIcon, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

type KycStatus = "pending" | "verified" | "rejected" | "not_found";

export default function PayoutProfilePage() {
  const { toast } = useToast();
  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  // --- States ---
  const [profile, setProfile] = useState<any>({
    fullName: "",
    citizenId: "",
    dateOfBirth: "",
    address: "",
    taxCode: "",
    bankName: "",
    bankAccount: "",
    bankAccountName: "",
  });

  const [kycStatus, setKycStatus] = useState<KycStatus>("not_found");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [editing, setEditing] = useState(false);

  const [points, setPoints] = useState(0);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [preview, setPreview] = useState<any>(null);

  // Files state
  const [identityFiles, setIdentityFiles] = useState<(File | null)[]>([
    null,
    null,
  ]);

  const isReadOnly =
    kycStatus === "pending" || (kycStatus === "verified" && !editing);

  // --- Fetch Data ---
  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${apiBase}/api/payout-profile/me`, {
        withCredentials: true,
      });

      const data = res.data;
      setKycStatus(data.kycStatus);

      if (data.kycStatus === "not_found") {
        setProfile({
          fullName: "",
          citizenId: "",
          dateOfBirth: "",
          address: "",
          taxCode: "",
          bankName: "",
          bankAccount: "",
          bankAccountName: "",
        });
        return;
      }

      if (data.profile) {
        setProfile({
          ...data.profile,
          dateOfBirth: data.profile.dateOfBirth
            ? new Date(data.profile.dateOfBirth).toISOString().split("T")[0]
            : "",
        });
      }
    } catch (error) {
      console.error("Fetch profile error", error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchPoints = async () => {
    try {
      const res = await axios.get(`${apiBase}/api/user/point`, {
        withCredentials: true,
      });
      setPoints(res.data.author_point);
      setAvailablePoints(res.data.author_point - res.data.locked_point);
    } catch (e) {
      console.error(e);
    }
  };
  const getIdentityImageUrl = (index: number): string | undefined => {
    if (!profile?.identityImages?.[index]) return undefined;
    return `${apiBase}/payout-identity/${profile.userId?._id}/${profile.identityImages[index]}`;
  };

  useEffect(() => {
    fetchProfile();
    fetchPoints();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (Number(withdrawAmount) > 0) {
        handlePreview();
      } else {
        setPreview(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [withdrawAmount]);

  // --- Actions ---
  const submitProfile = async () => {
    setLoadingAction(true);
    const form = new FormData();

    // Append text fields
    Object.entries(profile).forEach(([k, v]) => {
      if (v && k !== "identityImages") {
        form.append(k, String(v));
      }
    });

    // Append files
    identityFiles.forEach((f) => f && form.append("identityImages", f));

    try {
      await axios.post(`${apiBase}/api/payout-profile/submit`, form, {
        withCredentials: true,
      });
      toast({
        title: "Submit successfully",
        description: "Please wait for approval",
      });
      fetchProfile();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description:
          err.response?.data?.message || "An error while submit request",
      });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleResubmit = async () => {
    setLoadingAction(true);
    const form = new FormData();
    const {
      _id,
      userId,
      kycStatus,
      createdAt,
      identityImages,
      ...restProfile
    } = profile;

    Object.entries(restProfile).forEach(([k, v]) => {
      if (v !== null && v !== undefined) {
        form.append(k, String(v));
      }
    });

    // Chỉ append files nếu người dùng thực sự chọn file mới
    identityFiles.forEach((f) => {
      if (f) form.append("identityImages", f);
    });

    try {
      await axios.patch(`${apiBase}/api/payout-profile/resubmit`, form, {
        withCredentials: true,
      });

      toast({
        title: "Update successfully",
        description: "Your profile has been resubmitted",
      });

      setEditing(false);
      fetchProfile(); // Tải lại để lấy trạng thái 'pending' mới
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: err.response?.data?.message || "Cannot update profile",
      });
    } finally {
      setLoadingAction(false);
    }
  };

  const handlePreview = async () => {
    try {
      const res = await axios.get(`${apiBase}/api/withdraw/preview`, {
        params: { points: withdrawAmount },
        withCredentials: true,
      });
      setPreview(res.data);
    } catch (error) {
      console.error("Preview error", error);
    }
  };

  async function withdraw() {
    try {
      const res = await axios.post(
        `${apiBase}/api/withdraw`,
        { withdraw_point: withdrawAmount },
        { withCredentials: true },
      );
      toast({ title: "Đã tạo lệnh rút tiền thành công" });
      setWithdrawAmount("");
      fetchPoints();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "An error while withdrawal",
        description: `${err.response?.data?.message}`,
      });
    }
  }

  if (loadingProfile)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-10 px-4">
      {kycStatus === "not_found" && (
        <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
          <InfoIcon className="h-5 w-5 mt-0.5" />
          <div>
            <p className="font-bold">No payout profile yet</p>
            <p className="text-sm opacity-90">
              Please enter your information and submit your request
            </p>
          </div>
        </div>
      )}
      {/* 1. Trạng thái hồ sơ */}
      {kycStatus === "pending" && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
          <InfoIcon className="h-5 w-5 mt-0.5" />
          <div>
            <p className="font-bold">Waiting for verifying</p>
            <p className="text-sm opacity-90">Your profile was in pending</p>
          </div>
        </div>
      )}

      {kycStatus === "rejected" && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <AlertCircle className="h-5 w-5 mt-0.5" />
          <div>
            <p className="font-bold">Your profile has been rejected</p>
            <p className="text-sm opacity-90">
              Please check your information again và resubmit
            </p>
          </div>
        </div>
      )}

      {/* 2. CARD RÚT TIỀN */}
      <Card className="p-6 space-y-6 border-teal-100 bg-gradient-to-br from-white to-teal-50/30 shadow-sm">
        {/* Header */}
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
              <div className="w-1.5 h-5 bg-teal-500 rounded-full" />
              Withdrawal request
            </h3>
            <p className="text-sm text-gray-500">
              Your request will be submitted and is awaiting approval.
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 uppercase font-semibold tracking-wider">
              Cumulative total
            </div>
            <div className="text-xl font-black text-teal-600">
              {points.toLocaleString()}{" "}
              <span className="text-xs font-normal text-gray-400">points</span>
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-teal-50 shadow-inner">
          <div className="md:col-span-2 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                Points amount to withdraw
              </label>
              <button
                onClick={() => setWithdrawAmount(String(availablePoints))}
                className="text-[11px] font-bold text-teal-600 hover:text-teal-700 hover:underline transition-all"
              >
                Use Max: {availablePoints.toLocaleString()} pts
              </button>
            </div>
            <Input
              type="text"
              inputMode="numeric"
              value={withdrawAmount}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setWithdrawAmount(val);
              }}
              placeholder="0"
              className="h-12 text-lg font-bold border-teal-100/50 focus:border-teal-500 focus:ring-teal-500 bg-white"
            />
          </div>

          <div className="flex items-end">
            <Button
              className="w-full h-12 text-md font-bold bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-600/20 transition-all active:scale-95 disabled:grayscale"
              disabled={
                kycStatus !== "verified" ||
                !withdrawAmount ||
                Number(withdrawAmount) <= 0 ||
                Number(withdrawAmount) > availablePoints
              }
              onClick={withdraw}
            >
              Confirm Withdrawal
            </Button>
          </div>
        </div>

        {preview && (
          <div className="relative overflow-hidden group">
            <div className="absolute inset-0 bg-teal-500/5 animate-pulse rounded-xl" />
            <div className="relative p-4 rounded-xl border border-teal-100/50 bg-white/40 space-y-3">
              <div className="flex justify-between text-sm items-center">
                <span className="text-gray-500 font-medium">
                  Estimated Gross:
                </span>
                <span className="font-bold text-gray-700">
                  {preview.grossAmount.toLocaleString()}đ
                </span>
              </div>

              {preview.taxAmount > 0 && (
                <div className="flex justify-between text-sm items-start pt-2 border-t border-teal-100/30">
                  <div className="flex flex-col">
                    <span className="text-red-500 font-medium flex items-center gap-1">
                      Personal Income Tax ({preview.taxRate * 100}%)
                    </span>
                    <span className="text-[10px] text-gray-400 leading-tight max-w-[200px]">
                      {preview.taxLegalRef}
                    </span>
                  </div>
                  <span className="font-bold text-red-500">
                    -{preview.taxAmount.toLocaleString()}đ
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t-2 border-white">
                <span className="font-bold text-gray-800">Net to receive:</span>
                <div className="text-right">
                  <span className="text-xl font-black text-teal-600 tracking-tight">
                    {preview.netAmount.toLocaleString()}đ
                  </span>
                  <p className="text-[10px] text-gray-400 font-medium italic">
                    * Final amount may vary slightly
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {kycStatus !== "verified" && (
          <div className="flex items-center justify-center gap-2 py-2 px-4 bg-red-50 rounded-lg border border-red-100">
            <div className="w-1 h-1 bg-red-500 rounded-full animate-ping" />
            <p className="text-[11px] text-red-600 font-semibold uppercase tracking-wide">
              Verification Required: Please complete your Payout Profile to
              withdraw.
            </p>
          </div>
        )}
      </Card>

      {/* 3. FORM THÔNG TIN (Dùng Grid để chia layout) */}
      <div
        className={`space-y-6 ${isReadOnly ? "opacity-70 pointer-events-none" : ""}`}
      >
        {/* Card Ngân hàng */}
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-lg text-gray-800 border-b pb-2">
            Bank Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-medium uppercase text-gray-500">
                Bank name
              </label>
              <Input
                placeholder="Enter bank name... (ect: Techcombank)"
                value={profile.bankName}
                onChange={(e) =>
                  setProfile({ ...profile, bankName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase text-gray-500">
                Account number
              </label>
              <Input
                placeholder="ect: 0123456789"
                value={profile.bankAccount}
                onChange={(e) =>
                  setProfile({ ...profile, bankAccount: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase text-gray-500">
                Account name
              </label>
              <Input
                placeholder="ect: NGUYEN VAN A"
                value={profile.bankAccountName}
                onChange={(e) =>
                  setProfile({ ...profile, bankAccountName: e.target.value })
                }
              />
            </div>
          </div>
        </Card>

        {/* Card Thông tin định danh */}
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-lg text-gray-800 border-b pb-2">
            Identification information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-3">
              <label className="text-xs font-medium uppercase text-gray-500">
                Photos of both sides of the Citizen Identification Card
              </label>

              <div className="flex gap-6 justify-center md:justify-start">
                <ImageBox
                  label="Front side"
                  file={identityFiles[0]}
                  imageUrl={getIdentityImageUrl(0)}
                  onChange={(f) => setIdentityFiles([f, identityFiles[1]])}
                />

                <ImageBox
                  label="Back side"
                  file={identityFiles[1]}
                  imageUrl={getIdentityImageUrl(1)}
                  onChange={(f) => setIdentityFiles([identityFiles[0], f])}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium uppercase text-gray-500">
                Fullname
              </label>
              <Input
                value={profile.fullName}
                onChange={(e) =>
                  setProfile({ ...profile, fullName: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase text-gray-500">
                Tax code
              </label>
              <Input
                value={profile.taxCode}
                onChange={(e) =>
                  setProfile({ ...profile, taxCode: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase text-gray-500">
                Citizen ID Number
              </label>
              <Input
                value={profile.citizenId}
                onChange={(e) =>
                  setProfile({ ...profile, citizenId: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase text-gray-500">
                Date of birth
              </label>
              <Input
                type="date"
                value={profile.dateOfBirth}
                onChange={(e) =>
                  setProfile({ ...profile, dateOfBirth: e.target.value })
                }
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-medium uppercase text-gray-500">
                Address
              </label>
              <Input
                value={profile.address}
                onChange={(e) =>
                  setProfile({ ...profile, address: e.target.value })
                }
              />
            </div>
          </div>
        </Card>
      </div>

      {/* 4. Action Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        {/* NOT FOUND */}
        {kycStatus === "not_found" && (
          <Button
            className="px-10 py-6 text-lg"
            onClick={submitProfile}
            disabled={loadingAction}
          >
            {loadingAction ? (
              <Loader2 className="animate-spin mr-2" />
            ) : (
              "Submit"
            )}
          </Button>
        )}

        {/* REJECTED */}
        {kycStatus === "rejected" && (
          <Button
            className="px-10 py-6 text-lg bg-red-600 hover:bg-red-700"
            onClick={handleResubmit}
            disabled={loadingAction}
          >
            {loadingAction ? (
              <Loader2 className="animate-spin mr-2" />
            ) : (
              "Update and resubmit"
            )}
          </Button>
        )}

        {/* VERIFIED */}
        {kycStatus === "verified" && !editing && (
          <Button
            variant="outline"
            className="px-10 py-6 text-lg"
            onClick={() => setEditing(true)}
          >
            Update information
          </Button>
        )}

        {kycStatus === "verified" && editing && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="px-6 py-6"
              onClick={() => {
                setEditing(false);
                fetchProfile(); // Reset lại dữ liệu cũ
              }}
              disabled={loadingAction}
            >
              Cancel
            </Button>
            <Button
              className="px-10 py-6 text-lg"
              onClick={handleResubmit}
              disabled={loadingAction}
            >
              {loadingAction ? (
                <Loader2 className="animate-spin mr-2" />
              ) : (
                "Change confirm"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
