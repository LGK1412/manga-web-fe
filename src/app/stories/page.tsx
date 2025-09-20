"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation" // Import useSearchParams
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { Story } from "@/lib/types"
import Link from "next/link"
import { Star, Eye, BookOpen, Heart } from "lucide-react"
import { availableGenres, availableStatuses } from "@/lib/data"
import { mangaAPI, getImageUrl } from "@/lib/api"

const genres = availableGenres
const statuses = availableStatuses

export default function StoriesPage() {
  const searchParams = useSearchParams()
  const initialGenreParam = searchParams.get("genre") // Lấy tham số 'genre' từ URL

  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  // Khởi tạo selectedGenres dựa trên tham số URL
  const [selectedGenres, setSelectedGenres] = useState<string[]>(initialGenreParam ? [initialGenreParam] : [])
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [sortBy, setSortBy] = useState("popular")
  const [showFilters, setShowFilters] = useState(false)

  // filteredStories sẽ được tính toán trong useEffect
  const [filteredStories, setFilteredStories] = useState<Story[]>([])

  // Fetch stories from API
  useEffect(() => {
    const fetchStories = async () => {
      try {
        setLoading(true)
        const response = await mangaAPI.getMangaData()
        
        if (response.data.success) {
          // Transform backend data to frontend Story format
          const transformMangaToStory = (manga: any): Story => ({
            id: manga._id,
            title: manga.name,
            summary: manga.summary,
            coverImage: getImageUrl(manga.image, 'thumbnail'),
            author: {
              id: manga.author._id,
              email: manga.author.email,
              name: manga.author.name,
              avatar: getImageUrl(manga.author.avatar, 'avatar'),
              bio: "",
              isAuthor: manga.author.role === 'author',
              followersCount: 0,
              followingCount: 0,
              createdAt: manga.author.createdAt,
            },
            genre: manga.categories?.map((cat: any) => cat.name) || [],
            tags: [],
            status: manga.status,
            visibility: "public",
            rating: manga.averageRating || 0,
            ratingsCount: manga.voteCount || 0,
            viewsCount: manga.view || 0,
            chaptersCount: 0,
            isFavorited: false,
            isFollowing: false,
            createdAt: manga.createdAt,
            updatedAt: manga.updatedAt,
          })

          const allStories = response.data.mangas?.map(transformMangaToStory) || []
          setStories(allStories)
        } else {
          setError(response.data.message || "Failed to load stories")
        }
      } catch (err: any) {
        console.error("Error fetching stories:", err)
        setError(err.response?.data?.message || err.message || "Failed to load stories")
      } finally {
        setLoading(false)
      }
    }

    if (typeof window !== 'undefined') {
      fetchStories()
    } else {
      setLoading(false)
    }
  }, [])

  // Cập nhật filteredStories mỗi khi stories, searchQuery, selectedGenres, selectedStatus, sortBy thay đổi
  useEffect(() => {
    let filtered = [...stories]

    if (searchQuery) {
      filtered = filtered.filter(
        (story) =>
          story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          story.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
          story.author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          story.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    }

    if (selectedGenres.length > 0) {
      filtered = filtered.filter((story) => story.genre.some((g) => selectedGenres.includes(g)))
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter((story) => story.status === selectedStatus)
    }

    switch (sortBy) {
      case "popular":
        filtered.sort((a, b) => b.viewsCount - a.viewsCount)
        break
      case "rating":
        filtered.sort((a, b) => b.rating - a.rating)
        break
      case "newest":
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case "updated":
        filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        break
    }

    setFilteredStories(filtered)
  }, [stories, searchQuery, selectedGenres, selectedStatus, sortBy])

  const handleGenreChange = (genre: string, checked: boolean) => {
    setSelectedGenres((prevGenres) => (checked ? [...prevGenres, genre] : prevGenres.filter((g) => g !== genre)))
  }

  const toggleFavorite = (storyId: string) => {
    setStories(stories.map((story) => (story.id === storyId ? { ...story, isFavorited: !story.isFavorited } : story)))
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 pt-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Genres Stories</h1>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading stories...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-16">
            <p className="text-red-500 mb-4">Error: {error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        )}

        {/* Content */}
        {!loading && !error && (
          <>
            {/* Search and Filters */}
            <div className="mb-8 space-y-4">
          {/* Filters Panel (remains if showFilters is true, but the button to toggle it is removed) */}
          {showFilters && (
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Genres</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {genres.map((genre) => (
                        <div key={genre} className="flex items-center space-x-2">
                          <Checkbox
                            id={genre}
                            checked={selectedGenres.includes(genre)}
                            onCheckedChange={(checked) => handleGenreChange(genre, checked as boolean)}
                          />
                          <Label htmlFor={genre} className="text-sm">
                            {genre}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-semibold mb-3 block">Status</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {statuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        {/* Results */}
        {/* Stories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStories.map((story) => (
            <Card key={story.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-[3/4] relative">
                <img
                  src={story.coverImage || "/placeholder.svg"}
                  alt={story.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge variant={story.status === "completed" ? "default" : "secondary"}>{story.status}</Badge>
                </div>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-2 left-2"
                  onClick={() => toggleFavorite(story.id)}
                  type="button"
                >
                  <Heart className={`h-4 w-4 ${story.isFavorited ? "fill-red-500 text-red-500" : ""}`} />
                </Button>
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="line-clamp-1 text-lg">{story.title}</CardTitle>
                <CardDescription className="line-clamp-2 text-sm">{story.summary}</CardDescription>
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
        {filteredStories.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No stories found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  )
}
