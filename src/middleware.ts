// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
    const token = req.cookies.get('access_token')?.value;
    console.log(process.env.NEXT_PUBLIC_API_URL)
    console.log(process.env.JWT_SECRET)
    if (token) {
        return NextResponse.next();
    }

    // Nếu không có token thì redirect về login
    return NextResponse.redirect(new URL('/', req.url));
}

export const config = {
    matcher: ['/game'],
};
