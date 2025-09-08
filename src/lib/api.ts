import axios from "axios"

// API client setup for backend integration
// Backend chạy trên port 333
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:333"
const STATIC_BASE_URL = process.env.NEXT_PUBLIC_STATIC_URL || "http://localhost:333"

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`, // Backend API base URL
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: Tự động thêm Authorization header với token
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem("authToken")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log("API request with token:", config.url, token.substring(0, 20) + "...")
    } else {
      console.log("API request without token:", config.url)
    }
  }
  return config
})

// Response interceptor: Xử lý lỗi chung
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem("authToken")
        localStorage.removeItem("userEmail")
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  },
)

// API Functions
export const authAPI = {
  // Authentication
  signup: (email: string, password: string, name: string) =>
    apiClient.post('/auth/signup', { email, password, name }),
  
  signin: (email: string, password: string) =>
    apiClient.post('/auth/signin', { email, password }),
  
  logout: (email: string, loginToken: string) =>
    apiClient.post('/auth/logout', { email, loginToken }),
  
  // Verification
  sendVerificationCode: (email: string) =>
    apiClient.patch('/auth/send-verification-code', { email }),
  
  verifyVerificationCode: (email: string, providedCode: string) =>
    apiClient.patch('/auth/verify-verification-code', { email, providedCode }),
  
  // Password reset
  sendResetCode: (email: string) =>
    apiClient.post('/auth/send-forgot-password', { email }),
  
  verifyForgotPasswordCode: (email: string, providedCode: string, newPassword: string) =>
    apiClient.post('/auth/verify-forgot-password', { email, providedCode, newPassword }),
  
  // Google OAuth
  googleLogin: (token: string) =>
    apiClient.post('/auth/google', {}, { headers: { Authorization: `Bearer ${token}` } }),
  
  // Get user profile
  getUserProfile: () =>
    apiClient.get('/auth/profile'),
}

export const mangaAPI = {
  // Get all manga data (trending, categories, all mangas)
  getMangaData: () =>
    apiClient.get('/manga'),
  
  // Get specific manga detail
  getMangaDetail: (id: string) =>
    apiClient.get(`/manga/${id}`),
  
  // Get manga by author
  getMangaByAuthor: (authorId: string) =>
    apiClient.get(`/manga/author/${authorId}`),
  
  // Rate manga
  rateManga: (id: string, userId: string, value: number) =>
    apiClient.post(`/manga/${id}/rate`, { userId, value }),
  
  // Report manga
  reportManga: (id: string, userId: string, reason: string) =>
    apiClient.post(`/manga/report/${id}`, { userId, reason }),
}

export const chapterAPI = {
  // Get chapters by manga ID
  getChaptersByManga: (mangaId: string) =>
    apiClient.get(`/chapter/${mangaId}`),
  
  // Get specific chapter data
  getChapterData: (mangaId: string, chapterNumber: number) =>
    apiClient.get(`/chapter/manga/${mangaId}/chapter/${chapterNumber}`),
  
  // Get chapter by ID
  getChapterById: (chapterId: string) =>
    apiClient.get(`/chapter/get-chapter/${chapterId}`),
}

export const userAPI = {
  // Get user profile
  getUserProfile: () =>
    apiClient.get('/user/profile'),
  
  // Update user profile
  updateUserProfile: (data: any) =>
    apiClient.put('/user/profile', data),
}

// Utility functions for static file URLs
export const getImageUrl = (imagePath: string, type: 'avatar' | 'thumbnail' | 'chapter' = 'thumbnail') => {
  if (!imagePath) return "/placeholder.svg"
  
  const baseUrl = STATIC_BASE_URL
  switch (type) {
    case 'avatar':
      return `${baseUrl}/avatars/${imagePath}`
    case 'thumbnail':
      return `${baseUrl}/thumbnails/${imagePath}`
    case 'chapter':
      return `${baseUrl}/chapter/${imagePath}`
    default:
      return `${baseUrl}/thumbnails/${imagePath}`
  }
}

export default apiClient
