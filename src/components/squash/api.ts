// Types and requests for the /squash API.
//
// Squash access doesn't come from a role: the API lets in anyone who's an
// active player in the group, plus admins, so friends can use it without
// seeing anything else. /endpoints reports every squash route as GUEST, which
// canAccess() can't tell apart from "any signed-in user", so membership is
// read from GET /squash/players/me instead (see useSquashAccess).
import { useEffect, useRef, useState } from "react"

import { API_URL, ApiError } from "../../configs"
import { apiFetch, getToken, subscribeToken } from "../../auth"

export type MatchFormat = "singles" | "doubles"
export type MatchStatus = "scheduled" | "in_progress" | "completed" | "cancelled"
export type Side = 1 | 2

export interface Player {
    id: string
    name: string
    user_id: string | null
    email: string | null
    is_active: boolean
}

export interface PlayerInput {
    name: string
    user_id: string | null
    email: string | null
    is_active: boolean
}

export interface MatchPlayer {
    player_id: string
    side: Side
}

export interface Game {
    number: number
    side1_points: number
    side2_points: number
    winning_side: Side | null
    // 0 for a game whose score was entered rather than scored live
    rallies: number
}

export interface MatchInput {
    format: MatchFormat
    status: MatchStatus
    played_at: string | null
    // One of /squash/venues
    venue_id: string | null
    points_to: number
    best_of: number | null
    notes: string | null
    players: MatchPlayer[]
}

export interface Match extends MatchInput {
    id: string
    // The venue's name, for showing
    venue: string | null
    games: Game[]
    side1_games: number
    side2_games: number
    winning_side: Side | null
    serving_side: Side | null
    version: number
    created_by_id: string
    created_at: string
}

export interface Rally {
    game: number
    number: number
    won_by_side: Side
    server_id: string | null
    side1_points: number
    side2_points: number
}

export interface PlayerStats {
    player_id: string
    matches_played: number
    matches_won: number
    matches_lost: number
    matches_drawn: number
    games_won: number
    games_lost: number
    points_won: number
    points_lost: number
    win_rate: number | null
}

export interface HeadToHead {
    player_id: string
    opponent_id: string
    matches_played: number
    matches_won: number
    matches_lost: number
    matches_drawn: number
    games_won: number
    games_lost: number
}

export interface VenueInput {
    name: string
    address: string | null
    notes: string | null
    is_active: boolean
}

export interface Venue extends VenueInput {
    id: string
}

// A player's place on the Elo ladder. Everyone starts on 1000.
export interface Rating {
    rank: number
    player_id: string
    name: string
    rating: number
    matches_rated: number
    // Too few matches for the rating to mean much yet
    provisional: boolean
    peak: number
    last_change: number
}

// What one completed match did to a player's rating
export interface RatingChange {
    match_id: string
    played_at: string | null
    rating_before: number
    rating_after: number
    change: number
}

// A side's, or a player's, rallies in games scored live. Rates are null
// with nothing to divide by.
export interface RallyInsights {
    side: Side | null
    rallies_played: number
    rallies_won: number
    rally_win_rate: number | null
    serves_played: number
    serves_won: number
    serve_win_rate: number | null
    receives_played: number
    receives_won: number
    receive_win_rate: number | null
    longest_run: number
    biggest_lead: number
    game_points: number
    game_points_won: number
    game_point_win_rate: number | null
}

export interface PlayerInsights {
    player_id: string
    games_scored_live: number
    rallies: RallyInsights
    // Games won from 3 or more down, and lost from 3 or more up
    comebacks: number
    biggest_comeback: number
    leads_lost: number
    // Every game that reached one short all, live or not
    deuce_games_won: number
    deuce_games_lost: number
}

export interface GameInsights {
    number: number
    scored_live: boolean
    went_to_deuce: boolean
    comeback_by_side: Side | null
    deepest_deficit: number | null
    // Empty for a game not scored live
    sides: RallyInsights[]
}

export interface MatchInsights {
    match_id: string
    // Each side over every game scored live
    sides: RallyInsights[]
    games: GameInsights[]
}

// Matches the API's DEFAULT_DB_PAGE_SIZE: a shorter page is the last one.
export const MATCHES_PAGE_SIZE = 50

/**
 * Someone else changed the match first: a rally, undo or completion sent
 * against an older version. The API sends the match as it is now, so the
 * scorer can show it straight away instead of making another request.
 */
export class StaleMatchError extends ApiError {
    match: Match

    constructor(message: string, match: Match) {
        super(409, message)
        this.match = match
    }
}

// FastAPI puts the reason in `detail`: a string for most errors, a list of
// field errors for a 422, and for a squash 409 an object holding the match.
async function toError(response: Response, fallback: string): Promise<ApiError> {
    if (response.status === 403) {
        return new ApiError(403, fallback)
    }
    try {
        const detail = (await response.json())?.detail
        if (response.status === 409 && detail?.match) {
            return new StaleMatchError(detail.detail ?? "The match changed", detail.match)
        }
        if (typeof detail === "string") {
            return new ApiError(response.status, detail)
        }
        if (Array.isArray(detail) && typeof detail[0]?.msg === "string") {
            // "Value error, A player can only be in a match once"
            return new ApiError(response.status, detail[0].msg.replace(/^Value error, /, ""))
        }
    } catch {
        // Not JSON; use the fallback.
    }
    return new ApiError(response.status, fallback)
}

type Query = Record<string, string | number | boolean | null | undefined>

function url(path: string, query: Query = {}): string {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
            params.set(key, String(value))
        }
    })
    const search = params.toString()
    return `${API_URL}/squash${path}${search ? `?${search}` : ""}`
}

async function request<T>(
    method: string,
    path: string,
    fallback: string,
    { query, body }: { query?: Query; body?: unknown } = {}
): Promise<T> {
    const response = await apiFetch(url(path, query), {
        method,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body)
    })
    if (!response.ok) {
        throw await toError(response, fallback)
    }
    return response.status === 204 ? (undefined as T) : response.json()
}

export interface MatchFilters {
    player_id?: string
    status?: MatchStatus
    format?: MatchFormat
}

export const squashApi = {
    players: (includeInactive = false) =>
        request<Player[]>("GET", "/players", "Failed to load players", {
            query: { include_inactive: includeInactive }
        }),
    player: (id: string) => request<Player>("GET", `/players/${id}`, "Failed to load the player"),
    createPlayer: (body: PlayerInput) => request<Player>("POST", "/players", "Failed to add the player", { body }),
    updatePlayer: (id: string, body: PlayerInput) =>
        request<Player>("PUT", `/players/${id}`, "Failed to save the player", { body }),
    playerStats: (id: string) => request<PlayerStats>("GET", `/players/${id}/stats`, "Failed to load stats"),
    headToHead: (id: string, opponentId: string) =>
        request<HeadToHead>("GET", `/players/${id}/head-to-head/${opponentId}`, "Failed to load the head-to-head"),
    // Highest rated first; without a format every match counts to one rating
    ratings: (format?: MatchFormat) =>
        request<Rating[]>("GET", "/ratings", "Failed to load the ratings", { query: { format } }),
    // Oldest first
    ratingHistory: (id: string, format?: MatchFormat) =>
        request<RatingChange[]>("GET", `/players/${id}/ratings`, "Failed to load the rating history", {
            query: { format }
        }),
    playerInsights: (id: string, format?: MatchFormat) =>
        request<PlayerInsights>("GET", `/players/${id}/insights`, "Failed to load the insights", { query: { format } }),

    venues: (includeInactive = false) =>
        request<Venue[]>("GET", "/venues", "Failed to load venues", { query: { include_inactive: includeInactive } }),
    createVenue: (body: VenueInput) => request<Venue>("POST", "/venues", "Failed to add the venue", { body }),
    updateVenue: (id: string, body: VenueInput) =>
        request<Venue>("PUT", `/venues/${id}`, "Failed to save the venue", { body }),

    matches: (filters: MatchFilters, page: number) =>
        request<Match[]>("GET", "/matches", "Failed to load matches", { query: { ...filters, page } }),
    match: (id: string) => request<Match>("GET", `/matches/${id}`, "Failed to load the match"),
    // null while the match is still at `since`: the API answers 204, which
    // keeps polling every couple of seconds cheap.
    pollMatch: (id: string, since: number) =>
        request<Match | undefined>("GET", `/matches/${id}`, "Failed to refresh the match", {
            query: { since_version: since }
        }).then((match) => match ?? null),
    createMatch: (body: MatchInput) => request<Match>("POST", "/matches", "Failed to create the match", { body }),
    updateMatch: (id: string, body: MatchInput) =>
        request<Match>("PUT", `/matches/${id}`, "Failed to save the match", { body }),
    deleteMatch: (id: string) => request<void>("DELETE", `/matches/${id}`, "Failed to delete the match"),
    // Answers with whichever of the two was played first, which is kept; the
    // other is deleted.
    mergeMatches: (id: string, otherId: string) =>
        request<Match>("POST", `/matches/${id}/merge`, "Failed to merge the matches", {
            body: { match_id: otherId }
        }),
    completeMatch: (id: string, version: number) =>
        request<Match>("POST", `/matches/${id}/complete`, "Failed to end the match", { query: { version } }),
    setGame: (id: string, number: number, body: { side1_points: number; side2_points: number }) =>
        request<Match>("PUT", `/matches/${id}/games/${number}`, "Failed to save the game", { body }),
    deleteLastGame: (id: string) => request<Match>("DELETE", `/matches/${id}/games/last`, "Failed to remove the game"),
    matchInsights: (id: string) =>
        request<MatchInsights>("GET", `/matches/${id}/insights`, "Failed to load the insights"),
    rallies: (id: string) => request<Rally[]>("GET", `/matches/${id}/rallies`, "Failed to load the rallies"),
    addRally: (id: string, wonBySide: Side, version: number) =>
        request<Match>("POST", `/matches/${id}/rallies`, "Failed to score the point", {
            body: { won_by_side: wonBySide, version }
        }),
    undoRally: (id: string, version: number) =>
        request<Match>("DELETE", `/matches/${id}/rallies/last`, "Failed to undo the point", { query: { version } })
}

export type SquashAccess =
    | { status: "loading" }
    | { status: "signedOut" }
    // Signed in, but neither a player nor an admin
    | { status: "denied" }
    | { status: "error"; message: string }
    // `me` is null for an admin who doesn't play
    | { status: "member"; me: Player | null }

let access: SquashAccess = { status: "loading" }
let started = false
// Bumped per check, so a slow answer for a token that has since changed
// can't overwrite the newer one.
let checkId = 0
const listeners = new Set<() => void>()

function setAccess(next: SquashAccess): void {
    access = next
    listeners.forEach((listener) => listener())
}

// /players/me answers an admin who doesn't play with a 404 saying so. Any
// other 404, such as FastAPI's own "Not Found" from an API that doesn't have
// /squash yet, means squash isn't there to use.
async function isNotAPlayer(response: Response): Promise<boolean> {
    try {
        const detail = (await response.json())?.detail
        return typeof detail === "string" && detail !== "Not Found"
    } catch {
        return false
    }
}

// What GET /squash/players/me says about the caller.
export async function accessFrom(response: Response): Promise<SquashAccess> {
    if (response.ok) {
        return { status: "member", me: await response.json() }
    }
    if (response.status === 404) {
        return (await isNotAPlayer(response))
            ? // An admin who doesn't play: let in, with no player of their own.
              { status: "member", me: null }
            : { status: "error", message: "Squash isn't available on this server yet" }
    }
    if (response.status === 401 || response.status === 403) {
        return { status: "denied" }
    }
    return { status: "error", message: "Couldn't check whether you're in the squash group" }
}

async function checkAccess(): Promise<void> {
    const id = ++checkId
    if (!getToken()) {
        setAccess({ status: "signedOut" })
        return
    }
    setAccess({ status: "loading" })
    let next: SquashAccess
    try {
        next = await accessFrom(await apiFetch(url("/players/me")))
    } catch (error) {
        console.error("Failed to check squash membership", error)
        next = { status: "error", message: "Couldn't reach the server" }
    }
    if (id === checkId) {
        setAccess(next)
    }
}

// The first caller starts the check; later ones share it. It runs again
// whenever the signed-in user changes.
export function useSquashAccess(): SquashAccess {
    const [, forceRender] = useState(0)
    useEffect(() => {
        const listener = () => forceRender((n) => n + 1)
        listeners.add(listener)
        if (!started) {
            started = true
            subscribeToken(() => void checkAccess())
            void checkAccess()
        }
        return () => {
            listeners.delete(listener)
        }
    }, [])
    return access
}

export type LoadState<T> =
    | { status: "loading" }
    | { status: "signedOut" }
    | { status: "denied" }
    | { status: "error"; message: string }
    | { status: "ready"; data: T; me: Player | null }

/**
 * Runs `load` once squash membership is confirmed, and again whenever `deps`
 * change or reload() is called. Data from the previous load stays in `state`
 * while the next is in flight, with `refreshing` set.
 */
export function useSquashLoad<T>(load: () => Promise<T>, deps: unknown[]) {
    const membership = useSquashAccess()
    const [state, setState] = useState<LoadState<T>>({ status: "loading" })
    const [refreshing, setRefreshing] = useState(false)
    const [nonce, setNonce] = useState(0)
    const loadRef = useRef(load)
    loadRef.current = load
    const me = membership.status === "member" ? membership.me : null

    useEffect(() => {
        if (membership.status === "loading") {
            return
        }
        if (membership.status !== "member") {
            setState(membership)
            return
        }

        let cancelled = false
        setRefreshing(true)
        loadRef.current().then(
            (data) => {
                if (!cancelled) {
                    setState({ status: "ready", data, me })
                    setRefreshing(false)
                }
            },
            (error) => {
                if (!cancelled) {
                    console.error("Error loading squash data:", error)
                    setState({ status: "error", message: (error as Error).message })
                    setRefreshing(false)
                }
            }
        )
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [membership.status, me?.id, nonce, ...deps])

    return { state, setState, refreshing, reload: () => setNonce((n) => n + 1) }
}
