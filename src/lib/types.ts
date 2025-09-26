
export interface User {
  point: number
  author_point: number
  role: string
  id: string
  email: string
  name: string
  avatar?: string
  bio?: string
  isAuthor: boolean
  followersCount: number
  followingCount: number
  createdAt: string
}

export interface ImagePage {
  id: string
  pageNumber: number
  imageUrl: string
  description?: string
}

export interface Chapter {
  id: string
  storyId: string
  title: string
  content?: string // Made optional to allow image-only chapters
  imagePages?: ImagePage[] // Added for image-based chapters
  chapterNumber: number
  isFree: boolean
  publishedAt: string
  viewsCount: number
}

export interface Story {
  id: string
  title: string
  description: string
  coverImage?: string
  author: User
  genre: string[]
  tags: string[]
  status: "ongoing" | "completed" | "hiatus"
  visibility: "public" | "private" | "premium"
  rating: number
  ratingsCount: number
  viewsCount: number
  chaptersCount: number
  isFavorited: boolean
  isFollowing: boolean
  createdAt: string
  updatedAt: string
}

export interface Comment {
  id: string
  content: string
  author: User
  storyId?: string
  chapterId?: string
  parentId?: string
  replies?: Comment[]
  likesCount: number
  isLiked: boolean
  createdAt: string
}

export interface Notification {
  id: string
  type: "new_chapter" | "new_comment" | "new_follower" | "story_update"
  title: string
  message: string
  isRead: boolean
  createdAt: string
  actionUrl?: string
}
