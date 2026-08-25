import { API_URL, ApiError } from "../../configs"
import { apiFetch } from "../../auth"

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
    heaviest_weight_kg: number | null
}

export interface SessionHighlight {
    id: string
    workout_time: string
    location: string
    sets: number
    volume_kg: number
}

export interface WeekdayStats {
    weekday: string
    sessions: number
    sets: number
    volume_kg: number
}

export interface SessionStats {
    sessions: number
    first_session: string | null
    last_session: string | null
    average_sets_per_session: number
    average_exercises_per_session: number
    average_repetitions_per_session: number
    average_volume_kg_per_session: number
    average_days_between_sessions: number | null
    longest_gap_days: number | null
    busiest_session: SessionHighlight | null
    heaviest_session: SessionHighlight | null
    by_weekday?: WeekdayStats[]
}

export const SESSIONS_CACHE_KEY = "go-heavier-sessions"

export async function fetchSessionStats(): Promise<SessionStats> {
    const response = await apiFetch(`${API_URL}/go-heavier/sessions/stats`)
    if (!response.ok) {
        throw new ApiError(response.status, "Failed to load session stats")
    }
    return response.json()
}

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

        const response = await apiFetch(`${API_URL}/go-heavier/sessions?${params}`)
        if (!response.ok) {
            throw new ApiError(response.status, "Failed to load sessions")
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

export interface MonthlyTotals {
    label: string
    visits: number
    sets: number
    repetitions: number
    volume_kg: number
}

// One entry per month between the first and last session, including months with
// nothing in them — dropping a quiet month would flatter the trend.
export function buildMonthlyTotals(sessions: SessionSummary[]): MonthlyTotals[] {
    if (sessions.length === 0) {
        return []
    }

    const times = sessions.map(session => new Date(session.workout_time).getTime())
    const first = new Date(Math.min(...times))
    const last = new Date(Math.max(...times))

    const months: MonthlyTotals[] = []
    const cursor = new Date(first.getFullYear(), first.getMonth(), 1)
    const end = new Date(last.getFullYear(), last.getMonth(), 1)

    while (cursor <= end) {
        const year = cursor.getFullYear()
        const month = cursor.getMonth()

        const inMonth = sessions.filter(session => {
            const when = new Date(session.workout_time)
            return when.getFullYear() === year && when.getMonth() === month
        })

        months.push({
            label: cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
            visits: inMonth.length,
            sets: inMonth.reduce((total, session) => total + session.sets, 0),
            repetitions: inMonth.reduce((total, session) => total + session.repetitions, 0),
            volume_kg: inMonth.reduce((total, session) => total + session.volume_kg, 0)
        })

        cursor.setMonth(cursor.getMonth() + 1)
    }

    return months
}
