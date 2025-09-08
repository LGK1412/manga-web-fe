import type { User, Story, Chapter, Comment, Notification } from "./types"

// This file now only contains type exports and utility functions
// All mock data has been removed in favor of real API integration

// Available genres for filtering
export const availableGenres = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", 
  "Mystery", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural"
]

// Available statuses for filtering
export const availableStatuses = [
  "Ongoing", "Completed", "Hiatus", "Cancelled"
]
