// Display helpers for the squash pages.
import { EM_DASH } from "../go_heavier/format"
import type { Game, Match, MatchInput, MatchStatus, Player, RallyDecision, Side } from "./api"

export const SIDES: Side[] = [1, 2]

// The match as it stands, for a PUT that changes only some of it
export function toInput(match: Match, changes: Partial<MatchInput> = {}): MatchInput {
    return {
        format: match.format,
        status: match.status,
        played_at: match.played_at,
        venue_id: match.venue_id,
        points_to: match.points_to,
        best_of: match.best_of,
        notes: match.notes,
        is_private: match.is_private,
        tracks_box: match.tracks_box ?? true,
        players: match.players,
        ...changes
    }
}

// "Leo & Alex", or "Unknown player" for someone no longer in the list.
export function sideNames(match: Pick<Match, "players">, side: Side, players: Player[]): string {
    const names = match.players
        .filter((p) => p.side === side)
        .map((p) => players.find((player) => player.id === p.player_id)?.name ?? "Unknown player")
    return names.join(" & ") || EM_DASH
}

export function sideOf(match: Pick<Match, "players">, playerId: string | undefined): Side | null {
    return match.players.find((p) => p.player_id === playerId)?.side ?? null
}

/**
 * Whether the API would merge the two: the same format and points per game,
 * neither cancelled, and the same players paired the same way, on either
 * side. Whether the earlier one's last game is finished is left to the API.
 */
export function canMerge(match: Match, other: Match): boolean {
    if (
        match.id === other.id ||
        match.format !== other.format ||
        match.points_to !== other.points_to ||
        match.status === "cancelled" ||
        other.status === "cancelled" ||
        match.players.length !== other.players.length
    ) {
        return false
    }
    const sides = match.players.map((p) => [p.side, sideOf(other, p.player_id)])
    return (
        sides.every(([mine, theirs]) => mine === theirs) ||
        sides.every(([mine, theirs]) => theirs !== null && mine !== theirs)
    )
}

export function isLive(match: Pick<Match, "status">): boolean {
    return match.status === "scheduled" || match.status === "in_progress"
}

/**
 * The game being played, or the one that would start with the next point:
 * the last game while nobody has won it, otherwise a fresh 0-0 after it.
 */
export function currentGame(match: Pick<Match, "games">): Game {
    const last = match.games[match.games.length - 1]
    if (last && last.winning_side === null) {
        return last
    }
    return {
        number: (last?.number ?? 0) + 1,
        side1_points: 0,
        side2_points: 0,
        winning_side: null,
        rallies: 0
    }
}

// The game a typed-in score goes to: the unfinished one, whether entered by
// hand or being scored live, or else the next one.
export function nextEnteredGame(match: Pick<Match, "games">): number {
    const last = match.games[match.games.length - 1]
    if (last && last.winning_side === null) {
        return last.number
    }
    return (last?.number ?? 0) + 1
}

// Mirrors the API's rule for a finished game: first to points_to, but from
// one short all it goes on until a side is two clear.
export function gameWinner(side1: number, side2: number, pointsTo: number): Side | null {
    const high = Math.max(side1, side2)
    const low = Math.min(side1, side2)
    if (high >= pointsTo && high - low >= 2) {
        return side1 > side2 ? 1 : 2
    }
    return null
}

// "Game ball" / "Match ball" for the side one point from taking it.
export function ballFor(match: Match): { side: Side; kind: "game" | "match" } | null {
    const game = currentGame(match)
    for (const side of SIDES) {
        const [mine, theirs] =
            side === 1 ? [game.side1_points, game.side2_points] : [game.side2_points, game.side1_points]
        if (gameWinner(mine + 1, theirs, match.points_to) === 1) {
            const gamesNeeded = match.best_of === null ? null : (match.best_of + 1) / 2
            const won = (side === 1 ? match.side1_games : match.side2_games) ?? 0
            return { side, kind: gamesNeeded !== null && won + 1 >= gamesNeeded ? "match" : "game" }
        }
    }
    return null
}

// "11-7, 9-11, 11-4"
export function gameScores(match: Pick<Match, "games">): string {
    return match.games.map((g) => `${g.side1_points}-${g.side2_points}`).join(", ")
}

export function formatLabel(match: Pick<Match, "format" | "best_of" | "points_to">): string {
    const format = match.format === "singles" ? "Singles" : "Doubles"
    const length = match.best_of === null ? "open-ended" : `best of ${match.best_of}`
    return `${format} · ${length}${match.points_to === 11 ? "" : ` · games to ${match.points_to}`}`
}

export const STATUS_LABELS: Record<MatchStatus, string> = {
    scheduled: "Scheduled",
    in_progress: "Live",
    completed: "Completed",
    cancelled: "Cancelled"
}

// "Sun 15 Nov, 18:30" (with the year when it isn't this one)
export const CALLS: Record<RallyDecision, string> = {
    let: "Let",
    stroke: "Stroke",
    no_let: "No let"
}

/**
 * A finished match in a line, for sharing: "Leo beat Alex 3-1 (11-7, 9-11,
 * 11-5, 11-8)", or "Leo and Alex drew 1-1 (...)". Scores read from the
 * winner's side, as a result is usually told.
 */
export function resultSummary(match: Match, players: Player[]): string {
    const winner = match.winning_side ?? 1
    const loser: Side = winner === 1 ? 2 : 1
    const games = (side: Side) => (side === 1 ? match.side1_games : match.side2_games)
    const points = (g: Game, side: Side) => (side === 1 ? g.side1_points : g.side2_points)
    const scores = match.games
        .filter((g) => g.winning_side !== null)
        .map((g) => `${points(g, winner)}-${points(g, loser)}`)
        .join(", ")
    const verb = match.winning_side === null ? "drew with" : "beat"
    const sides = `${sideNames(match, winner, players)} ${verb} ${sideNames(match, loser, players)}`
    const line = `${sides} ${games(winner)}-${games(loser)}`
    return scores ? `${line} (${scores})` : line
}

export function formatWhen(value: string | null): string {
    if (!value) {
        return "No date set"
    }
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return EM_DASH
    }
    const sameYear = date.getFullYear() === new Date().getFullYear()
    return date.toLocaleString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: sameYear ? undefined : "numeric",
        hour: "2-digit",
        minute: "2-digit"
    })
}

// An <input type="datetime-local"> value for a moment, in local time.
export function toLocalInput(value: string | Date | null): string {
    if (!value) {
        return ""
    }
    const date = new Date(value)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
        date.getMinutes()
    )}`
}

// The input's local time, sent with its offset rather than read as UTC.
export function fromLocalInput(value: string): string | null {
    return value ? new Date(value).toISOString() : null
}

export function winRate(value: number | null): string {
    return value === null ? EM_DASH : `${Math.round(value * 100)}%`
}

// "+12", "−8" (a true minus sign) or "0"
export function signed(value: number): string {
    return value > 0 ? `+${value}` : value < 0 ? `−${-value}` : "0"
}

// "4-2", or "4-2-1" with draws
/** "4:02" for a game, or "1:02:13" past the hour, from seconds. */
export function formatDuration(seconds: number): string {
    const whole = Math.round(seconds)
    const hours = Math.floor(whole / 3600)
    const minutes = Math.floor((whole % 3600) / 60)
    const secs = String(whole % 60).padStart(2, "0")
    return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${secs}` : `${minutes}:${secs}`
}

export function record(won: number, lost: number, drawn: number): string {
    return drawn > 0 ? `${won}-${lost}-${drawn}` : `${won}-${lost}`
}
