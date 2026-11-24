import React from "react"

import { Match, Player, Side } from "./api"
import { formatDuration, SIDES, sideNames } from "./format"

const points = (match: Match, side: Side) =>
    match.games
        .filter((g) => g.winning_side !== null)
        .reduce((sum, g) => sum + (side === 1 ? g.side1_points : g.side2_points), 0)

/**
 * The match as a whole, from every finished game, those entered as a final
 * score too: games and points each side won, their average and biggest win,
 * deuce games won, and how long it took. Only with two or more finished
 * games, as the app has it.
 */
export default function MatchOverall({ match, players }: { match: Match; players: Player[] }) {
    const games = match.games.filter((g) => g.winning_side !== null)
    if (games.length < 2) {
        return null
    }
    const total = points(match, 1) + points(match, 2)
    const pts = (g: (typeof games)[number], side: Side) => (side === 1 ? g.side1_points : g.side2_points)
    const rows: { label: string; value: (side: Side) => string }[] = [
        { label: "Games won", value: (side) => String(games.filter((g) => g.winning_side === side).length) },
        {
            label: "Points won",
            value: (side) =>
                total > 0 ? `${points(match, side)} (${Math.round((points(match, side) / total) * 100)}%)` : "0"
        },
        { label: "Points a game", value: (side) => (points(match, side) / games.length).toFixed(1) },
        {
            label: "Biggest win",
            value: (side) => {
                const margins = games
                    .filter((g) => g.winning_side === side)
                    .map((g) => pts(g, side) - pts(g, side === 1 ? 2 : 1))
                return margins.length ? `by ${Math.max(...margins)}` : "—"
            }
        },
        {
            label: "Games to deuce won",
            value: (side) =>
                String(
                    games.filter(
                        (g) =>
                            g.winning_side === side && Math.min(g.side1_points, g.side2_points) >= match.points_to - 1
                    ).length
                )
        }
    ]
    const timed = games.map((g) => g.duration_seconds).filter((s): s is number => s != null)
    const totalTime = timed.reduce((a, b) => a + b, 0)

    return (
        <div className="squash-card">
            <h4 className="squash-card-title">Overall</h4>
            <p className="squash-muted">Every finished game, including any entered as a final score.</p>
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
                            {SIDES.map((side) => (
                                <td key={side}>{row.value(side)}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {timed.length > 0 && (
                <p className="squash-muted squash-centre">
                    Played for {formatDuration(totalTime)} over {timed.length} timed{" "}
                    {timed.length === 1 ? "game" : "games"}
                    {timed.length > 1 && `, the longest ${formatDuration(Math.max(...timed))}`}.
                </p>
            )}
        </div>
    )
}
