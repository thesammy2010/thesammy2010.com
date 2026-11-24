import React from "react"

import { GameInsights, Match, MatchInsights, Player, PlayerInsights, RallyInsights, Side } from "./api"
import { SIDES, sideNames, winRate } from "./format"
import StatRings, { insightFigures } from "./StatRings"

// "23/40 · 58%", or a dash with nothing to count
function ratio(won: number, played: number, rate: number | null): string {
    return played === 0 ? "—" : `${won}/${played} · ${winRate(rate)}`
}

const ROWS: { label: string; value: (s: RallyInsights) => string }[] = [
    { label: "Rallies won", value: (s) => ratio(s.rallies_won, s.rallies_played, s.rally_win_rate) },
    { label: "On serve", value: (s) => ratio(s.serves_won, s.serves_played, s.serve_win_rate) },
    { label: "On receive", value: (s) => ratio(s.receives_won, s.receives_played, s.receive_win_rate) },
    { label: "Game points taken", value: (s) => ratio(s.game_points_won, s.game_points, s.game_point_win_rate) },
    { label: "Longest run", value: (s) => String(s.longest_run) },
    { label: "Biggest lead", value: (s) => String(s.biggest_lead) }
]

// Each side's appeals by the call they got, shown once anyone has appealed
const APPEAL_ROWS: { label: string; value: (s: RallyInsights) => string }[] = [
    { label: "Strokes", value: (s) => String(s.strokes) },
    { label: "Lets", value: (s) => String(s.lets) },
    { label: "No lets", value: (s) => String(s.no_lets) }
]

const appeals = (s: RallyInsights) => s.strokes + s.lets + s.no_lets

/** What's worth a mention about a game: "Leo came back from 4 down", "went to deuce". */
export function gameNotes(match: Match, game: GameInsights, players: Player[]): string[] {
    const lines: string[] = []
    if (game.comeback_by_side !== null) {
        const deficit = game.deepest_deficit ? ` from ${game.deepest_deficit} down` : ""
        lines.push(`${sideNames(match, game.comeback_by_side, players)} came back${deficit}`)
    }
    if (game.went_to_deuce) {
        lines.push("went to deuce")
    }
    if (game.lets > 0) {
        lines.push(`had ${game.lets} ${game.lets === 1 ? "let" : "lets"}`)
    }
    return lines
}

/**
 * Each side's rally figures side by side, with their appeals once anyone
 * has appealed: over a match, or one game.
 */
export function SidesTable({ match, sides, players }: { match: Match; sides: RallyInsights[]; players: Player[] }) {
    const bySide = (side: Side) => sides.find((s) => s.side === side)
    const rows = sides.some((s) => appeals(s) > 0) ? [...ROWS, ...APPEAL_ROWS] : ROWS
    return (
        <table className="squash-table squash-insights-table">
            <thead>
                <tr>
                    <th></th>
                    {SIDES.map((side) => (
                        <th key={side} scope="col">
                            <span className={`squash-side-dot squash-side-${side}`} aria-hidden="true" />{" "}
                            {sideNames(match, side, players)}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row) => (
                    <tr key={row.label}>
                        <th scope="row">{row.label}</th>
                        {SIDES.map((side) => {
                            const s = bySide(side)
                            return <td key={side}>{s ? row.value(s) : "—"}</td>
                        })}
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

/**
 * What the rallies of a match's live-scored games show, side by side, and
 * the games worth a mention: comebacks, deuce games and lets. Nothing when
 * no game was scored live or went to deuce.
 */
export function MatchInsightsCard({
    match,
    insights,
    players
}: {
    match: Match
    insights: MatchInsights
    players: Player[]
}) {
    const live = insights.sides.some((s) => s.rallies_played > 0)
    const notes = insights.games.flatMap((game) => {
        const lines = gameNotes(match, game, players)
        return lines.length ? [{ number: game.number, text: lines.join(", and ") }] : []
    })
    if (!live && notes.length === 0) {
        return null
    }

    return (
        <div className="squash-card">
            <h4 className="squash-card-title">Insights</h4>
            {live && (
                <>
                    <p className="squash-muted">From the games scored point by point.</p>
                    <SidesTable match={match} sides={insights.sides} players={players} />
                </>
            )}
            {notes.length > 0 && (
                <ul className="squash-insights-notes">
                    {notes.map((note) => (
                        <li key={note.number}>
                            <strong>Game {note.number}</strong> {note.text}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

/**
 * A player's point-by-point figures over their completed matches, as rings,
 * compared with `other`'s when given: yours on someone else's page, or the
 * opponent's in a rivalry.
 */
export function PlayerInsightsCard({
    insights,
    other,
    otherName = "You"
}: {
    insights: PlayerInsights
    other?: PlayerInsights | null
    otherName?: string
}) {
    const deuce = insights.deuce_games_won + insights.deuce_games_lost
    if (insights.games_scored_live === 0 && deuce === 0) {
        return <p className="squash-muted">No games scored point by point yet, so nothing to break down.</p>
    }
    const compared = other && other.games_scored_live > 0 ? other : null
    return (
        <>
            <p className="squash-muted">
                From {insights.games_scored_live} {insights.games_scored_live === 1 ? "game" : "games"} scored point by
                point; tie-breaks from every game.
                {compared && ` Green where it beats ${otherName === "You" ? "yours" : `${otherName}'s`}, red where not.`}
            </p>
            <StatRings figures={insightFigures(insights, compared, otherName)} />
        </>
    )
}
