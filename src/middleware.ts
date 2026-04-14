import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
    const token = req.cookies.get("access_token")?.value
    const userCookie = req.cookies.get("user_normal_info")?.value
    let isLogin = false

    if (token && userCookie) {
        isLogin = true
    }

    let user: any = null
    if (userCookie) {
        try {
            user = JSON.parse(userCookie)
        } catch (error) {
            console.error("Failed to parse user cookie:", error)
            user = null
        }
    }

    const role = user?.role
    const pathname = req.nextUrl.pathname
    const dontNeedLoginPages = ["/login", "/verify-email", "/register", "/forgot-password", "/reset-forgot-password"]
    const mustLoginPages = ["/change-password","/topup"]
    const adminPages = ["/admin/dashboard", "/admin/user", "/admin/notifications", "/admin/notifications/send-general", "/admin/policies", "/admin/audit-logs"]
    const contentModerPages = ["/admin/user", "/admin/genre", "/admin/style", "/admin/report", "/admin/notifications", "/admin/notifications/send-general", "/admin/license-management", "/admin/moderation/queue", "/admin/moderation/workspace", "/admin/manga", "/admin/my-notifications"]
    const financialPages = ["admin/payout-profile", "/admin/user", "/admin/withdraw", "/admin/my-notifications"]
    const communicationPages = ["/admin/comments", "/admin/user", "/admin/report", "/admin/notifications", "/admin/notifications/send-general", "/admin/my-notifications"]
    const authorPages = ["/author/dashboard", "/author/static", "/author/story/create", "/author/story/edit/:id", "/author/chapter", "/author/chapter/:idStory", "/author/chapter/:idStory/imageChapter", "/author/chapter/:idStory/textChapter/create", "/author/chapter/:idStory/textChapter/edit/:id", "/author/manga/:id/license"]
    console.log("Role: ", role)

 
    if (
        dontNeedLoginPages.includes(pathname) &&
        isLogin
    ) {
        return NextResponse.redirect(new URL("/", req.url))
    }

    if (mustLoginPages.includes(pathname) && !isLogin) {
        console.log("oke 1")
        return NextResponse.redirect(new URL("/login", req.url))
    }

    if (role !== "author" && authorPages.includes(pathname)) {
        console.log("oke 3")
        if (role === "admin") {
            return NextResponse.redirect(new URL("/admin/dashboard", req.url))
        }
        return NextResponse.redirect(new URL("/", req.url))
    }

    if (role === "admin" && !adminPages.includes(pathname)) {
        console.log("oke 4")
        return NextResponse.redirect(new URL("/admin/dashboard", req.url))
    }

    if (role === "content_moderator" && !contentModerPages.includes(pathname)) {
        console.log("oke 5")
        return NextResponse.redirect(new URL("/admin/user", req.url))
    }

    if (role === "financial_manager" && !financialPages.includes(pathname)) {
        console.log("oke 6")
        return NextResponse.redirect(new URL("/admin/user", req.url))
    }

    if (role === "community_manager" && !communicationPages.includes(pathname)) {
        console.log("oke 7")
        return NextResponse.redirect(new URL("/admin/user", req.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ["/", "/login", "/verify-email", "/register", "/forgot-password", "/reset-forgot-password", "/change-password", "/author/dashboard", "/author/static", "/author/story/create", "/author/story/edit/:id", "/author/chapter", "/author/chapter/:idStory", "/author/chapter/:idStory/imageChapter",
        "/author/chapter/:idStory/textChapter/create", "/author/chapter/:idStory/textChapter/edit/:id", "/author/manga/:id/license",
        "/admin/dashboard", "/admin/user", "/admin/notifications", "/admin/notifications/send-general", "/admin/policies", "/admin/audit-logs",
        "/admin/genre", "/admin/style", "/admin/report", "/admin/license-management", "/admin/moderation/queue", "/admin/moderation/workspace", "/admin/manga", "/admin/withdraw",
        "/admin/comments", "/admin/my-notifications","/topup"],
}
