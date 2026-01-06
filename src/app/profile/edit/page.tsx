"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { UserIcon, Mail, Plus, FileText } from "lucide-react";
import Cookies from "js-cookie";
import axios from "axios";

export default function EditProfilePage() {
  const { toast } = useToast();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null); // State for local image preview
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // State to hold the selected file
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for the hidden file input

  useEffect(() => {
    const raw = Cookies.get("user_normal_info");
    if (!raw) {
      router.push("/login");
      return;
    }
    try {
      const decoded = decodeURIComponent(raw);
      const parsed = JSON.parse(decoded);
      setName(parsed.username || "User");
      setEmail(parsed.email || "");
      setBio(parsed.bio || "");
      // Hiển thị avatar với full URL nếu có
      if (parsed.avatar && parsed.avatar !== "avatar-default.webp") {
        setAvatarPreview(
          `${process.env.NEXT_PUBLIC_API_URL}/assets/avatars/${parsed.avatar}`
        );
      } else {
        setAvatarPreview(null);
      }
    } catch {
      router.push("/login");
    }
  }, [router]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click(); // Trigger click on hidden file input
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAvatarPreview(URL.createObjectURL(file)); // Create a local URL for preview
    }
  };

  const MAX_BIO_CHARS = 200;

  const handleBioChange = (value: string) => {
    if (value.length <= MAX_BIO_CHARS) {
      setBio(value);
    } else {
      setBio(value.slice(0, MAX_BIO_CHARS));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // --- Validation ---
  if (name.length < 3 || name.length > 30) {
    toast({
      title: "Invalid name",
      description: "Name must be between 3 and 30 characters",
      variant: "destructive",
    });
    return; // dừng, không gọi API
  }

  const bioCharCount = bio.length;
  if (bioCharCount > MAX_BIO_CHARS) {
    toast({
      title: "Description too long",
      description: `Description must not exceed ${MAX_BIO_CHARS} characters`,
      variant: "destructive",
    });
    return; // dừng, không gọi API
  }
  // -------------------

  setIsSaving(true);
  try {
    const formData = new FormData();
    formData.append("username", name);
    formData.append("bio", bio);
    if (selectedFile) {
      formData.append("avatar", selectedFile);
    }

    const res = await axios.patch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/user/profile`,
      formData,
      {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      }
    );

    // cập nhật lại cookie
    const raw = Cookies.get("user_normal_info");
    const parsed = raw ? JSON.parse(decodeURIComponent(raw)) : null;

    if (parsed) {
      const serverUser = (res as any)?.data?.user;
      const serverAvatar: string | undefined = serverUser?.avatar;
      const updated = {
        user_id: parsed.user_id,
        email: parsed.email,
        username: name || parsed.username,
        role: parsed.role,
        avatar: serverAvatar !== undefined ? serverAvatar : parsed.avatar,
        bio: bio || parsed.bio,
      };
      Cookies.set("user_normal_info", JSON.stringify(updated), {
        expires: 360,
        path: "/",
      });
    }

    toast({
      title: "Profile updated successfully",
      description: "Your profile has been updated successfully",
      variant: "success",
    });

    const userId = parsed?.user_id;
    if (userId) {
      router.push(`/profile/${userId}`);
    } else {
      router.push("/login");
    }
  } catch (error) {
    let errorMessage = "Unable to update profile. Please try again.";

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        errorMessage = "Session expired. Please log in again";
        toast({
          title: "Session expired",
          description: errorMessage,
          variant: "destructive",
        });
        router.push("/login");
        return;
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.message || "Invalid data";
      } else if (error.response?.status === 413) {
        errorMessage = "Image file too large. Please choose a file smaller than 5MB";
      } else if (error.response?.status === 500) {
        errorMessage = "Server error, please try again later";
      } else if (error.message === "Network Error") {
        errorMessage = "Unable to connect to server";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
    }

    toast({
      title: "Error updating profile",
      description: errorMessage,
      variant: "destructive",
    });
  } finally {
    setIsSaving(false);
  }
};


  // Render form directly; access control handled via cookie in useEffect

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 pt-20">
        <h1 className="text-3xl font-bold mb-8">Edit Profile</h1>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Update Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div
                  className="relative group cursor-pointer"
                  onClick={handleAvatarClick}
                >
                  <Avatar className="w-24 h-24">
                    <AvatarImage
                      src={
                        avatarPreview ||
                        "/placeholder.svg?height=96&width=96&text=User"
                      }
                      alt={name}
                    />
                    <AvatarFallback className="text-4xl">
                      {name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="h-8 w-8 text-white" />
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Click to edit avatar
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter username"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 bg-gray-200"
                    readOnly
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 transform h-4 w-4 text-muted-foreground" />
                  <textarea
                    id="bio"
                    placeholder={`Enter bio (max ${MAX_BIO_CHARS} characters)`}
                    value={bio}
                    onChange={(e) => handleBioChange(e.target.value)}
                    maxLength={MAX_BIO_CHARS}
                    className="pl-10 pr-3 py-2 min-h-[80px] w-full rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-right">
                  {bio.length}/{MAX_BIO_CHARS} characters
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
