"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react" // Import useRef
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { UserIcon, Mail, Plus } from "lucide-react" // Import Plus icon

export default function EditProfilePage() {
  const { user, isLoading, updateProfile } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [bio, setBio] = useState("")
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null) // State for local image preview
  const [selectedFile, setSelectedFile] = useState<File | null>(null) // State to hold the selected file
  const [isSaving, setIsSaving] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null) // Ref for the hidden file input

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login") // Redirect to login if not authenticated
    } else if (user) {
      setName(user.name)
      setEmail(user.email)
      setBio(user.bio || "")
      setAvatarPreview(user.avatar || null) // Set initial avatar preview from user data
    }
  }, [user, isLoading, router])

  const handleAvatarClick = () => {
    fileInputRef.current?.click() // Trigger click on hidden file input
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setAvatarPreview(URL.createObjectURL(file)) // Create a local URL for preview
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSaving(true)
    try {
      // In a real app, you would upload `selectedFile` to a storage service
      // and get a public URL back. For this demo, we'll just use the local preview URL
      // or the existing avatar URL if no new file was selected.
      const newAvatarUrl = selectedFile ? avatarPreview : user.avatar // Use local preview or existing URL

      await updateProfile({ name, email, bio, avatar: newAvatarUrl || undefined }) // Pass the new avatar URL

      toast({
        title: "Profile updated!",
        description: "Your profile has been successfully updated.",
      })
      router.push("/profile")
    } catch (error) {
      toast({
        title: "Failed to update profile",
        description: "There was an error updating your profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading profile editor...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 pt-20">
        {" "}
        {/* Changed pt-16 to pt-20 */}
        <h1 className="text-3xl font-bold mb-8">Edit Profile</h1>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Update Your Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={avatarPreview || "/placeholder.svg?height=96&width=96&text=User"} alt={name} />
                    <AvatarFallback className="text-4xl">{name.charAt(0)}</AvatarFallback>
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
                <p className="text-sm text-muted-foreground">Click avatar to change</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
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
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  rows={5}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
