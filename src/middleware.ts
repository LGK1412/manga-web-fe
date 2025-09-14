// middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
    const token = req.cookies.get("access_token")?.value

    let isLogin = false
    if (token) {
        isLogin = true
    } else {
        isLogin = false

    }

    const pathname = req.nextUrl.pathname

    const dontNeedLoginPages = ["/login", "/verify-email", "/register", "/forgot-password", "/reset-forgot-password"]
    if (dontNeedLoginPages.includes(pathname) && isLogin) {
        return NextResponse.redirect(new URL("/", req.url))
    }

    const mustLoginPages = ["/change-password"]
    if (mustLoginPages.includes(pathname) && !isLogin) {
        return NextResponse.redirect(new URL("/login", req.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ["/login", "/verify-email", "/register", "/forgot-password", "/reset-forgot-password", "/change-password"],
}
