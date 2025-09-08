"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, UserPlus, Heart, MessageCircle, BookOpen, CheckCircle } from "lucide-react"
import type { Notification } from "@/lib/types"
// Mock data removed - will be replaced with real API calls
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function NotificationsPage() {
  // Initialize with empty array - will be replaced with real API calls
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Load notifications on component mount
  useEffect(() => {
    // TODO: Load notifications from API
    // For now, set empty array to prevent errors
    setNotifications([])
  }, [])

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "new_follower":
        return <UserPlus className="h-5 w-5 text-blue-500" />
      case "new_comment": // These cases will no longer be reached with the current filter
        return <MessageCircle className="h-5 w-5 text-green-500" />
      case "story_update":
        return <Heart className="h-5 w-5 text-purple-500" />
      case "new_chapter":
        return <BookOpen className="h-5 w-5 text-yellow-500" />
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getNotificationBadgeVariant = (type: Notification["type"]) => {
    switch (type) {
      case "new_follower":
        return "outline"
      case "new_comment":
        return "default"
      case "story_update":
        return "secondary"
      case "new_chapter":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const getNotificationBadgeText = (type: Notification["type"]) => {
    switch (type) {
      case "new_follower":
        return "New Follower"
      case "new_comment":
        return "New Comment"
      case "story_update":
        return "Story Update"
      case "new_chapter":
        return "New Chapter"
      default:
        return "Notification"
    }
  }

  const handleMarkAsRead = (id: string) => {
    setNotifications((prevNotifications) =>
      prevNotifications.map((notif) => (notif.id === id ? { ...notif, isRead: true } : notif)),
    )
    toast({
      title: "Notification marked as read",
      description: "This notification will no longer appear as unread.",
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 pt-20">
        {" "}
        {/* Changed pt-16 to pt-20 */}
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <Bell className="h-8 w-8" /> Notifications
        </h1>
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No new notifications</h3>
            <p className="text-muted-foreground">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card key={notification.id} className={notification.isRead ? "opacity-70" : ""}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getNotificationBadgeVariant(notification.type)}>
                        {getNotificationBadgeText(notification.type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg mb-1">{notification.title}</h3>
                    <p className="text-muted-foreground text-sm mb-3">{notification.message}</p>
                    <div className="flex gap-2">
                      {notification.actionUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={notification.actionUrl}>View Details</Link>
                        </Button>
                      )}
                      {!notification.isRead && (
                        <Button variant="ghost" size="sm" onClick={() => handleMarkAsRead(notification.id)}>
                          <CheckCircle className="h-4 w-4 mr-2" /> Mark as Read
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
