// Holds the signed-in user's Google ID token outside React state, so plain
// functions (sessions.ts, logWorkout.ts, ...) can attach it to a request
// without every caller threading it through as an argument. Components that
// need to react to sign-in/sign-out use the useAuthToken hook below, which is
// just a thin subscription over the same value.
import { useEffect, useState } from "react"

const TOKEN_KEY = "go-heavier-google-id-token"

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
    try {
        const payload = idToken.split(".")[1]
        const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
        const claims = JSON.parse(decodeURIComponent(escape(json)))
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

export function signOut(): void {
    setToken(null)
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
// user's Google ID token so protected routes (require_viewer/require_editor)
// see it, and is a no-op otherwise so signed-out callers behave exactly as
// they did before auth existed.
export function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
    if (!token) {
        return fetch(input, init)
    }

    const headers = new Headers(init.headers)
    headers.set("Authorization", `Bearer ${token}`)
    return fetch(input, { ...init, headers })
}
