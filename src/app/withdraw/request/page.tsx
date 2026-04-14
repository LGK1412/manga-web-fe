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
  Loader2,
  CalendarIcon,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

type KycStatus = "pending" | "verified" | "rejected" | "not_found";

export default function PayoutProfilePage() {
  const { toast } = useToast();
  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  const banks = [
    { label: "Vietcombank", value: "vietcombank" },
    { label: "Techcombank", value: "techcombank" },
    { label: "BIDV", value: "bidv" },
    { label: "VietinBank", value: "vietinbank" },
    { label: "MB Bank", value: "mbbank" },
    { label: "ACB", value: "acb" },
    { label: "VPBank", value: "vpbank" },
    { label: "TPBank", value: "tpbank" },
    { label: "Sacombank", value: "sacombank" },
    { label: "HDBank", value: "hdbank" },
    { label: "OCB", value: "ocb" },
    { label: "SHB", value: "shb" },
    { label: "VIB", value: "vib" },
  ];

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

  const [openBank, setOpenBank] = useState(false);
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
        variant: "success",
      });
      fetchProfile();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error while submitting",
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
      fetchProfile();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error while updating",
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
        { withdraw_point: Number(withdrawAmount) },
        { withCredentials: true },
      );

      toast({
        title: "Request withdrawal successfully",
        description: `Your request have been sent`,
        variant: "success",
      });
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
    <div className="max-w-6xl mx-auto py-10 px-4 min-h-screen bg-gray-50/30 space-y-8">
      <div className="space-y-6">
        <div className="space-y-3">
          {kycStatus === "not_found" && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex gap-3">
              <InfoIcon className="h-5 w-5 shrink-0" />
              <p>
                <b>Profile Incomplete:</b> You need to submit your information
                before you can withdraw funds.
              </p>
            </div>
          )}
          {kycStatus === "pending" && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-sm flex gap-3 italic">
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
              <p>Your verification is currently being reviewed by our team.</p>
            </div>
          )}
          {kycStatus === "rejected" && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm flex gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>
                <b>Rejected:</b> Please check your details and re-upload clear
                photos.
              </p>
            </div>
          )}
        </div>
      </div>
      <Card className="top-6 p-6 space-y-6 border-none shadow-lg ring-1 ring-teal-500/10 overflow-hidden bg-white">
        <div className="absolute top-0 right-0 p-8 bg-teal-500/5 rounded-full -mr-10 -mt-10" />

        <div className="relative space-y-4">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-gray-800">Withdrawal</h3>
            <div className="text-right">
              <p className="text-[15px] font-bold text-gray-400 uppercase">
                Available Balance
              </p>
              <p className="text-lg font-black text-teal-600 leading-none">
                {points.toLocaleString()}{" "}
                <span className="text-[10px] font-medium">PTS</span>
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-gray-500 uppercase">
                Amount
              </label>
              <button
                onClick={() => setWithdrawAmount(String(availablePoints))}
                className="text-[15px] font-bold text-teal-600 hover:underline"
              >
                Max: {availablePoints.toLocaleString()}
              </button>
            </div>
            <Input
              type="text"
              inputMode="numeric"
              value={withdrawAmount}
              onChange={(e) =>
                setWithdrawAmount(e.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder="0"
              className="h-10 text-base font-bold text-gray-700 border-gray-100 bg-gray-50/50"
            />
          </div>

          {/* Preview Box */}
          {preview && (
            <div className="p-3 bg-gray-50 rounded-lg space-y-2 border border-gray-100">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Gross Amount</span>
                <span className="font-semibold text-gray-800">
                  {preview.grossAmount.toLocaleString()}đ
                </span>
              </div>
              {preview.taxAmount > 0 && (
                <div className="flex justify-between text-xs text-red-500">
                  <span className="flex items-center gap-1">
                    PIT ({preview.taxRate * 100}%)
                  </span>
                  <span>-{preview.taxAmount.toLocaleString()}đ</span>
                </div>
              )}
              <div className="pt-2 border-t border-dashed border-gray-200 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-700">
                  Net Receive
                </span>
                <span className="text-lg font-black text-teal-600 tracking-tight">
                  {preview.netAmount.toLocaleString()}đ
                </span>
              </div>
            </div>
          )}

          <Button
            className="w-full py-6 text-lg font-bold shadow-lg hover:scale-[1.02] transition-all"
            disabled={
              kycStatus !== "verified" ||
              !withdrawAmount ||
              Number(withdrawAmount) <= 0 ||
              Number(withdrawAmount) > availablePoints
            }
            onClick={withdraw}
          >
            Confirm & Withdraw
          </Button>

          {kycStatus === "verified" && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Update payout settings?
            </button>
          )}
        </div>
      </Card>
      <div className="space-y-8">
        {/* Section: Identity Documents */}
        <section
          className={`space-y-4 ${isReadOnly ? "opacity-60 pointer-events-none" : ""}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-bold text-gray-800">
              Identity Verification
            </h3>
            <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-[10px] font-bold uppercase rounded-full">
              Required
            </span>
          </div>

          <Card className="p-6 border-none shadow-sm ring-1 ring-gray-200">
            <p className="text-sm text-gray-500 mb-6">
              Upload clear photos of both sides of your National ID/Citizen ID
              card.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="space-y-3 text-center md:text-left">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Front Side
                </label>
                <div className="aspect-[1.6/1] w-full max-w-[320px] mx-auto md:mx-0">
                  <ImageBox
                    label="Drop Front Image"
                    file={identityFiles[0]}
                    imageUrl={getIdentityImageUrl(0)}
                    onChange={(f) => setIdentityFiles([f, identityFiles[1]])}
                    className="w-full h-full rounded-xl border-2 border-dashed border-gray-200 hover:border-teal-400 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-3 text-center md:text-left">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Back Side
                </label>
                <div className="aspect-[1.6/1] w-full max-w-[320px] mx-auto md:mx-0">
                  <ImageBox
                    label="Drop Back Image"
                    file={identityFiles[1]}
                    imageUrl={getIdentityImageUrl(1)}
                    onChange={(f) => setIdentityFiles([identityFiles[0], f])}
                    className="w-full h-full rounded-xl border-2 border-dashed border-gray-200 hover:border-teal-400 transition-colors"
                  />
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Section: Form Fields */}
        <section
          className={`space-y-6 ${isReadOnly ? "opacity-60 pointer-events-none" : ""}`}
        >
          <Card className="p-8 border-none shadow-sm ring-1 ring-gray-200 space-y-8">
            {/* Bank Info */}
            <div className="space-y-4">
              <h4 className="font-bold text-gray-700 flex items-center gap-2">
                <div className="w-1 h-4 bg-blue-500 rounded-full" />
                Bank Account Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500">
                    Bank Name
                  </label>

                  <Popover open={openBank} onOpenChange={setOpenBank}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openBank}
                        className="w-full justify-between"
                      >
                        {profile.bankName
                          ? banks.find(
                              (bank) => bank.value === profile.bankName,
                            )?.label
                          : "Select bank..."}

                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search bank..." />

                        <CommandEmpty>No bank found.</CommandEmpty>

                        <CommandGroup>
                          {banks.map((bank) => (
                            <CommandItem
                              key={bank.value}
                              value={bank.label}
                              onSelect={() => {
                                setProfile({
                                  ...profile,
                                  bankName: bank.value,
                                });

                                setOpenBank(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  profile.bankName === bank.value
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />

                              {bank.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500">
                    Account Number
                  </label>

                  <Input
                    value={profile.bankAccount
                      ?.replace(/\s/g, "")
                      .replace(/(.{4})/g, "$1 ")
                      .trim()}
                    onChange={(e) => {
                      const raw = e.target.value
                        .replace(/\s/g, "")
                        .replace(/\D/g, "");

                      setProfile({
                        ...profile,
                        bankAccount: raw,
                      });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500">
                    Account Holder Name
                  </label>

                  <Input
                    value={profile.bankAccountName}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        bankAccountName: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Personal Info */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h4 className="font-bold text-gray-700 flex items-center gap-2">
                <div className="w-1 h-4 bg-teal-500 rounded-full" />
                Personal Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500">
                    Full Name
                  </label>
                  <Input
                    value={profile.fullName}
                    onChange={(e) =>
                      setProfile({ ...profile, fullName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500">
                    Tax Code
                  </label>
                  <Input
                    value={profile.taxCode}
                    onChange={(e) =>
                      setProfile({ ...profile, taxCode: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500">
                    Citizen ID Number
                  </label>
                  <Input
                    value={profile.citizenId}
                    onChange={(e) =>
                      setProfile({ ...profile, citizenId: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500">
                    Date of Birth
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {profile.dateOfBirth
                          ? format(new Date(profile.dateOfBirth), "PPP")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={
                          profile.dateOfBirth
                            ? new Date(profile.dateOfBirth)
                            : undefined
                        }
                        onSelect={(date) =>
                          setProfile({
                            ...profile,
                            dateOfBirth: date?.toISOString().split("T")[0],
                          })
                        }
                        captionLayout="dropdown"
                        fromYear={1950}
                        toYear={new Date().getFullYear()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500">
                    Registered Address
                  </label>
                  <Input
                    value={profile.address}
                    onChange={(e) =>
                      setProfile({ ...profile, address: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Form Actions */}
          {!isReadOnly && (
            <div className="flex justify-end items-center gap-4">
              {editing && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    fetchProfile();
                  }}
                >
                  Discard Changes
                </Button>
              )}
              <Button
                className="px-8 bg-gray-900 hover:bg-black text-white"
                onClick={
                  kycStatus === "rejected" || editing
                    ? handleResubmit
                    : submitProfile
                }
                disabled={loadingAction}
              >
                {loadingAction ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Submit Profile Information"
                )}
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
