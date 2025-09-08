"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Star, Eye, BookOpen, User } from "lucide-react"
import Link from "next/link"
import type { Story, User as UserType } from "@/lib/types"
import { mockStories, mockUsers } from "@/lib/data"

export default function SearchPage() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") || ""

  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [filteredStories, setFilteredStories] = useState<Story[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserType[]>([])
  const [activeTab, setActiveTab] = useState("stories")

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStories([])
      setFilteredUsers([])
      return
    }

    // Search stories
    const stories = mockStories.filter(
      (story) =>
        story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        story.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        story.author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        story.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        story.genre.some((genre) => genre.toLowerCase().includes(searchQuery.toLowerCase())),
    )

    // Search users
    const users = mockUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.bio?.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    // For search results, we'll keep a simple relevance based on initial filtering order
    setFilteredStories(stories)
    setFilteredUsers(users)
  }, [searchQuery])

  // No need for handleSearch form submission here, as the Navbar handles it.
  // The URL parameter `q` is read directly by `useSearchParams`.

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 pt-20">
        {" "}
        {/* Changed pt-16 to pt-20 */}
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Search Results</h1>

          {/* Search Info - simplified */}
          {searchQuery && (
            <p className="text-muted-foreground mb-4">
              Showing results for "{searchQuery}" - Found {filteredStories.length} stories and {filteredUsers.length}{" "}
              authors
            </p>
          )}
        </div>
        {/* Search Results */}
        {searchQuery ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="stories">Stories ({filteredStories.length})</TabsTrigger>
              <TabsTrigger value="authors">Authors ({filteredUsers.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="stories" className="mt-6">
              {filteredStories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredStories.map((story) => (
                    <Card key={story.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-[3/4] relative">
                        <img
                          src={story.coverImage || "/placeholder.svg"}
                          alt={story.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2">
                          <Badge variant={story.status === "completed" ? "default" : "secondary"}>{story.status}</Badge>
                        </div>
                      </div>

                      <CardHeader className="pb-2">
                        <CardTitle className="line-clamp-1 text-lg">{story.title}</CardTitle>
                        <CardDescription className="line-clamp-2 text-sm">{story.description}</CardDescription>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="flex items-center space-x-2 mb-3">
                          <img
                            src={story.author.avatar || "/placeholder.svg"}
                            alt={story.author.name}
                            className="w-5 h-5 rounded-full"
                          />
                          <span className="text-sm text-muted-foreground">{story.author.name}</span>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-3">
                          {story.genre.slice(0, 2).map((g) => (
                            <Badge key={g} variant="outline" className="text-xs">
                              {g}
                            </Badge>
                          ))}
                          {story.genre.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{story.genre.length - 2}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                          <div className="flex items-center space-x-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span>{story.rating}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Eye className="h-3 w-3" />
                            <span>{story.viewsCount.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <BookOpen className="h-3 w-3" />
                            <span>{story.chaptersCount}</span>
                          </div>
                        </div>

                        <Button size="sm" className="w-full" asChild>
                          <Link href={`/story/${story.id}`}>Read Now</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No stories found</h3>
                  <p className="text-muted-foreground">Try adjusting your search terms</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="authors" className="mt-6">
              {filteredUsers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredUsers.map((user) => (
                    <Card key={user.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                          {" "}
                          {/* Changed from flex-col to flex */}
                          <img
                            src={user.avatar || "/placeholder.svg"}
                            alt={user.name}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{user.name}</h3>
                            <p className="text-sm text-muted-foreground">{user.followersCount} followers</p>
                            {user.isAuthor && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                Author
                              </Badge>
                            )}
                          </div>
                        </div>

                        {user.bio && <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{user.bio}</p>}

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1 bg-transparent" asChild>
                            <Link href={`/profile/${user.id}`}>
                              {" "}
                              {/* Link to dynamic profile page */}
                              <User className="w-4 h-4 mr-2" />
                              View Profile
                            </Link>
                          </Button>
                          <Button size="sm" className="flex-1">
                            Follow
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No authors found</h3>
                  <p className="text-muted-foreground">Try adjusting your search terms</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Start searching</h3>
            <p className="text-muted-foreground">Enter a search term to find stories and authors</p>
          </div>
        )}
      </div>
    </div>
  )
}
