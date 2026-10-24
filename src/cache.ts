// Shared cache behind the Go Heavier list pages.
//
// These pages used to read and write sessionStorage, which is emptied when
// the tab closes - so every first visit of the day paid for a full load
// before anything appeared. They now cache in localStorage and render from
// it immediately, revalidating in the background only once an entry is old
// enough to be worth a request.
//
// Outliving the tab is the whole point, but it also means an entry can be
// arbitrarily old, so each one is stamped with the time it was written and
// callers decide for themselves how much staleness they'll tolerate.
import {
    EXERCISES_CACHE_KEY,
    LOCATIONS_CACHE_KEY,
    SESSIONS_CACHE_KEY,
    SESSION_STATS_CACHE_KEY,
    WORKOUTS_CACHE_KEY
} from "./configs"

/** An entry as it sits in storage: the payload, plus when it was written. */
interface CacheEnvelope {
    savedAt: number
    data: unknown
}

export interface CachedEntry<T> {
    data: T
    /** Epoch milliseconds, from Date.now() at the time of the write. */
    savedAt: number
}

// Long enough that moving between pages, or coming back to one a moment
// later, never costs a request; short enough that a workout logged on a
// phone shows up on the laptop without reaching for the refresh button.
export const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000

// Reading localStorage throws outright in Safari's private mode and wherever
// an embedder blocks storage, so every access goes through here. Losing the
// cache only costs a load, so there's nothing to report to the user.
function storage(): Storage | null {
    try {
        return window.localStorage
    } catch {
        return null
    }
}

function isEnvelope(value: unknown): value is CacheEnvelope {
    return (
        typeof value === "object" &&
        value !== null &&
        typeof (value as CacheEnvelope).savedAt === "number" &&
        "data" in value
    )
}

/**
 * Returns the cached entry for `key`, or null if there isn't a usable one.
 *
 * `isValid` guards against an entry written before an error response (e.g. a
 * 403 body) was excluded from what gets cached: such an entry is truthy, so
 * without the check it would be trusted as the list forever. An entry from a
 * build that predates the envelope fails the same check. Anything rejected is
 * deleted rather than left to be re-read on the next visit.
 */
export function readCache<T>(key: string, isValid: (data: unknown) => boolean): CachedEntry<T> | null {
    const store = storage()
    if (!store) {
        return null
    }

    const raw = store.getItem(key)
    if (!raw) {
        return null
    }

    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch {
        store.removeItem(key)
        return null
    }

    if (!isEnvelope(parsed) || !isValid(parsed.data)) {
        store.removeItem(key)
        return null
    }

    return { data: parsed.data as T, savedAt: parsed.savedAt }
}

export function writeCache(key: string, data: unknown): void {
    const store = storage()
    if (!store) {
        return
    }

    const envelope: CacheEnvelope = { savedAt: Date.now(), data }
    try {
        store.setItem(key, JSON.stringify(envelope))
    } catch (error) {
        // A full quota isn't worth failing a load over: the page already has
        // what it needs in memory and will just start cold next time.
        // Dropping the key stops a half-written value being read back.
        console.warn(`Could not cache ${key}:`, error)
        store.removeItem(key)
    }
}

export function clearCache(key: string): void {
    storage()?.removeItem(key)
}

/**
 * True when `entry` is missing or older than `maxAgeMs`, i.e. when it's worth
 * going back to the API. A fresh entry is still rendered either way - this
 * only decides whether a background revalidate follows.
 */
export function isStale(entry: CachedEntry<unknown> | null, maxAgeMs: number = DEFAULT_MAX_AGE_MS): boolean {
    if (!entry) {
        return true
    }
    const age = Date.now() - entry.savedAt
    // A clock that moved backwards, or an entry somehow stamped in the
    // future, would otherwise read as fresh indefinitely.
    return age < 0 || age > maxAgeMs
}

/** The shape most of these caches hold: a list of records. */
export function isArray(data: unknown): boolean {
    return Array.isArray(data)
}

export const ALL_CACHE_KEYS = [
    WORKOUTS_CACHE_KEY,
    SESSIONS_CACHE_KEY,
    SESSION_STATS_CACHE_KEY,
    EXERCISES_CACHE_KEY,
    LOCATIONS_CACHE_KEY
]

/**
 * Drops every cached list. Used on sign-out: the data describes one person's
 * gym history, and now that it survives the tab it would otherwise sit on a
 * shared machine for the next person to load.
 */
export function clearAllCaches(): void {
    ALL_CACHE_KEYS.forEach(clearCache)
}

// Written by builds before this module existed: bare arrays under unversioned
// keys, in sessionStorage for everything except workouts. Nothing reads them
// now, so they'd just sit there taking up quota.
const LEGACY_SESSION_KEYS = [
    "go-heavier-sessions",
    "go-heavier-exercises",
    "go-heavier-locations"
]
const LEGACY_LOCAL_KEYS = ["go-heavier-workouts", "go-heavier-workouts-v2"]

export function purgeLegacyCaches(): void {
    try {
        LEGACY_SESSION_KEYS.forEach(key => window.sessionStorage.removeItem(key))
    } catch {
        // No sessionStorage to clean up.
    }
    LEGACY_LOCAL_KEYS.forEach(clearCache)
}
