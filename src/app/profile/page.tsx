"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Heart, History, UserIcon, PenTool, Star } from "lucide-react"
import Link from "next/link"
// Mock data removed - will be replaced with real API calls
import { useRouter } from "next/navigation"

export default function ProfilePage() {
  const { user, isLoading, updateProfile } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [isAuthorRole, setIsAuthorRole] = useState(user?.isAuthor || false)
  const [readingHistory, setReadingHistory] = useState<any[]>([])
  const [favoriteStories, setFavoriteStories] = useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login") // Redirect to login if not authenticated
    }
    if (user) {
      setIsAuthorRole(user.isAuthor)
      // TODO: Load user's reading history and favorite stories from API
      // For now, set empty arrays to prevent errors
      setReadingHistory([])
      setFavoriteStories([])
    }
  }, [user, isLoading, router])

  const handleRoleChange = async (checked: boolean) => {
    if (!user) return

    setIsAuthorRole(checked)
    try {
      await updateProfile({ isAuthor: checked })
      toast({
        title: "Role updated!",
        description: `You are now a${checked ? "n Author" : " User"}.`,
      })
    } catch (error) {
      toast({
        title: "Failed to update role",
        description: "Please try again later.",
        variant: "destructive",
      })
      setIsAuthorRole(!checked) // Revert if update fails
    }
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 pt-20">
        {" "}
        {/* Changed pt-16 to pt-20 */}
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* User Info Card */}
          <Card className="lg:col-span-1">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <Avatar className="w-24 h-24 mb-4">
                <AvatarImage src={user.avatar || "/placeholder.svg?height=96&width=96&text=User"} alt={user.name} />
                <AvatarFallback className="text-4xl">{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold mb-1">{user.name}</h2>
              <p className="text-muted-foreground mb-4">{user.email}</p>

              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary">
                  {user.isAuthor ? (
                    <>
                      <PenTool className="w-3 h-3 mr-1" /> Author
                    </>
                  ) : (
                    <>
                      <UserIcon className="w-3 h-3 mr-1" /> Reader
                    </>
                  )}
                </Badge>
              </div>

              <div className="flex gap-6 mb-6">
                <div>
                  <p className="text-lg font-semibold">{user.followersCount}</p>
                  <p className="text-sm text-muted-foreground">Followers</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{user.followingCount}</p>
                  <p className="text-sm text-muted-foreground">Following</p>
                </div>
              </div>

              {user.bio && <p className="text-sm text-muted-foreground mb-6">{user.bio}</p>}

              <Button className="w-full mb-4" asChild>
                <Link href="/profile/edit">Edit Profile</Link>
              </Button>

              <Separator className="w-full mb-4" />

              {/* Role Switch */}
              <div className="flex items-center justify-between w-full">
                <Label htmlFor="author-mode" className="text-base font-medium">
                  Switch to Author Mode
                </Label>
                <Switch
                  id="author-mode"
                  checked={isAuthorRole}
                  onCheckedChange={handleRoleChange}
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-left w-full">
                {isAuthorRole
                  ? "You are currently an author. You can write and publish stories."
                  : "You are currently a reader. Switch to author mode to start writing."}
              </p>
            </CardContent>
          </Card>

          {/* Reading History & Favorites */}
          <div className="lg:col-span-2 space-y-8">
            {/* Reading History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" /> Reading History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {readingHistory.length > 0 ? (
                  readingHistory.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted">
                      <img
                        src={item.coverImage || "/placeholder.svg"}
                        alt={item.title}
                        className="w-12 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium line-clamp-1">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.author}</p>
                        <p className="text-xs text-muted-foreground">
                          Progress: {item.progress}% • Last read: {item.lastRead}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/story/${item.id}`}>Continue</Link>
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">No reading history found.</div>
                )}
              </CardContent>
            </Card>

            {/* Favorite Stories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5" /> Favorite Stories
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {favoriteStories.length > 0 ? (
                  favoriteStories.map((story) => (
                    <Link key={story.id} href={`/story/${story.id}`} className="block">
                      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="flex">
                          <img
                            src={story.coverImage || "/placeholder.svg"}
                            alt={story.title}
                            className="w-24 h-32 object-cover flex-shrink-0"
                          />
                          <div className="p-4 flex flex-col justify-between flex-grow">
                            <div>
                              <h3 className="font-semibold line-clamp-2">{story.title}</h3>
                              <p className="text-sm text-muted-foreground">{story.author}</p>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span>{story.rating}</span>
                              <Badge variant="outline" className="ml-auto text-xs">
                                {story.genre}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground col-span-full">No favorite stories found.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
