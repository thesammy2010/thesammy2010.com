// Holds the signed-in user's token outside React state, so plain functions
// (sessions.ts, logWorkout.ts, ...) can attach it to a request without every
// caller threading it through as an argument. Components that need to react
// to sign-in/sign-out use the useAuthToken hook below, which is just a thin
// subscription over the same value.
//
// The token is a Google ID token, or, for someone who signed in with Apple,
// the API's own session token, which it gives in exchange for Apple's and
// which renews through /auth/refresh rather than through Google.
import { useEffect, useState } from "react"
import { googleLogout } from "@react-oauth/google"

const TOKEN_KEY = "go-heavier-google-id-token"
// What Apple shared at sign-in, as the API's session token carries no name
// and Apple only gives one the first time
const APPLE_PROFILE_KEY = "site-apple-profile"
// Renewed once it's this close to running out
const REFRESH_WITHIN_MS = 30 * 24 * 60 * 60 * 1000

export interface AppleProfile {
    name: string | null
    email: string | null
}

export interface GoogleProfile {
    name: string
    email: string
    picture: string
    // Seconds since epoch; the ID token is rejected by Google's verifier once
    // this passes, so the UI treats it as signed-out slightly before then.
    exp: number
}

type Listener = (token: string | null) => void

let token: string | null = readStoredToken()
const listeners = new Set<Listener>()

function readStoredToken(): string | null {
    try {
        return localStorage.getItem(TOKEN_KEY)
    } catch {
        return null
    }
}

// The ID token is a JWT; decoding the payload locally (no signature check) is
// only ever used to read the expiry and profile fields for display, never to
// authorize anything - the API is the one that verifies the signature.
export function decodeProfile(idToken: string): GoogleProfile | null {
    // A session token from signing in with Apple has no name or picture of
    // its own, so they come from what Apple shared then
    try {
        const payload = idToken.split(".")[1]
        const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
        const claims = JSON.parse(decodeURIComponent(escape(json)))
        if (claims.provider === "apple") {
            const apple = readAppleProfile()
            return {
                name: apple?.name || apple?.email || claims.email || "Apple account",
                email: apple?.email ?? claims.email ?? "",
                picture: "",
                exp: claims.exp
            }
        }
        return {
            name: claims.name,
            email: claims.email,
            picture: claims.picture,
            exp: claims.exp
        }
    } catch {
        return null
    }
}

export function isExpired(idToken: string): boolean {
    const profile = decodeProfile(idToken)
    if (!profile) {
        return true
    }
    return Date.now() >= profile.exp * 1000
}

if (token && isExpired(token)) {
    token = null
    try {
        localStorage.removeItem(TOKEN_KEY)
    } catch {
        // ignore
    }
}

function readAppleProfile(): AppleProfile | null {
    try {
        const stored = localStorage.getItem(APPLE_PROFILE_KEY)
        return stored ? (JSON.parse(stored) as AppleProfile) : null
    } catch {
        return null
    }
}

/**
 * Signs in with the API's session token from signing in with Apple, keeping
 * the name and email Apple shared alongside it. A later sign-in without a
 * name, as Apple sends after the first, keeps the one already kept.
 */
export function setAppleSession(sessionToken: string, profile: AppleProfile): void {
    const kept = readAppleProfile()
    try {
        localStorage.setItem(
            APPLE_PROFILE_KEY,
            JSON.stringify({ name: profile.name ?? kept?.name ?? null, email: profile.email ?? kept?.email ?? null })
        )
    } catch {
        // The name shown just falls back to the email
    }
    setToken(sessionToken)
}

/** Whether the token is the API's session token, from signing in with Apple. */
export function isSessionToken(candidate: string): boolean {
    try {
        const json = atob(candidate.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
        return JSON.parse(json).provider === "apple"
    } catch {
        return false
    }
}

/**
 * Renews a session token from signing in with Apple once it's within a
 * month of running out, so someone who visits now and then stays signed
 * in. A Google token renews through Google instead.
 */
export async function refreshSessionIfDue(apiUrl: string): Promise<void> {
    const current = token
    const profile = current ? decodeProfile(current) : null
    if (!current || !profile || !isSessionToken(current) || profile.exp * 1000 - Date.now() > REFRESH_WITHIN_MS) {
        return
    }
    try {
        const response = await apiFetch(`${apiUrl}/auth/refresh`, { method: "POST" })
        if (response.ok) {
            const { token: renewed } = await response.json()
            if (token === current) {
                setToken(renewed)
            }
        } else if (response.status === 401) {
            // The account's gone, or the token's no longer good
            setToken(null)
        }
    } catch (error) {
        console.error("Failed to renew the session", error)
    }
}

export function getToken(): string | null {
    return token
}

export function setToken(next: string | null): void {
    token = next
    try {
        if (next) {
            localStorage.setItem(TOKEN_KEY, next)
        } else {
            localStorage.removeItem(TOKEN_KEY)
        }
    } catch {
        // ignore - loss of persistence just means signing in again next visit
    }
    listeners.forEach(listener => listener(next))
}

// Leaves the browser as a first-time visitor would find it: no token, no
// cached gym history (which outlives the tab and would otherwise sit on a
// shared machine for whoever signs in next), and no in-memory state.
export function signOut(): void {
    setToken(null)
    try {
        localStorage.clear()
        sessionStorage.clear()
    } catch {
        // No storage to clear.
    }
    // Without this One Tap silently signs the same account straight back in
    // on the next page load.
    googleLogout()
    // A full load rather than a router navigation, so every page component
    // and module-level value (roles, access maps) starts from scratch too.
    window.location.assign(`${process.env.PUBLIC_URL}/`)
}

export function useAuthToken(): string | null {
    const [current, setCurrent] = useState(token)

    useEffect(() => {
        listeners.add(setCurrent)
        return () => {
            listeners.delete(setCurrent)
        }
    }, [])

    return current
}

// Lets non-React modules (roles.ts) react to sign-in/sign-out without going
// through the hook. Returns an unsubscribe function.
export function subscribeToken(listener: Listener): () => void {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

// Drop-in replacement for fetch() against the API: attaches the signed-in
// user's token so protected routes (require_viewer/require_editor) see it, and is a no-op otherwise so signed-out callers behave exactly as
// they did before auth existed.
export function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
    if (!token) {
        return fetch(input, init)
    }

    const headers = new Headers(init.headers)
    headers.set("Authorization", `Bearer ${token}`)
    return fetch(input, { ...init, headers })
}
