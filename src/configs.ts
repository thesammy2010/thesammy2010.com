// Create React App only exposes variables prefixed with REACT_APP_, so reading
// process.env.API_URL silently yielded undefined and every build fell back to
// localhost — including the production one, which has the real host in
// .env.production.
export const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"

// Every workout page the app has fetched, written by the workouts page. The
// suffix is bumped whenever the workout shape changes so a stale cache from an
// older schema is ignored rather than rendered.
export const WORKOUTS_CACHE_KEY = "go-heavier-workouts-v2"

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
