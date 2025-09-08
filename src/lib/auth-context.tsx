"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { User } from "./types"
import { authAPI } from "./api"

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Only run on client side to avoid hydration mismatch
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem("authToken")
      if (token) {
        // TODO: Load user data from API using token
        // For now, we'll keep the mock behavior until we have user profile API
        const storedUserEmail = localStorage.getItem("userEmail")
        if (storedUserEmail) {
          // Create a basic user object from stored email
          const basicUser: User = {
            id: "temp-id",
            email: storedUserEmail,
            name: storedUserEmail.split('@')[0], // Use email prefix as name
            avatar: "/placeholder.svg",
            bio: "",
            isAuthor: false,
            followersCount: 0,
            followingCount: 0,
            createdAt: new Date().toISOString(),
          }
          setUser(basicUser)
        }
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const response = await authAPI.signin(email, password)
      
      if (response.data.success) {
        const token = response.data.token
        console.log("Login token:", token)
        localStorage.setItem("authToken", token)
        localStorage.setItem("userEmail", email)
        console.log("Token saved to localStorage")
        
        // Get user profile from backend
        try {
          console.log("Calling getUserProfile...")
          const profileResponse = await authAPI.getUserProfile()
          console.log("Profile response:", profileResponse.data)
          if (profileResponse.data.success) {
            const backendUser = profileResponse.data.user
            const user: User = {
              id: backendUser._id,
              email: backendUser.email,
              name: backendUser.name,
              avatar: backendUser.avatar || "/placeholder.svg",
              bio: backendUser.bio || "",
              isAuthor: backendUser.role === "author",
              followersCount: backendUser.followersCount || 0,
              followingCount: backendUser.followingCount || 0,
              createdAt: backendUser.createdAt || new Date().toISOString(),
            }
            console.log("Final user object set:", user)
            setUser(user)
          } else {
            throw new Error("Failed to get user profile")
          }
        } catch (profileError: any) {
          console.error("Profile fetch error:", profileError)
          console.error("Profile error details:", profileError.response?.data)
          console.error("Profile error status:", profileError.response?.status)
          console.error("Profile error message:", profileError.message)
          
          // TEMPORARY: Use name from JWT token instead of email
          const token = response.data.token
          const tokenPayload = JSON.parse(atob(token.split('.')[1]))
          console.log("JWT payload:", tokenPayload)
          
          // Fallback to basic user object with name from JWT
          const user: User = {
            id: tokenPayload.userId || "temp-id",
            email: email,
            name: tokenPayload.name || email.split('@')[0],
            avatar: tokenPayload.avatar || "/placeholder.svg",
            bio: "",
            isAuthor: tokenPayload.role === "author",
            followersCount: 0,
            followingCount: 0,
            createdAt: new Date().toISOString(),
          }
          console.log("Fallback user object:", user)
          setUser(user)
        }
      } else {
        throw new Error(response.data.message || "Login failed")
      }
    } catch (error: any) {
      console.error("Login error:", error)
      throw new Error(error.response?.data?.message || error.message || "Login failed")
    } finally {
      setIsLoading(false)
    }
  }

  const loginWithGoogle = async () => {
    setIsLoading(true)
    try {
      // TODO: Google OAuth implementation
      console.log("Google login not implemented yet")
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true)
    try {
      const response = await authAPI.signup(email, password, name)
      
      if (response.data.success) {
        // Registration successful, but user needs to verify email
        console.log("Registration successful:", response.data.message)
      } else {
        throw new Error(response.data.message || "Registration failed")
      }
    } catch (error: any) {
      console.error("Registration error:", error)
      throw new Error(error.response?.data?.message || error.message || "Registration failed")
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      // Call logout API if user is logged in
      if (user?.email) {
        const token = localStorage.getItem("authToken")
        if (token) {
          await authAPI.logout(user.email, token)
        }
      }
    } catch (error) {
      console.error("Logout API error:", error)
      // Continue with local logout even if API call fails
    } finally {
      localStorage.removeItem("authToken")
      localStorage.removeItem("userEmail")
      setUser(null)
    }
  }

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return
    setIsLoading(true)
    try {
      // TODO: API call
      // const response = await apiClient.put('/user/profile', data)
      // setUser(response.data)

      // Mock implementation
      setUser({ ...user, ...data })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginWithGoogle,
        register,
        logout,
        updateProfile,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
