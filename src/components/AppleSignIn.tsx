import { useState } from "react"

import { API_URL, APPLE_CLIENT_ID } from "../configs"
import { setAppleSession } from "../auth"

// Apple's script for Sign in with Apple on the web, loaded on first use
const APPLE_SCRIPT = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"

interface AppleSignInResponse {
    authorization: { id_token: string }
    // Only on the first sign-in, and only what the person chose to share
    user?: { name?: { firstName?: string; lastName?: string }; email?: string }
}

interface AppleIdAuth {
    init: (config: { clientId: string; scope: string; redirectURI: string; usePopup: boolean }) => void
    signIn: () => Promise<AppleSignInResponse>
}

let loading: Promise<AppleIdAuth> | null = null

function loadApple(): Promise<AppleIdAuth> {
    loading ??= new Promise((resolve, reject) => {
        const script = document.createElement("script")
        script.src = APPLE_SCRIPT
        script.async = true
        script.onload = () => {
            const auth = (window as unknown as { AppleID?: { auth: AppleIdAuth } }).AppleID?.auth
            if (!auth) {
                reject(new Error("Sign in with Apple didn't load"))
                return
            }
            // Apple sends people back here, which has to be one of the
            // Services ID's return URLs; with a popup they never leave
            auth.init({
                clientId: APPLE_CLIENT_ID,
                scope: "name email",
                redirectURI: `${window.location.origin}/`,
                usePopup: true
            })
            resolve(auth)
        }
        script.onerror = () => {
            loading = null
            reject(new Error("Couldn't reach Apple"))
        }
        document.head.appendChild(script)
    })
    return loading
}

/** "Leo Parkes" from what Apple shares, or null when it shares no name. */
export function appleName(user: AppleSignInResponse["user"]): string | null {
    const name = [user?.name?.firstName, user?.name?.lastName].filter(Boolean).join(" ").trim()
    return name || null
}

// Signs in with Apple in a popup, then swaps Apple's identity token for the
// API's own session token, which signs the person up or links them to the
// account with their email. Only shown once a Services ID is configured.
export default function AppleSignIn() {
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!APPLE_CLIENT_ID) {
        return null
    }

    const signIn = async () => {
        setBusy(true)
        setError(null)
        try {
            const apple = await (await loadApple()).signIn()
            const name = appleName(apple.user)
            const response = await fetch(`${API_URL}/auth/apple`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identity_token: apple.authorization.id_token, name })
            })
            if (!response.ok) {
                throw new Error("Apple sign-in didn't work. Try again, or sign in with Google.")
            }
            const session = await response.json()
            setAppleSession(session.token, { name, email: apple.user?.email ?? null })
        } catch (err) {
            // Closing Apple's popup isn't worth a message
            const code = (err as { error?: string }).error
            if (code !== "popup_closed_by_user" && code !== "user_cancelled_authorize") {
                console.error("Sign in with Apple failed", err)
                setError((err as Error).message || "Apple sign-in didn't work")
            }
        } finally {
            setBusy(false)
        }
    }

    return (
        <>
            <button type="button" className="site-signin-apple" onClick={signIn} disabled={busy}>
                <svg aria-hidden="true" viewBox="0 0 14 17" width="14" height="17">
                    <path
                        fill="currentColor"
                        d="M11.6 9c0-2 1.7-3 1.8-3.1-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.2.8-.6 0-1.6-.7-2.7-.7C3.1 4.3 1.8 5.1 1.1 6.4c-1.5 2.6-.4 6.4 1 8.5.7 1 1.5 2.1 2.6 2.1 1 0 1.4-.7 2.7-.7 1.2 0 1.6.7 2.7.6 1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.3 0 0-2.1-.8-2.1-3.6zM9.5 2.9c.6-.7 1-1.6.8-2.6-.9 0-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.5 1 .1 2-.5 2.6-1.2z"
                    />
                </svg>
                {busy ? "Signing in..." : "Sign in with Apple"}
            </button>
            {error && (
                <span className="site-signin-error" role="alert">
                    {error}
                </span>
            )}
        </>
    )
}
