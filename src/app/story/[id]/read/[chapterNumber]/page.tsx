"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ChevronLeft, ChevronRight, MessageCircle, ThumbsUp } from "lucide-react"
import Link from "next/link"
import type { Story, Chapter, Comment } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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

export default function ChapterReadingPage({ params }: { params: { id: string; chapterNumber: string } }) {
  // const { toast } = useToast()
  // const storyId = params.id
  // const chapterNumber = Number.parseInt(params.chapterNumber)

  // const [story, setStory] = useState<Story | null>(null)
  // const [chapter, setChapter] = useState<Chapter | null>(null)
  // const [allChapters, setAllChapters] = useState<Chapter[]>([])
  // // `comments` state is initialized from mock data and will reset on page refresh.
  // const [comments, setComments] = useState<Comment[]>([]) // State for chapter comments
  // const [newComment, setNewComment] = useState("")
  // const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  // const [reportTarget, setReportTarget] = useState<{ type: "story" | "comment"; id: string } | null>(null)
  // const [selectedReportReason, setSelectedReportReason] = useState("")
  // const [otherReportReason, setOtherReportReason] = useState("")

  // const reportReasons = [
  //   { value: "hate_speech", label: "Hate Speech / Discrimination" },
  //   { value: "harassment", label: "Harassment / Bullying" },
  //   { value: "sexual_content", label: "Sexual Content / Nudity" },
  //   { value: "violence", label: "Violence / Gore" },
  //   { value: "spam", label: "Spam / Misleading Content" },
  //   { value: "plagiarism", label: "Plagiarism / Copyright Infringement" },
  //   { value: "other", label: "Other (please specify)" },
  // ]

  // useEffect(() => {
  //   const foundStory = mockStories.find((s) => s.id === storyId)
  //   if (foundStory) {
  //     setStory(foundStory)
  //     const sortedChapters = mockChapters
  //       .filter((c) => c.storyId === storyId)
  //       .sort((a, b) => a.chapterNumber - b.chapterNumber)
  //     setAllChapters(sortedChapters)
  //     const foundChapter = sortedChapters.find((c) => c.chapterNumber === chapterNumber)
  //     setChapter(foundChapter || null)

  //     // Load comments for this specific chapter. This state will reset on page refresh.
  //     const chapterComments = mockChapterComments.filter((c) => c.chapterId === foundChapter?.id)
  //     setComments(chapterComments)
  //   } else {
  //     toast({
  //       title: "Story not found",
  //       description: "The story you are looking for does not exist.",
  //       variant: "destructive",
  //     })
  //   }
  // }, [storyId, chapterNumber, toast])

  // const currentChapterIndex = allChapters.findIndex((c) => c.chapterNumber === chapterNumber)
  // const previousChapter = currentChapterIndex > 0 ? allChapters[currentChapterIndex - 1] : null
  // const nextChapter = currentChapterIndex < allChapters.length - 1 ? allChapters[currentChapterIndex + 1] : null

  // const handleCommentSubmit = () => {
  //   if (!newComment.trim() || !chapter) return

  //   const comment: Comment = {
  //     id: Date.now().toString(),
  //     content: newComment,
  //     author: {
  //       id: "current-user",
  //       name: "You",
  //       email: "user@example.com",
  //       avatar: "/placeholder.svg?height=40&width=40",
  //       isAuthor: false,
  //       followersCount: 0,
  //       followingCount: 0,
  //       createdAt: new Date().toISOString(),
  //     },
  //     chapterId: chapter.id, // Associate comment with the current chapter
  //     likesCount: 0,
  //     isLiked: false,
  //     createdAt: new Date().toISOString(),
  //   }

  //   setComments([comment, ...comments])
  //   setNewComment("")
  //   toast({
  //     title: "Comment posted!",
  //     description: "Your comment has been posted.",
  //   })
  // }

  // const handleCommentLike = (commentId: string) => {
  //   // This updates the local state only. It will reset on page refresh.
  //   setComments(
  //     comments.map((comment) =>
  //       comment.id === commentId
  //         ? {
  //             ...comment,
  //             isLiked: !comment.isLiked,
  //             likesCount: comment.isLiked ? comment.likesCount - 1 : comment.likesCount + 1,
  //           }
  //         : comment,
  //     ),
  //   )
  // }

  // const openReportDialog = (type: "story" | "comment", id: string) => {
  //   setReportTarget({ type, id })
  //   setSelectedReportReason("")
  //   setOtherReportReason("")
  //   setIsReportDialogOpen(true)
  // }

  // const submitReport = () => {
  //   if (!reportTarget || !selectedReportReason) {
  //     toast({
  //       title: "Report failed",
  //       description: "Please select a reason for your report.",
  //       variant: "destructive",
  //     })
  //     return
  //   }

  //   const reason = selectedReportReason === "other" ? otherReportReason : selectedReportReason
  //   console.log(`Reporting ${reportTarget.type} (ID: ${reportTarget.id}) for reason: ${reason}`)

  //   toast({
  //     title: "Report submitted",
  //     description: "We will review your report shortly.",
  //   })
  //   setIsReportDialogOpen(false)
  // }

  // if (!story || !chapter) {
  //   return (
  //     <div className="min-h-screen bg-background">
  //       <Navbar />
  //       <div className="container mx-auto px-4 py-8">
  //         <div className="text-center">
  //           <h1 className="text-2xl font-bold">Chapter not found</h1>
  //           <p className="text-muted-foreground mt-2">
  //             The chapter you're looking for doesn't exist or the story is unavailable.
  //           </p>
  //           <Button asChild className="mt-4">
  //             <Link href={`/story/${storyId}`}>Back to Story Details</Link>
  //           </Button>
  //         </div>
  //       </div>
  //     </div>
  //   )
  // }

  // return (
  //   <div className="min-h-screen bg-background">
  //     <Navbar />

  //     <div className="container mx-auto px-4 py-8 pt-20 max-w-3xl">
  //       {" "}
  //       {/* Changed pt-16 to pt-20 */}
  //       <div className="mb-6 flex items-center justify-between">
  //         <Button variant="ghost" asChild>
  //           <Link href={`/story/${storyId}`}>
  //             <ArrowLeft className="h-4 w-4 mr-2" /> Back to Story
  //           </Link>
  //         </Button>
  //         <h1 className="text-2xl font-bold text-center flex-1">{story.title}</h1>
  //         <div className="w-24"></div> {/* Spacer to balance the back button */}
  //       </div>
  //       <Card className="mb-8">
  //         <CardHeader>
  //           <CardTitle className="text-xl md:text-2xl">
  //             Chapter {chapter.chapterNumber}: {chapter.title}
  //           </CardTitle>
  //         </CardHeader>
  //         <CardContent>
  //           {chapter.imagePages && chapter.imagePages.length > 0 ? (
  //             <div className="mt-6 space-y-8">
  //               {chapter.imagePages.map((imagePage) => (
  //                 <div key={imagePage.id} className="flex flex-col items-center">
  //                   <img
  //                     src={imagePage.imageUrl || "/placeholder.svg"}
  //                     alt={imagePage.description || `Image page ${imagePage.pageNumber}`}
  //                     className="max-w-full h-auto rounded-lg shadow-md object-contain"
  //                   />
  //                   {/* Removed imagePage.description rendering */}
  //                 </div>
  //               ))}
  //             </div>
  //           ) : (
  //             chapter.content && (
  //               <div className="prose dark:prose-invert max-w-none leading-relaxed text-lg">
  //                 <p>{chapter.content}</p>
  //               </div>
  //             )
  //           )}
  //         </CardContent>
  //       </Card>
  //       <div className="flex justify-between items-center mt-8">
  //         {previousChapter ? (
  //           <Button asChild variant="outline">
  //             <Link href={`/story/${storyId}/read/${previousChapter.chapterNumber}`}>
  //               <ChevronLeft className="h-4 w-4 mr-2" /> Previous Chapter
  //             </Link>
  //           </Button>
  //         ) : (
  //           <Button variant="outline" disabled>
  //             <ChevronLeft className="h-4 w-4 mr-2" /> Previous Chapter
  //           </Button>
  //         )}
  //         <span className="text-muted-foreground text-sm">
  //           {chapter.chapterNumber} / {allChapters.length}
  //         </span>
  //         {nextChapter ? (
  //           <Button asChild variant="outline">
  //             <Link href={`/story/${storyId}/read/${nextChapter.chapterNumber}`}>
  //               Next Chapter <ChevronRight className="h-4 w-4 ml-2" />
  //             </Link>
  //           </Button>
  //         ) : (
  //           <Button variant="outline" disabled>
  //             Next Chapter <ChevronRight className="h-4 w-4 ml-2" />
  //           </Button>
  //         )}
  //       </div>
  //       {/* Comments Section for Chapter */}
  //       <Card className="mt-8">
  //         <CardHeader>
  //           <CardTitle className="flex items-center gap-2">
  //             <MessageCircle className="w-5 h-5" />
  //             Comments ({comments.length})
  //           </CardTitle>
  //         </CardHeader>
  //         <CardContent>
  //           {/* Add Comment */}
  //           <div className="mb-6">
  //             <Textarea
  //               placeholder="Write your comment..."
  //               value={newComment}
  //               onChange={(e) => setNewComment(e.target.value)}
  //               className="mb-3"
  //             />
  //             <Button onClick={handleCommentSubmit} disabled={!newComment.trim()}>
  //               Post Comment
  //             </Button>
  //           </div>

  //           <Separator className="mb-6" />

  //           {/* Comments List */}
  //           <div className="space-y-6">
  //             {comments.length === 0 ? (
  //               <div className="text-center py-6 text-muted-foreground">No comments yet. Be the first to comment!</div>
  //             ) : (
  //               comments.map((comment) => (
  //                 <div key={comment.id} className="flex gap-3">
  //                   <Avatar className="w-8 h-8">
  //                     <AvatarImage src={comment.author.avatar || "/placeholder.svg"} alt={comment.author.name} />
  //                     <AvatarFallback>{comment.author.name.charAt(0)}</AvatarFallback>
  //                   </Avatar>
  //                   <div className="flex-1">
  //                     <div className="flex items-center gap-2 mb-1">
  //                       <span className="font-medium text-sm">{comment.author.name}</span>
  //                       <span className="text-xs text-muted-foreground">
  //                         {new Date(comment.createdAt).toLocaleDateString()}
  //                       </span>
  //                     </div>
  //                     <p className="text-sm mb-2">{comment.content}</p>
  //                     <div className="flex items-center gap-4">
  //                       <button
  //                         onClick={() => handleCommentLike(comment.id)}
  //                         className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
  //                         type="button" // Ensure it's a button type
  //                       >
  //                         <ThumbsUp className={`w-3 h-3 ${comment.isLiked ? "fill-blue-500 text-blue-500" : ""}`} />
  //                         {comment.likesCount}
  //                       </button>
  //                       <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
  //                         <DialogTrigger asChild>
  //                           <button
  //                             onClick={() => openReportDialog("comment", comment.id)}
  //                             className="text-xs text-muted-foreground hover:text-foreground"
  //                             type="button" // Ensure it's a button type
  //                           >
  //                             Report
  //                           </button>
  //                         </DialogTrigger>
  //                         <DialogContent className="sm:max-w-[425px]">
  //                           <DialogHeader>
  //                             <DialogTitle>Report Comment</DialogTitle>
  //                             <DialogDescription>Please select a reason for reporting this comment.</DialogDescription>
  //                           </DialogHeader>
  //                           <div className="grid gap-4 py-4">
  //                             <RadioGroup value={selectedReportReason} onValueChange={setSelectedReportReason}>
  //                               {reportReasons.map((reason) => (
  //                                 <div key={reason.value} className="flex items-center space-x-2">
  //                                   <RadioGroupItem value={reason.value} id={`report-comment-reason-${reason.value}`} />
  //                                   <Label htmlFor={`report-comment-reason-${reason.value}`}>{reason.label}</Label>
  //                                 </div>
  //                               ))}
  //                             </RadioGroup>
  //                             {selectedReportReason === "other" && (
  //                               <Textarea
  //                                 placeholder="Please specify your reason..."
  //                                 value={otherReportReason}
  //                                 onChange={(e) => setOtherReportReason(e.target.value)}
  //                                 className="mt-2"
  //                               />
  //                             )}
  //                           </div>
  //                           <DialogFooter>
  //                             <Button type="submit" onClick={submitReport}>
  //                               Submit Report
  //                             </Button>
  //                           </DialogFooter>
  //                         </DialogContent>
  //                       </Dialog>
  //                     </div>
  //                   </div>
  //                 </div>
  //               ))
  //             )}
  //           </div>
  //         </CardContent>
  //       </Card>
  //     </div>
  //   </div>
  // )
}
