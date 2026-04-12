import Cookies from 'js-cookie';

function notifyAuthCookieChange() {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth:cookie-changed"))
    }
}

export async function removeCookie() {
    await Cookies.remove("user_normal_info", { path: "/" })
    window.dispatchEvent(new Event("auth:cookie-changed"));
    notifyAuthCookieChange()
}

export async function setCookie(tokenPayload: any) {
    const palyerInfo = {
        user_id: tokenPayload.user_id,
        email: tokenPayload.email,
        username: tokenPayload.username,
        role: tokenPayload.role,
        avatar: tokenPayload.avatar,
        bio: tokenPayload.bio,
        point: tokenPayload.point,
        author_point: tokenPayload.author_point,
        game_point: tokenPayload.game_point,
        lastBonus: tokenPayload.lastBonus
    }

    Cookies.set("user_normal_info", JSON.stringify(palyerInfo), {
        expires: 360,
        path: "/",
    })
    notifyAuthCookieChange()
}
