import { API_URL } from "../../configs"

// A session is one visit to a gym. Sets belong to a session, and the session
// carries the location and the time — a set no longer carries either itself.
export interface SessionSummary {
    id: string
    workout_time: string
    location_id: string
    location: string
    sets: number
    exercises: number
    repetitions: number
    volume_kg: number
    heaviest_weight_kg: number
}

export const SESSIONS_CACHE_KEY = "go-heavier-sessions"

// Guard on the page walk so a misbehaving endpoint can't loop forever.
const MAX_SESSION_PAGES = 500

// StrictMode mounts a component twice in development, and several pages ask for
// the full list at once. Concurrent callers share one walk rather than each
// starting their own; the entry clears as soon as it settles.
let inFlight: Promise<SessionSummary[]> | null = null

export function fetchAllSessions(exerciseId?: string): Promise<SessionSummary[]> {
    if (exerciseId) {
        return walkSessions(exerciseId)
    }

    if (!inFlight) {
        inFlight = walkSessions().finally(() => {
            inFlight = null
        })
    }

    return inFlight
}

// The endpoint pages its results, newest first, so walk until one comes back empty.
async function walkSessions(exerciseId?: string): Promise<SessionSummary[]> {
    const all: SessionSummary[] = []

    for (let page = 1; page <= MAX_SESSION_PAGES; page++) {
        const params = new URLSearchParams({ page: String(page) })
        if (exerciseId) {
            params.set("exercise_id", exerciseId)
        }

        const response = await fetch(`${API_URL}/go-heavier/sessions?${params}`)
        if (!response.ok) {
            throw new Error("Failed to load sessions")
        }

        const pageSessions: SessionSummary[] = await response.json()
        if (pageSessions.length === 0) {
            break
        }
        all.push(...pageSessions)
    }

    return all
}

export function indexSessions(sessions: SessionSummary[]): Record<string, SessionSummary> {
    const byId: Record<string, SessionSummary> = {}
    sessions.forEach(session => {
        byId[session.id] = session
    })
    return byId
}
