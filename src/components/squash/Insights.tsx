import React from "react"

import { Match, MatchInsights, Player, PlayerInsights, RallyInsights, Side } from "./api"
import { SIDES, sideNames, winRate } from "./format"

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

/**
 * What the rallies of a match's live-scored games show, side by side, and
 * the games worth a mention: comebacks and deuce games. Nothing when no game
 * was scored live or went to deuce.
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
    const bySide = (side: Side) => insights.sides.find((s) => s.side === side)
    const live = insights.sides.some((s) => s.rallies_played > 0)
    const notes = insights.games.flatMap((game) => {
        const lines: string[] = []
        if (game.comeback_by_side !== null) {
            const deficit = game.deepest_deficit ? ` from ${game.deepest_deficit} down` : ""
            lines.push(`${sideNames(match, game.comeback_by_side, players)} came back${deficit}`)
        }
        if (game.went_to_deuce) {
            lines.push("went to deuce")
        }
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
                            {ROWS.map((row) => (
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

function Tile({ value, label }: { value: string; label: string }) {
    return (
        <div className="stat-tile">
            <div className="stat-tile-value">{value}</div>
            <div className="stat-tile-label">{label}</div>
        </div>
    )
}

/** A player's point-by-point figures over their completed matches. */
export function PlayerInsightsCard({ insights }: { insights: PlayerInsights }) {
    const { rallies: r } = insights
    const deuce = insights.deuce_games_won + insights.deuce_games_lost
    if (insights.games_scored_live === 0 && deuce === 0) {
        return <p className="squash-muted">No games scored point by point yet, so nothing to break down.</p>
    }
    return (
        <>
            <p className="squash-muted">
                From {insights.games_scored_live} {insights.games_scored_live === 1 ? "game" : "games"} scored point by
                point. Deuce games count every game.
            </p>
            <div className="stats-grid squash-insights-grid">
                <Tile value={winRate(r.rally_win_rate)} label="Rallies won" />
                <Tile value={winRate(r.serve_win_rate)} label="On serve" />
                <Tile value={winRate(r.receive_win_rate)} label="On receive" />
                <Tile value={winRate(r.game_point_win_rate)} label="Game points taken" />
                <Tile value={String(r.longest_run)} label="Longest run" />
                <Tile value={String(insights.comebacks)} label="Comebacks" />
                {insights.comebacks > 0 && (
                    <Tile value={`${insights.biggest_comeback} down`} label="Biggest comeback" />
                )}
                <Tile value={String(insights.leads_lost)} label="Leads lost" />
                <Tile value={`${insights.deuce_games_won}-${insights.deuce_games_lost}`} label="Deuce games" />
            </div>
        </>
    )
}
