import { type NextRequest, NextResponse } from "next/server"

// Mock data
let mockNotifications = [
  {
    _id: "n1",
    recipient: { username: "Alice", role: "User", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice" },
    type: "Report",
    title: "Report Received",
    message: "Your report #R1023 has been received and is under review.",
    status: "Unread",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    linkedReportId: "r1023",
  },
  {
    _id: "n2",
    recipient: { username: "Bob", role: "Author", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob" },
    type: "Warning",
    title: "Content Warning",
    message: "Your manga has been reported and reviewed by admin. Please review our content guidelines.",
    status: "Read",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: "n3",
    recipient: { username: "Admin", role: "Admin", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" },
    type: "System",
    title: "System Alert",
    message: "Database backup completed successfully.",
    status: "Read",
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: "n4",
    recipient: { username: "Charlie", role: "User", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie" },
    type: "Info",
    title: "New Feature Available",
    message: "Check out our new reading recommendations feature!",
    status: "Unread",
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: "n5",
    recipient: { username: "Diana", role: "Author", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Diana" },
    type: "Report",
    title: "Report Resolved",
    message: "Report #R1024 has been resolved. Action taken: Warning issued.",
    status: "Read",
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    linkedReportId: "r1024",
  },
]

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get("type")
  const role = searchParams.get("role")
  const status = searchParams.get("status")
  const search = searchParams.get("search")

  let filtered = [...mockNotifications]

  if (type && type !== "All") {
    filtered = filtered.filter((n) => n.type === type)
  }

  if (role && role !== "All") {
    filtered = filtered.filter((n) => n.recipient.role === role)
  }

  if (status && status !== "All") {
    filtered = filtered.filter((n) => n.status === status)
  }

  if (search) {
    filtered = filtered.filter(
      (n) =>
        n.recipient.username.toLowerCase().includes(search.toLowerCase()) ||
        n.message.toLowerCase().includes(search.toLowerCase()),
    )
  }

  return NextResponse.json(filtered)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const newNotification = {
    _id: `n${Date.now()}`,
    recipient: body.recipient,
    type: body.type,
    title: body.title,
    message: body.message,
    status: "Unread",
    createdAt: new Date().toISOString(),
    linkedReportId: body.linkedReportId || null,
  }

  mockNotifications.unshift(newNotification)
  return NextResponse.json(newNotification, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const { id, status } = body

  mockNotifications = mockNotifications.map((n) => (n._id === id ? { ...n, status } : n))

  return NextResponse.json({ success: true })
}
