// Create React App only exposes variables prefixed with REACT_APP_, so reading
// process.env.API_URL silently yielded undefined and every build fell back to
// localhost — including the production one, which has the real host in
// .env.production.
export const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"

// Google's OAuth client ID, matching GOOGLE_CLIENT_ID on the API. Not a
// secret - it identifies the app to Google, it doesn't authenticate anything.
export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || ""

// Keys for the cached Go Heavier lists, all read and written through
// src/cache.ts. The suffix is bumped whenever the cached shape changes so an
// entry from an older build is ignored rather than rendered; all four moved
// up a version when the caches gained a savedAt stamp and moved from
// sessionStorage to localStorage.
export const WORKOUTS_CACHE_KEY = "go-heavier-workouts-v3"
export const SESSIONS_CACHE_KEY = "go-heavier-sessions-v2"
export const EXERCISES_CACHE_KEY = "go-heavier-exercises-v2"
export const LOCATIONS_CACHE_KEY = "go-heavier-locations-v2"
export const SESSION_STATS_CACHE_KEY = "go-heavier-session-stats-v1"

export function countryCodeToEmoji(countryCode: string): string {
    const codePoints = countryCode
        .toUpperCase()
        .split("")
        .map((char) => 127397 + char.charCodeAt(0))
    return String.fromCodePoint(...codePoints)
}

// Missing free-text values come back from the API as placeholder strings
// ("NaN", "None", "null") rather than as an empty value or JSON null.
const TEXT_PLACEHOLDERS = new Set(["nan", "none", "null", "undefined"])

export function formatNotes(notes?: string | null): string {
    const trimmed = (notes ?? "").trim()
    return TEXT_PLACEHOLDERS.has(trimmed.toLowerCase()) ? "" : trimmed
}

export const PERMISSION_DENIED_MESSAGE =
    "You don't have permission to do this. Ask an admin to grant you a higher role."

// Thrown after a !response.ok check so callers that already surface
// error.message verbatim (most of this app's catch blocks) get a message
// that tells a caller apart from a genuinely broken/unreachable API,
// instead of both looking like "the server failed".
export class ApiError extends Error {
    status: number

    constructor(status: number, fallbackMessage: string) {
        super(status === 403 ? PERMISSION_DENIED_MESSAGE : fallbackMessage)
        this.status = status
    }
}
