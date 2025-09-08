"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Star, Eye, BookOpen, Heart, UserPlus, MessageCircle, ThumbsUp, Flag } from "lucide-react"
import Link from "next/link"
import type { Story, Chapter, Comment } from "@/lib/types"
// Mock data removed - will be replaced with real API calls
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

export default function StoryDetailPage({ params }: { params: { id: string } }) {
  const [story, setStory] = useState<Story | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [userRating, setUserRating] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  // `isFavorited` state is initialized from mock data and will reset on page refresh.
  const [isFavorited, setIsFavorited] = useState(false)
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState<{ type: "story" | "comment"; id: string } | null>(null)
  const [selectedReportReason, setSelectedReportReason] = useState("")
  const [otherReportReason, setOtherReportReason] = useState("")

  const { toast } = useToast()

  const reportReasons = [
    { value: "hate_speech", label: "Hate Speech / Discrimination" },
    { value: "harassment", label: "Harassment / Bullying" },
    { value: "sexual_content", label: "Sexual Content / Nudity" },
    { value: "violence", label: "Violence / Gore" },
    { value: "spam", label: "Spam / Misleading Content" },
    { value: "plagiarism", label: "Plagiarism / Copyright Infringement" },
    { value: "other", label: "Other (please specify)" },
  ]

  useEffect(() => {
    // TODO: Load story data from API
    // const foundStory = await storyAPI.getStory(params.id)
    // setStory(foundStory)
    
    // TODO: Load chapters from API
    // const storyChapters = await chapterAPI.getChaptersByStory(params.id)
    // setChapters(storyChapters)
    
    // TODO: Load comments from API
    // const storyComments = await commentAPI.getCommentsByStory(params.id)
    // setComments(storyComments)
    
    // For now, set empty arrays to prevent errors
    setStory(null)
    setChapters([])
    setComments([])
  }, [params.id])

  const handleRating = (rating: number) => {
    setUserRating(rating)
    toast({
      title: "Rating submitted!",
      description: `You rated this story ${rating} stars.`,
    })
  }

  const handleFollow = () => {
    setIsFollowing(!isFollowing)
    toast({
      title: isFollowing ? "Unfollowed" : "Following",
      description: isFollowing ? `You unfollowed ${story?.author.name}` : `You are now following ${story?.author.name}`,
    })
  }

  const handleFavorite = () => {
    // This updates the local state only. It will reset on page refresh.
    setIsFavorited(!isFavorited)
    toast({
      title: isFavorited ? "Removed from favorites" : "Added to favorites",
      description: isFavorited ? "Story removed from your favorites" : "Story added to your favorites",
    })
  }

  const handleCommentSubmit = () => {
    if (!newComment.trim()) return

    const comment: Comment = {
      id: Date.now().toString(),
      content: newComment,
      author: {
        id: "current-user",
        name: "You",
        email: "user@example.com",
        avatar: "/placeholder.svg?height=40&width=40",
        isAuthor: false,
        followersCount: 0,
        followingCount: 0,
        createdAt: new Date().toISOString(),
      },
      storyId: params.id,
      likesCount: 0,
      isLiked: false,
      createdAt: new Date().toISOString(),
    }

    setComments([comment, ...comments])
    setNewComment("")
    toast({
      title: "Comment posted!",
      description: "Your comment has been posted.",
    })
  }

  const handleCommentLike = (commentId: string) => {
    setComments(
      comments.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              isLiked: !comment.isLiked,
              likesCount: comment.isLiked ? comment.likesCount - 1 : comment.likesCount + 1,
            }
          : comment,
      ),
    )
  }

  const openReportDialog = (type: "story" | "comment", id: string) => {
    setReportTarget({ type, id })
    setSelectedReportReason("")
    setOtherReportReason("")
    setIsReportDialogOpen(true)
  }

  const submitReport = () => {
    if (!reportTarget || !selectedReportReason) {
      toast({
        title: "Report failed",
        description: "Please select a reason for your report.",
        variant: "destructive",
      })
      return
    }

    const reason = selectedReportReason === "other" ? otherReportReason : selectedReportReason
    console.log(`Reporting ${reportTarget.type} (ID: ${reportTarget.id}) for reason: ${reason}`)

    toast({
      title: "Report submitted",
      description: "We will review your report shortly.",
    })
    setIsReportDialogOpen(false)
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Story not found</h1>
            <p className="text-muted-foreground mt-2">The story you're looking for doesn't exist.</p>
            <Button asChild className="mt-4">
              <Link href="/stories">Back to stories</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 pt-20">
        {" "}
        {/* Changed pt-16 to pt-20 */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Story Header */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Cover Image */}
                  <div className="w-full md:w-64 flex-shrink-0">
                    <div className="aspect-[3/4] relative">
                      <img
                        src={story.coverImage || "/placeholder.svg"}
                        alt={story.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <Badge
                        className="absolute top-2 right-2"
                        variant={story.status === "completed" ? "default" : "secondary"}
                      >
                        {story.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Story Info */}
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {story.genre.map((g) => (
                        <Badge key={g} variant="outline">
                          {g}
                        </Badge>
                      ))}
                    </div>

                    <h1 className="text-3xl font-bold mb-3">{story.title}</h1>

                    {/* Author Info */}
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar>
                        <AvatarImage src={story.author.avatar || "/placeholder.svg"} alt={story.author.name} />
                        <AvatarFallback>{story.author.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{story.author.name}</p>
                        <p className="text-sm text-muted-foreground">{story.author.followersCount} followers</p>
                      </div>
                      <Button variant={isFollowing ? "outline" : "default"} size="sm" onClick={handleFollow}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        {isFollowing ? "Following" : "Follow"}
                      </Button>
                    </div>

                    {/* Stats */}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        {story.rating} ({story.ratingsCount} ratings)
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {story.viewsCount.toLocaleString()} views
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {story.chaptersCount} chapters
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-muted-foreground mb-6 leading-relaxed">{story.description}</p>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                      <Button size="lg" asChild>
                        <Link href={`/story/${story.id}/read/${chapters[0]?.chapterNumber || 1}`}>
                          <BookOpen className="w-4 h-4 mr-2" />
                          Start Reading
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handleFavorite}
                        type="button"
                        className="min-w-[180px] justify-center bg-transparent" // Added fixed width and center justification
                      >
                        <Heart className={`w-4 h-4 mr-2 ${isFavorited ? "fill-red-500 text-red-500" : ""}`} />
                        {isFavorited ? "Favorited" : "Add to Favorites"}
                      </Button>
                      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="lg" onClick={() => openReportDialog("story", story.id)}>
                            <Flag className="w-4 h-4 mr-2" />
                            Report
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Report Story</DialogTitle>
                            <DialogDescription>Please select a reason for reporting this story.</DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <RadioGroup value={selectedReportReason} onValueChange={setSelectedReportReason}>
                              {reportReasons.map((reason) => (
                                <div key={reason.value} className="flex items-center space-x-2">
                                  <RadioGroupItem value={reason.value} id={`report-reason-${reason.value}`} />
                                  <Label htmlFor={`report-reason-${reason.value}`}>{reason.label}</Label>
                                </div>
                              ))}
                            </RadioGroup>
                            {selectedReportReason === "other" && (
                              <Textarea
                                placeholder="Please specify your reason..."
                                value={otherReportReason}
                                onChange={(e) => setOtherReportReason(e.target.value)}
                                className="mt-2"
                              />
                            )}
                          </div>
                          <DialogFooter>
                            <Button type="submit" onClick={submitReport}>
                              Submit Report
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rating Section */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Rate this story</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm">Your rating:</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRating(star)}
                      className="text-2xl hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= userRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {userRating > 0 && (
                  <p className="text-sm text-muted-foreground">You rated this story {userRating} stars.</p>
                )}
              </CardContent>
            </Card>

            {/* Comments Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Comments ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Add Comment */}
                <div className="mb-6">
                  <Textarea
                    placeholder="Write your comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="mb-3"
                  />
                  <Button onClick={handleCommentSubmit} disabled={!newComment.trim()}>
                    Post Comment
                  </Button>
                </div>

                <Separator className="mb-6" />

                {/* Comments List */}
                <div className="space-y-6">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={comment.author.avatar || "/placeholder.svg"} alt={comment.author.name} />
                        <AvatarFallback>{comment.author.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{comment.author.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm mb-2">{comment.content}</p>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleCommentLike(comment.id)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <ThumbsUp className={`w-3 h-3 ${comment.isLiked ? "fill-blue-500 text-blue-500" : ""}`} />
                            {comment.likesCount}
                          </button>
                          <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                            <DialogTrigger asChild>
                              <button
                                onClick={() => openReportDialog("comment", comment.id)}
                                className="text-xs text-muted-foreground hover:text-foreground"
                              >
                                Report
                              </button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>Report Comment</DialogTitle>
                                <DialogDescription>
                                  Please select a reason for reporting this comment.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <RadioGroup value={selectedReportReason} onValueChange={setSelectedReportReason}>
                                  {reportReasons.map((reason) => (
                                    <div key={reason.value} className="flex items-center space-x-2">
                                      <RadioGroupItem
                                        value={reason.value}
                                        id={`report-comment-reason-${reason.value}`}
                                      />
                                      <Label htmlFor={`report-comment-reason-${reason.value}`}>{reason.label}</Label>
                                    </div>
                                  ))}
                                </RadioGroup>
                                {selectedReportReason === "other" && (
                                  <Textarea
                                    placeholder="Please specify your reason..."
                                    value={otherReportReason}
                                    onChange={(e) => setOtherReportReason(e.target.value)}
                                    className="mt-2"
                                  />
                                )}
                              </div>
                              <DialogFooter>
                                <Button type="submit" onClick={submitReport}>
                                  Submit Report
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Chapters List */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Chapters
                </CardTitle>
                <CardDescription>{chapters.length} chapters available</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {chapters.length > 0 ? (
                  <div className="space-y-2">
                    {chapters.map((chapter) => (
                      <Link
                        key={chapter.id}
                        href={`/story/${story.id}/read/${chapter.chapterNumber}`}
                        className="block p-3 rounded-lg border hover:bg-muted transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">
                              Chapter {chapter.chapterNumber}: {chapter.title}
                            </p>
                            <p className="text-xs text-muted-foreground">{chapter.viewsCount.toLocaleString()} views</p>
                          </div>
                          {/* Removed "Free" badge */}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">No chapters found for this story.</div>
                )}
              </CardContent>
            </Card>

            {/* Related Stories */}
            <Card>
              <CardHeader>
                <CardTitle>More by {story.author.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* TODO: Load related stories from API */}
                  {[]
                    .filter((s) => s.author.id === story?.author?.id && s.id !== story?.id)
                    .slice(0, 3)
                    .map((relatedStory) => (
                      <Link
                        key={relatedStory.id}
                        href={`/story/${relatedStory.id}`}
                        className="block p-3 rounded-lg border hover:bg-muted"
                      >
                        <div className="flex gap-3">
                          <img
                            src={relatedStory.coverImage || "/placeholder.svg"}
                            alt={relatedStory.title}
                            className="w-12 h-16 object-cover rounded"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-sm line-clamp-1">{relatedStory.title}</p>
                            <p className="text-xs text-muted-foreground">{relatedStory.genre.join(", ")}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              {relatedStory.rating}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
