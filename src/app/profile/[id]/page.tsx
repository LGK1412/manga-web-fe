"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { UserIcon, PenTool, BookOpen, UserPlus, Star, Eye } from "lucide-react"
import Link from "next/link"
import type { User as UserType, Story } from "@/lib/types"

export default function UserProfilePage({ params }: { params: { id: string } }) {
  // const { toast } = useToast()
  // const [profileUser, setProfileUser] = useState<UserType | null>(null)
  // const [isFollowing, setIsFollowing] = useState(false)
  // const [userStories, setUserStories] = useState<Story[]>([])

  // useEffect(() => {
  //   const foundUser = mockUsers.find((u) => u.id === params.id)
  //   if (foundUser) {
  //     setProfileUser(foundUser)
  //     // Simulate initial follow status (e.g., check if current user follows this profileUser)
  //     // For now, default to false
  //     setIsFollowing(false)

  //     // Filter stories by this author
  //     if (foundUser.isAuthor) {
  //       const storiesByAuthor = mockStories.filter((story) => story.author.id === foundUser.id)
  //       setUserStories(storiesByAuthor)
  //     } else {
  //       setUserStories([])
  //     }
  //   } else {
  //     // Handle user not found, e.g., redirect to a 404 page or show an error
  //     toast({
  //       title: "User not found",
  //       description: "The profile you are looking for does not exist.",
  //       variant: "destructive",
  //     })
  //     // Optionally redirect
  //     // router.push('/404');
  //   }
  // }, [params.id, toast])

  // const handleFollowToggle = () => {
  //   if (!profileUser) return
  //   setIsFollowing(!isFollowing)
  //   toast({
  //     title: isFollowing ? "Unfollowed" : "Following",
  //     description: isFollowing ? `You unfollowed ${profileUser.name}` : `You are now following ${profileUser.name}`,
  //   })
  // }

  // if (!profileUser) {
  //   return (
  //     <div className="min-h-screen bg-background flex items-center justify-center">
  //       <p>Loading user profile...</p>
  //     </div>
  //   )
  // }

  // return (
  //   <div className="min-h-screen bg-background">
  //     <Navbar />

  //     <div className="container mx-auto px-4 py-8 pt-20">
  //       {" "}
  //       {/* Changed pt-16 to pt-20 */}
  //       <h1 className="text-3xl font-bold mb-8">User Profile</h1>
  //       <div className="grid lg:grid-cols-3 gap-8">
  //         {/* User Info Card */}
  //         <Card className="lg:col-span-1">
  //           <CardContent className="p-6 flex flex-col items-center text-center">
  //             <Avatar className="w-24 h-24 mb-4">
  //               <AvatarImage
  //                 src={profileUser.avatar || "/placeholder.svg?height=96&width=96&text=User"}
  //                 alt={profileUser.name}
  //               />
  //               <AvatarFallback className="text-4xl">{profileUser.name.charAt(0)}</AvatarFallback>
  //             </Avatar>
  //             <h2 className="text-2xl font-bold mb-1">{profileUser.name}</h2>
  //             <p className="text-muted-foreground mb-4">{profileUser.email}</p>

  //             <div className="flex items-center gap-2 mb-4">
  //               <Badge variant="secondary">
  //                 {profileUser.isAuthor ? (
  //                   <>
  //                     <PenTool className="w-3 h-3 mr-1" /> Author
  //                   </>
  //                 ) : (
  //                   <>
  //                     <UserIcon className="w-3 h-3 mr-1" /> Reader
  //                   </>
  //                 )}
  //               </Badge>
  //             </div>

  //             <div className="flex gap-6 mb-6">
  //               <div>
  //                 <p className="text-lg font-semibold">{profileUser.followersCount}</p>
  //                 <p className="text-sm text-muted-foreground">Followers</p>
  //               </div>
  //               <div>
  //                 <p className="text-lg font-semibold">{profileUser.followingCount}</p>
  //                 <p className="text-sm text-muted-foreground">Following</p>
  //               </div>
  //             </div>

  //             {profileUser.bio && <p className="text-sm text-muted-foreground mb-6">{profileUser.bio}</p>}

  //             <Button
  //               className="w-full mb-4"
  //               onClick={handleFollowToggle}
  //               variant={isFollowing ? "outline" : "default"}
  //             >
  //               <UserPlus className="w-4 h-4 mr-2" />
  //               {isFollowing ? "Following" : "Follow"}
  //             </Button>

  //             {/* No Edit Profile or Role Switch for other users */}
  //           </CardContent>
  //         </Card>

  //         {/* Stories by this Author (if applicable) */}
  //         <div className="lg:col-span-2 space-y-8">
  //           {profileUser.isAuthor && (
  //             <Card>
  //               <CardHeader>
  //                 <CardTitle className="flex items-center gap-2">
  //                   <BookOpen className="w-5 h-5" /> Stories by {profileUser.name}
  //                 </CardTitle>
  //               </CardHeader>
  //               <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
  //                 {userStories.length > 0 ? (
  //                   userStories.map((story) => (
  //                     <Link key={story.id} href={`/story/${story.id}`} className="block">
  //                       <Card className="overflow-hidden hover:shadow-lg transition-shadow">
  //                         <div className="flex">
  //                           <img
  //                             src={story.coverImage || "/placeholder.svg"}
  //                             alt={story.title}
  //                             className="w-24 h-32 object-cover flex-shrink-0"
  //                           />
  //                           <div className="p-4 flex flex-col justify-between flex-grow">
  //                             <div>
  //                               <h3 className="font-semibold line-clamp-2">{story.title}</h3>
  //                               <p className="text-sm text-muted-foreground">{story.author.name}</p>
  //                             </div>
  //                             <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
  //                               <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
  //                               <span>{story.rating}</span>
  //                               <Eye className="w-4 h-4 ml-2" />
  //                               <span>{story.viewsCount.toLocaleString()}</span>
  //                               <Badge variant="outline" className="ml-auto text-xs">
  //                                 {story.genre[0]}
  //                               </Badge>
  //                             </div>
  //                           </div>
  //                         </div>
  //                       </Card>
  //                     </Link>
  //                   ))
  //                 ) : (
  //                   <div className="text-center py-6 text-muted-foreground col-span-full">
  //                     {profileUser.name} has not published any stories yet.
  //                   </div>
  //                 )}
  //               </CardContent>
  //             </Card>
  //           )}

  //           {/* You can add other sections here, e.g., comments by this user, etc. */}
  //         </div>
  //       </div>
  //     </div>
  //   </div>
  // )
}
