import { SESSIONS_CACHE_KEY, SESSION_STATS_CACHE_KEY, WORKOUTS_CACHE_KEY } from "./configs"
import { isSessionStats } from "./components/go_heavier/sessions"
import {
    ALL_CACHE_KEYS,
    DEFAULT_MAX_AGE_MS,
    clearAllCaches,
    clearCache,
    isArray,
    isStale,
    purgeLegacyCaches,
    readCache,
    writeCache
} from "./cache"

const KEY = "test-cache-key"

beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
})

describe("readCache / writeCache", () => {
    it("reads back what it wrote", () => {
        writeCache(KEY, [{ id: 1 }])
        expect(readCache<any[]>(KEY, isArray)?.data).toEqual([{ id: 1 }])
    })

    it("stamps the entry with the time of the write", () => {
        const before = Date.now()
        writeCache(KEY, [])
        const savedAt = readCache(KEY, isArray)?.savedAt as number
        expect(savedAt).toBeGreaterThanOrEqual(before)
        expect(savedAt).toBeLessThanOrEqual(Date.now())
    })

    it("returns null when nothing has been cached", () => {
        expect(readCache(KEY, isArray)).toBeNull()
    })

    // An error body (say a 403's {"detail": ...}) cached as if it were the
    // list is truthy, so without the validator it would be rendered as the
    // data forever.
    it("rejects and deletes an entry whose payload fails validation", () => {
        writeCache(KEY, { detail: "Forbidden" })
        expect(readCache(KEY, isArray)).toBeNull()
        expect(localStorage.getItem(KEY)).toBeNull()
    })

    // Builds before this module wrote the bare array with no envelope around
    // it, so there is no savedAt to judge staleness by.
    it("rejects and deletes a pre-envelope entry", () => {
        localStorage.setItem(KEY, JSON.stringify([{ id: 1 }]))
        expect(readCache(KEY, isArray)).toBeNull()
        expect(localStorage.getItem(KEY)).toBeNull()
    })

    it("rejects and deletes an entry that is not valid JSON", () => {
        localStorage.setItem(KEY, "{not json")
        expect(readCache(KEY, isArray)).toBeNull()
        expect(localStorage.getItem(KEY)).toBeNull()
    })

    // An empty list is a legitimate answer - someone with no sessions yet -
    // and must survive the round trip rather than reading as a cache miss.
    it("keeps an empty list", () => {
        writeCache(KEY, [])
        expect(readCache<any[]>(KEY, isArray)?.data).toEqual([])
    })

    it("leaves nothing behind when the quota is exhausted", () => {
        const setItem = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new DOMException("quota", "QuotaExceededError")
        })
        const warn = jest.spyOn(console, "warn").mockImplementation(() => {})

        expect(() => writeCache(KEY, [{ id: 1 }])).not.toThrow()

        setItem.mockRestore()
        warn.mockRestore()
        expect(readCache(KEY, isArray)).toBeNull()
    })
})

describe("isStale", () => {
    it("treats a missing entry as stale", () => {
        expect(isStale(null)).toBe(true)
    })

    it("treats a just-written entry as fresh", () => {
        writeCache(KEY, [])
        expect(isStale(readCache(KEY, isArray))).toBe(false)
    })

    it("treats an entry older than the max age as stale", () => {
        expect(isStale({ data: [], savedAt: Date.now() - DEFAULT_MAX_AGE_MS - 1 })).toBe(true)
    })

    it("honours a caller's own max age", () => {
        const entry = { data: [], savedAt: Date.now() - 1000 }
        expect(isStale(entry, 500)).toBe(true)
        expect(isStale(entry, 5000)).toBe(false)
    })

    // A clock that has moved backwards leaves entries stamped in the future,
    // which would otherwise read as fresh indefinitely.
    it("treats an entry stamped in the future as stale", () => {
        expect(isStale({ data: [], savedAt: Date.now() + 60_000 })).toBe(true)
    })
})

describe("clearCache / clearAllCaches", () => {
    it("clears one key", () => {
        writeCache(KEY, [])
        clearCache(KEY)
        expect(readCache(KEY, isArray)).toBeNull()
    })

    it("clears every cached list", () => {
        ALL_CACHE_KEYS.forEach(key => writeCache(key, [{ id: 1 }]))
        clearAllCaches()
        ALL_CACHE_KEYS.forEach(key => expect(readCache(key, isArray)).toBeNull())
    })

    // Signing out clears the caches; it must not sign the next visit out too
    // by taking unrelated keys with it.
    it("leaves keys it does not own alone", () => {
        localStorage.setItem("go-heavier-google-id-token", "a-token")
        clearAllCaches()
        expect(localStorage.getItem("go-heavier-google-id-token")).toBe("a-token")
    })

    it("covers the sessions, stats and workouts keys", () => {
        expect(ALL_CACHE_KEYS).toContain(SESSIONS_CACHE_KEY)
        expect(ALL_CACHE_KEYS).toContain(SESSION_STATS_CACHE_KEY)
        expect(ALL_CACHE_KEYS).toContain(WORKOUTS_CACHE_KEY)
    })
})

describe("isSessionStats", () => {
    it("accepts a stats payload", () => {
        writeCache(SESSION_STATS_CACHE_KEY, { sessions: 42, average_sets_per_session: 12 })
        const cached = readCache<any>(SESSION_STATS_CACHE_KEY, isSessionStats)
        expect(cached?.data.sessions).toBe(42)
    })

    // Stats are an object rather than a list, so isArray can't do the job -
    // and an error body is an object too, which is what this has to exclude.
    it("rejects an error body cached in the stats slot", () => {
        localStorage.setItem(
            SESSION_STATS_CACHE_KEY,
            JSON.stringify({ savedAt: Date.now(), data: { detail: "Forbidden" } })
        )
        expect(readCache(SESSION_STATS_CACHE_KEY, isSessionStats)).toBeNull()
        expect(localStorage.getItem(SESSION_STATS_CACHE_KEY)).toBeNull()
    })

    it("rejects a list, a null and a bare number", () => {
        expect(isSessionStats([])).toBe(false)
        expect(isSessionStats(null)).toBe(false)
        expect(isSessionStats(7)).toBe(false)
    })

    // Someone with no sessions logged yet still gets real stats back.
    it("accepts a zeroed payload", () => {
        expect(isSessionStats({ sessions: 0 })).toBe(true)
    })
})

describe("purgeLegacyCaches", () => {
    it("drops the pre-localStorage sessionStorage entries", () => {
        sessionStorage.setItem("go-heavier-sessions", "[]")
        sessionStorage.setItem("go-heavier-exercises", "[]")
        sessionStorage.setItem("go-heavier-locations", "[]")

        purgeLegacyCaches()

        expect(sessionStorage.getItem("go-heavier-sessions")).toBeNull()
        expect(sessionStorage.getItem("go-heavier-exercises")).toBeNull()
        expect(sessionStorage.getItem("go-heavier-locations")).toBeNull()
    })

    it("drops the superseded workouts keys", () => {
        localStorage.setItem("go-heavier-workouts-v2", "[]")
        purgeLegacyCaches()
        expect(localStorage.getItem("go-heavier-workouts-v2")).toBeNull()
    })

    it("leaves the current caches alone", () => {
        writeCache(WORKOUTS_CACHE_KEY, [{ id: 1 }])
        purgeLegacyCaches()
        expect(readCache<any[]>(WORKOUTS_CACHE_KEY, isArray)?.data).toEqual([{ id: 1 }])
    })
})
