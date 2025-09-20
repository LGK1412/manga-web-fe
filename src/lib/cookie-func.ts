import Cookies from 'js-cookie';

export async function removeCookie() {
    await Cookies.remove("user_normal_info", { path: "/" })
}

export async function setCookie(tokenPayload: any) {
    const palyerInfo = {
        user_id: tokenPayload.user_id,
        email: tokenPayload.email,
        username: tokenPayload.username,
        role: tokenPayload.role,
        avatar: tokenPayload.avatar,
        bio: tokenPayload.bio
    }

    Cookies.set("user_normal_info", JSON.stringify(palyerInfo), {
        expires: 360,
        path: "/",
    })
}