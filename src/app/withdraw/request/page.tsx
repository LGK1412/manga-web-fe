"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import ImageBox from "@/components/image-box";
import { Card } from "@/components/ui/card";
import {
  InfoIcon,
  AlertCircle,
  CheckCircle2,
  Loader2,
  UploadCloud,
  X,
  FileText,
} from "lucide-react";

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
        title: "Gửi hồ sơ thành công",
        description: "Vui lòng chờ Admin xét duyệt.",
      });
      fetchProfile();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: err.response?.data?.message || "Không thể gửi hồ sơ",
      });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleResubmit = async () => {
    setLoadingAction(true);
    const form = new FormData();

    // Loại bỏ các trường thông tin dư thừa hoặc object phức tạp trước khi gửi
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
        title: "Cập nhật thành công",
        description: "Hồ sơ của bạn đã được gửi lại và đang chờ xét duyệt.",
      });

      setEditing(false);
      fetchProfile(); // Tải lại để lấy trạng thái 'pending' mới
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: err.response?.data?.message || "Không thể cập nhật hồ sơ",
      });
    } finally {
      setLoadingAction(false);
    }
  };

  async function withdraw() {
    try {
      await axios.post(
        `${apiBase}/api/withdraw`,
        { withdraw_point: points },
        { withCredentials: true },
      );
      toast({ title: "Đã tạo lệnh rút tiền" });
      fetchPoints();
    } catch (e) {
      toast({ variant: "destructive", title: "Lỗi rút tiền" });
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
            <p className="font-bold">Chưa có hồ sơ</p>
            <p className="text-sm opacity-90">
              Vui lòng nhập thông tin và gửi yêu cầu xác thực.
            </p>
          </div>
        </div>
      )}
      {/* 1. Trạng thái hồ sơ */}
      {kycStatus === "pending" && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
          <InfoIcon className="h-5 w-5 mt-0.5" />
          <div>
            <p className="font-bold">Đang chờ xét duyệt</p>
            <p className="text-sm opacity-90">
              Hồ sơ của bạn đang được Admin kiểm tra.
            </p>
          </div>
        </div>
      )}

      {kycStatus === "rejected" && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <AlertCircle className="h-5 w-5 mt-0.5" />
          <div>
            <p className="font-bold">Hồ sơ bị từ chối</p>
            <p className="text-sm opacity-90">
              Vui lòng kiểm tra và cập nhật lại thông tin chính xác.
            </p>
          </div>
        </div>
      )}

      {kycStatus === "verified" && (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          <CheckCircle2 className="h-5 w-5 mt-0.5" />
          <div>
            <p className="font-bold">Đã xác thực</p>
            <p className="text-sm opacity-90">
              Bạn đã có thể thực hiện rút tiền về ngân hàng.
            </p>
          </div>
        </div>
      )}

      {/* 2. CARD RÚT TIỀN */}
      <Card className="p-6 space-y-4">
        <h3 className="font-bold text-lg text-gray-800">Yêu cầu rút tiền</h3>
        <div>
          Total point: {points}
          <div>Available point: {availablePoints}</div>
        </div>
        <div className="flex gap-3">
          <Input
            type="number"
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            placeholder={`Khả dụng: ${availablePoints.toLocaleString()}đ`}
          />
          <Button
            disabled={kycStatus !== "verified" || points <= 0}
            onClick={withdraw}
          >
            Rút tiền
          </Button>
        </div>
      </Card>

      {/* 3. FORM THÔNG TIN (Dùng Grid để chia layout) */}
      <div
        className={`space-y-6 ${isReadOnly ? "opacity-70 pointer-events-none" : ""}`}
      >
        {/* Card Ngân hàng */}
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-lg text-gray-800 border-b pb-2">
            Thông tin ngân hàng
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-medium uppercase text-gray-500">
                Tên ngân hàng
              </label>
              <Input
                placeholder="Ví dụ: Vietcombank"
                value={profile.bankName}
                onChange={(e) =>
                  setProfile({ ...profile, bankName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase text-gray-500">
                Số tài khoản
              </label>
              <Input
                placeholder="0123456789"
                value={profile.bankAccount}
                onChange={(e) =>
                  setProfile({ ...profile, bankAccount: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase text-gray-500">
                Tên chủ tài khoản
              </label>
              <Input
                placeholder="NGUYEN VAN A"
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
            Thông tin định danh
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-3">
              <label className="text-xs font-medium uppercase text-gray-500">
                Ảnh CCCD 2 mặt (Bắt buộc)
              </label>

              <div className="flex gap-6 justify-center md:justify-start">
                <ImageBox
                  label="Mặt trước"
                  file={identityFiles[0]}
                  imageUrl={getIdentityImageUrl(0)}
                  onChange={(f) => setIdentityFiles([f, identityFiles[1]])}
                />

                <ImageBox
                  label="Mặt sau"
                  file={identityFiles[1]}
                  imageUrl={getIdentityImageUrl(1)}
                  onChange={(f) => setIdentityFiles([identityFiles[0], f])}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium uppercase text-gray-500">
                Họ và tên
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
                Mã số thuế
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
                Số CCCD
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
                Ngày sinh
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
                Địa chỉ
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
              "Gửi xét duyệt"
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
              "Cập nhật & Gửi lại"
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
            Chỉnh sửa thông tin
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
              Hủy
            </Button>
            <Button
              className="px-10 py-6 text-lg"
              onClick={handleResubmit}
              disabled={loadingAction}
            >
              {loadingAction ? (
                <Loader2 className="animate-spin mr-2" />
              ) : (
                "Xác nhận thay đổi"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
