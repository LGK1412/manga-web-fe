"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { StoryCarousel } from "@/components/story-carousel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Star, Eye, BookOpen } from "lucide-react"
import { mangaAPI, getImageUrl } from "@/lib/api"
import type { Story } from "@/lib/types"

export default function HomePage() {
  const [stories, setStories] = useState<Story[]>([])
  const [trendingStories, setTrendingStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMangaData = async () => {
      // try {
      //   setLoading(true)
      //   const response = await mangaAPI.getMangaData()
        
      //   if (response.data.success) {
      //     // Transform backend data to frontend Story format
      //     const transformMangaToStory = (manga: any): Story => ({
      //       id: manga._id,
      //       title: manga.name,
      //       description: manga.description,
      //       coverImage: getImageUrl(manga.image, 'thumbnail'),
      //       author: {
      //         id: manga.author._id,
      //         email: manga.author.email,
      //         name: manga.author.name,
      //         avatar: getImageUrl(manga.author.avatar, 'avatar'),
      //         bio: "",
      //         isAuthor: manga.author.role === 'author',
      //         followersCount: 0,
      //         followingCount: 0,
      //         createdAt: manga.author.createdAt,
      //       },
      //       genre: manga.categories?.map((cat: any) => cat.name) || [],
      //       tags: [],
      //       status: manga.status,
      //       visibility: "public",
      //       rating: manga.averageRating || 0,
      //       ratingsCount: manga.voteCount || 0,
      //       viewsCount: manga.view || 0,
      //       chaptersCount: 0, // Will be updated when we get chapter data
      //       isFavorited: false,
      //       isFollowing: false,
      //       createdAt: manga.createdAt,
      //       updatedAt: manga.updatedAt,
      //     })

      //     const allStories = response.data.mangas?.map(transformMangaToStory) || []
      //     const trending = response.data.trending?.map(transformMangaToStory) || []
          
      //     setStories(allStories)
      //     setTrendingStories(trending)
      //   } else {
      //     setError(response.data.message || "Failed to load stories")
      //   }
      // } catch (err: any) {
      //   console.error("Error fetching manga data:", err)
        
      //   // Check if it's a connection error (backend not running)
      //   if (err.code === 'ERR_NETWORK' || err.message.includes('ERR_CONNECTION_REFUSED')) {
      //     setError("Backend server is not running. Please start the backend server first.")
      //   } else {
      //     setError(err.response?.data?.message || err.message || "Failed to load stories")
      //   }
      // } finally {
      //   setLoading(false)
      // }
    }

    // Only fetch on client side to avoid hydration issues
    if (typeof window !== 'undefined') {
      fetchMangaData()
    } else {
      setLoading(false)
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20">
          <div className="container mx-auto px-4 py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading stories...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20">
          <div className="container mx-auto px-4 py-16">
            <div className="text-center">
              <p className="text-red-500 mb-4">Error: {error}</p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Wrap main content in a div with pt-20 */}
      <main className="pt-20">
        {/* Top Stories Carousel */}
        {trendingStories.length > 0 && (
          <StoryCarousel stories={trendingStories.slice(0, 10)} title="Top Stories This Week" />
        )}
        
        {/* Featured Stories */}
        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold">Featured Stories</h2>
              <Button variant="outline" asChild>
                <Link href="/stories">View All</Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stories.slice(0, 6).map((story) => (
                <Card key={story.id} className="overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
                  <div className="aspect-[3/4] relative h-[680px]">
                    <img
                      src={story.coverImage || "/placeholder.svg"}
                      alt={story.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant={story.status === "completed" ? "default" : "secondary"}>{story.status}</Badge>
                    </div>
                  </div>
                  <CardHeader className="flex-shrink-0">
                    <CardTitle className="line-clamp-1">{story.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{story.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow flex flex-col">
                    <div className="flex items-center space-x-2 mb-3">
                      <img
                        src={story.author.avatar || "/placeholder.svg"}
                        alt={story.author.name}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-sm text-muted-foreground">{story.author.name}</span>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {story.genre.map((g) => (
                        <Badge key={g} variant="outline" className="text-xs">
                          {g}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{story.rating}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span>{story.viewsCount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <BookOpen className="h-4 w-4" />
                        <span>{story.chaptersCount} chapters</span>
                      </div>
                    </div>

                    <Button className="w-full mt-auto" asChild>
                      <Link href={`/story/${story.id}`}>Read Now</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer - simplified (removed Quick Links and Support) */}
      <footer className="bg-muted py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-1 gap-8">
            {/* Logo & Description only */}
            <div className="text-center">
              <Link href="/" className="flex items-center justify-center gap-2 font-bold text-xl mb-4">
                <BookOpen className="w-6 h-6" />
                Manga World
              </Link>
              <p className="text-muted-foreground mb-4 max-w-2xl mx-auto">
                Discover amazing manga from talented artists around the world.
                <br className="hidden md:block" />
                Read, explore, and immerse yourself in captivating tales.
              </p>
            </div>
          </div>

          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2025 Manga World. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
