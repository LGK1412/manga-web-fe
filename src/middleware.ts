// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import axios from 'axios';

export async function middleware(req: NextRequest) {
    try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/check-login`, {
            withCredentials: true
        });

        const pathname = req.nextUrl.pathname;
        
        // Các trang không login thì mới dc vào
        const dontNeedLoginPages = ['/login', '/verify-email', '/register', '/forgot-password', '/reset-forgot-password'];
        if (dontNeedLoginPages.includes(pathname) && res.data.isLogin) {
            return NextResponse.redirect(new URL('/', req.url));
        }

        // Các trang cần login thì mới dc vào
        const mustLoginPages = ['/change-password'];

        if (mustLoginPages.includes(pathname) && !res.data.isLogin) {
            return NextResponse.redirect(new URL('/login', req.url));
        }

        return NextResponse.next();
    } catch (err) {
        return NextResponse.next();
    }
}

export const config = {
    matcher: ['/login', '/verify-email', '/register',
        '/forgot-password', '/reset-forgot-password', '/change-password',
    ],
};
