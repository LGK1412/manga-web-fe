// app/api/auth/check-login/route.ts
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = cookies();
  const token = (await cookieStore).get("access_token");
  if (!token) {
    return Response.json({ isLogin: false });
  }
  // TODO: verify token ở đây
  return Response.json({ isLogin: true});
}
