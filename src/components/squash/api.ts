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
// The service boxes, as the server faces the front wall
export type Box = "right" | "left"

export interface Player {
    id: string
    name: string
    user_id: string | null
    email: string | null
    is_active: boolean
    // The box they like to start a hand serving from; null, or missing from
    // an API that hasn't got it yet, for no preference
    preferred_box?: Box | null
}

// What a player chooses for themselves. A field left out stays as it is,
// and null clears it, except the name, which can't be cleared.
export interface PlayerPreferences {
    // What the group sees them called, in every match
    name?: string
    preferred_box?: Box | null
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
    // Seconds from its first rally to its winning point, for a finished game
    // scored live; null otherwise, or missing from an API from before
    duration_seconds?: number | null
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
    // Only admins and its players see how it went
    is_private: boolean
    // Whether the scorers follow which service box each serve is from;
    // missing from an API from before it could be turned off
    tracks_box?: boolean
    players: MatchPlayer[]
}

export interface Match extends MatchInput {
    id: string
    // The venue's name, for showing
    venue: string | null
    // A private match the caller isn't in: only who played and when are
    // given, with no venue, notes or games, and null games won and winner
    hidden: boolean
    games: Game[]
    side1_games: number | null
    side2_games: number | null
    winning_side: Side | null
    // Its timed games' seconds together; null with none timed
    duration_seconds?: number | null
    serving_side: Side | null
    // Who serves first, from the racket the API spins as the match is
    // arranged. Null for a match arranged before then, or when hidden
    first_serving_side?: Side | null
    version: number
    created_by_id: string
    created_at: string
    // In the API's own format, so two compare as strings
    updated_at?: string | null
}

// What someone said about a match, or with `game`, one of its games
export interface Comment {
    id: string
    match_id: string
    game: number | null
    body: string
    user_id: string
    // Null for an admin who doesn't play
    player_id: string | null
    // Their name as a player, else their account's
    author: string | null
    created_at: string
    edited_at: string | null
}

// The longest a comment can be
export const COMMENT_MAX = 1000

// The referee's call on an appeal. A let is replayed with no point and the
// same server; a stroke is the point to whoever appealed, and a no let the
// point to their opponent.
export type RallyDecision = "let" | "stroke" | "no_let"

export interface Rally {
    game: number
    number: number
    // Null for a let, which no one wins
    won_by_side: Side | null
    decision: RallyDecision | null
    appealed_by_side: Side | null
    server_id: string | null
    // The box it was served from, null when the scorer didn't say
    box?: Box | null
    side1_points: number
    side2_points: number
}

// A rally played out, or an appeal and its call. A let has no winner and
// says who appealed; a stroke or no let has a winner, which says who did.
// server_id, where known, is who served it.
export type RallyInput = (
    | { won_by_side: Side; decision?: "stroke" | "no_let" }
    | { decision: "let"; appealed_by_side: Side }
) & { server_id?: string | null; box?: Box | null }

// A player's results over some set of matches
export interface PlayerRecord {
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

export interface PlayerStats {
    player_id: string
    // Every match together, then each format alone
    singles: PlayerRecord
    doubles: PlayerRecord
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
    // Each finished game moves a rating; missing from an API from before
    games_rated?: number
    // Too few games for the rating to mean much yet
    provisional: boolean
    peak: number
    last_change: number
}

// What one game of a completed match did to a player's rating
export interface RatingChange {
    match_id: string
    played_at: string | null
    // Its number in the match; missing from an API that rated whole matches
    game?: number
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
    // Their appeals by the call they got. Lets only count where who
    // appealed was recorded.
    lets: number
    strokes: number
    no_lets: number
}

// How long games scored live took, from their first rally to their winning
// point
export interface GameTimes {
    games: number
    total_seconds: number
    average_seconds: number | null
    longest_seconds: number | null
    shortest_seconds: number | null
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
    // Missing from an API from before games were timed
    times?: GameTimes | null
}

export interface GameInsights {
    number: number
    scored_live: boolean
    went_to_deuce: boolean
    // Every let played, whoever appealed
    lets: number
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

// A bug, an idea or anything else, sent to the admins
export type FeedbackKind = "bug" | "idea" | "other"
export type FeedbackStatus = "new" | "resolved"

export interface Feedback {
    id: string
    kind: FeedbackKind
    message: string
    // Where it was sent from, such as "thesammy2010.com (Safari)"
    client: string | null
    status: FeedbackStatus
    resolved_at: string | null
    created_at: string
}

// Feedback with who sent it, for an admin
export interface AdminFeedback extends Feedback {
    user_id: string
    player_id: string | null
    name: string | null
    email: string | null
    resolved_by_id: string | null
}

// How the Elo ratings are worked out, as the API does it
export interface RatingFormula {
    name: string
    // To show as it is, in any font
    plain: string
    // To typeset
    latex: string
    explanation: string
}

export interface RatingExampleSide {
    // Each player's, one in singles
    ratings_before: number[]
    // What the side plays as: in doubles, the pair's average
    rating: number
    // The score it was expected to take, 0 to 1
    expected: number
    // 1 for a win, the draw score, or 0 for a loss
    score: number
    // What each of its players moved by
    change: number
    ratings_after: number[]
}

export interface RatingMethod {
    // Goes up whenever how ratings are worked out changes
    version: number
    updated: string
    constants: {
        start: number
        // The most one game moves a rating
        k: number
        scale: number
        // No longer used, as a game always has a winner
        draw: number
        provisional_matches: number
        // Missing from an API that rated whole matches
        provisional_games?: number
    }
    formulas: RatingFormula[]
    rules: string[]
    examples: { description: string; side1: RatingExampleSide; side2: RatingExampleSide }[]
    // Newest first
    changes: { version: number; date: string; summary: string }[]
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

export type AccessRequestStatus = "pending" | "approved" | "declined"

// Someone signed in who isn't a player asking to join, as they see it
export interface AccessRequest {
    id: string
    status: AccessRequestStatus
    message: string | null
    // The player they became, once approved
    player_id: string | null
    reviewed_at: string | null
    created_at: string
}

// The same with who asked, for an admin reviewing it
export interface AdminAccessRequest extends AccessRequest {
    user_id: string
    name: string | null
    email: string | null
    reviewed_by_id: string | null
}

// Approving makes them the player given, or else a new one with this name
// (their Google name when left out)
export interface Approval {
    player_id?: string | null
    name?: string | null
}

export interface MatchFilters {
    player_id?: string
    status?: MatchStatus
    format?: MatchFormat
    venue_id?: string
    // Played at or after, and at or before, as ISO date-times
    after?: string
    before?: string
}

export const squashApi = {
    // The caller's latest request to join, or null if they've none
    myAccessRequest: () =>
        request<AccessRequest>("GET", "/access-requests/me", "Failed to load your request").catch((error) => {
            if (error instanceof ApiError && error.status === 404) {
                return null
            }
            throw error
        }),
    requestAccess: (message: string | null) =>
        request<AccessRequest>("POST", "/access-requests/me", "Failed to send your request", {
            body: { message }
        }),
    withdrawAccessRequest: () => request<void>("DELETE", "/access-requests/me", "Failed to withdraw your request"),
    // Newest first
    accessRequests: (status?: AccessRequestStatus) =>
        request<AdminAccessRequest[]>("GET", "/access-requests", "Failed to load the requests", {
            query: { status }
        }),
    approveAccessRequest: (id: string, approval: Approval) =>
        request<AdminAccessRequest>("POST", `/access-requests/${id}/approve`, "Failed to approve the request", {
            body: approval
        }),
    declineAccessRequest: (id: string) =>
        request<AdminAccessRequest>("POST", `/access-requests/${id}/decline`, "Failed to decline the request"),
    players: (includeInactive = false) =>
        request<Player[]>("GET", "/players", "Failed to load players", {
            query: { include_inactive: includeInactive }
        }),
    player: (id: string) => request<Player>("GET", `/players/${id}`, "Failed to load the player"),
    createPlayer: (body: PlayerInput) => request<Player>("POST", "/players", "Failed to add the player", { body }),
    updatePlayer: (id: string, body: PlayerInput) =>
        request<Player>("PUT", `/players/${id}`, "Failed to save the player", { body }),
    // The caller's own; an admin who isn't a player gets a 404
    setMyPreferences: (body: PlayerPreferences) =>
        request<Player>("PATCH", "/players/me", "Failed to save your preference", { body }),
    playerStats: (id: string) => request<PlayerStats>("GET", `/players/${id}/stats`, "Failed to load stats"),
    // Singles and doubles together, or one alone
    headToHead: (id: string, opponentId: string, format?: MatchFormat) =>
        request<HeadToHead>("GET", `/players/${id}/head-to-head/${opponentId}`, "Failed to load the head-to-head", {
            query: { format }
        }),
    // Highest rated first; without a format every match counts to one rating
    ratings: (format?: MatchFormat, includeInactive = false) =>
        request<Rating[]>("GET", "/ratings", "Failed to load the ratings", {
            query: { format, include_inactive: includeInactive }
        }),
    ratingMethod: () => request<RatingMethod>("GET", "/ratings/method", "Failed to load how ratings work"),
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
    // Oldest first
    comments: (matchId: string) =>
        request<Comment[]>("GET", `/matches/${matchId}/comments`, "Failed to load the comments"),
    addComment: (matchId: string, body: string, game: number | null) =>
        request<Comment>("POST", `/matches/${matchId}/comments`, "Failed to add the comment", {
            body: { body, game }
        }),
    editComment: (matchId: string, id: string, body: string) =>
        request<Comment>("PATCH", `/matches/${matchId}/comments/${id}`, "Failed to save the comment", {
            body: { body }
        }),
    deleteComment: (matchId: string, id: string) =>
        request<void>("DELETE", `/matches/${matchId}/comments/${id}`, "Failed to delete the comment"),
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
    addRally: (id: string, rally: RallyInput, version: number) =>
        request<Match>("POST", `/matches/${id}/rallies`, "Failed to score the point", {
            body: { ...rally, version }
        }),
    sendFeedback: (body: { kind: FeedbackKind; message: string; client: string | null }) =>
        request<Feedback>("POST", "/feedback", "Failed to send your feedback", { body }),
    // What the caller's sent, newest first
    myFeedback: () => request<Feedback[]>("GET", "/feedback/me", "Failed to load your feedback"),
    // Everyone's, newest first, for an admin
    allFeedback: (filters: { status?: FeedbackStatus; kind?: FeedbackKind } = {}) =>
        request<AdminFeedback[]>("GET", "/feedback", "Failed to load the feedback", { query: filters }),
    resolveFeedback: (id: string) =>
        request<AdminFeedback>("POST", `/feedback/${id}/resolve`, "Failed to resolve the feedback"),
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

// A private match's rallies and insights are refused to anyone not in it,
// which leaves the rest of its page to show.
export function unlessPrivate<T>(request: Promise<T>): Promise<T | null> {
    return request.catch((error) => {
        if (error instanceof ApiError && error.status === 403) {
            return null
        }
        throw error
    })
}

// Checks membership again, such as once someone's request has been approved.
export function recheckSquashAccess(): void {
    void checkAccess()
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
