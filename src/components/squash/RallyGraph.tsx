import React, { useState } from "react"
import { Link } from "react-router-dom"

import { Match, Player, Rally } from "./api"
import { CALLS } from "./format"
import MomentumChart from "./MomentumChart"

type Graph = "momentum" | "points"
const KEY = "squash.rallyGraph"

function storedGraph(): Graph {
    try {
        return localStorage.getItem(KEY) === "points" ? "points" : "momentum"
    } catch {
        return "momentum"
    }
}

// Each rally as a dot in the colour of the side that won it, a game per row,
// so runs of points and comebacks show at a glance. A let is a grey dash,
// and a point given on a stroke or no let a ring. Each game links to its
// page, unless it's that game's own page.
function RallyDots({ match, rallies, linkGames }: { match: Match; rallies: Rally[]; linkGames: boolean }) {
    const byGame = new Map<number, Rally[]>()
    rallies.forEach((rally) => byGame.set(rally.game, [...(byGame.get(rally.game) ?? []), rally]))
    return (
        <>
            <p className="squash-muted">Each rally in the colour of the side that won it.</p>
            {Array.from(byGame.entries()).map(([gameNumber, gameRallies]) => {
                const game = match.games.find((g) => g.number === gameNumber)
                return (
                    <div key={gameNumber} className="squash-rally-row">
                        <span className="squash-rally-label">
                            {linkGames ? (
                                <Link className="squash-link" to={`/squash/matches/${match.id}/games/${gameNumber}`}>
                                    Game {gameNumber}
                                </Link>
                            ) : (
                                `Game ${gameNumber}`
                            )}
                            {game && (
                                <span className="squash-muted">
                                    {" "}
                                    {game.side1_points}-{game.side2_points}
                                </span>
                            )}
                        </span>
                        <span className="squash-rally-dots">
                            {[...gameRallies]
                                .sort((a, b) => a.number - b.number)
                                .map((rally) => {
                                    const won = rally.won_by_side
                                    const call = rally.decision ? `, ${CALLS[rally.decision].toLowerCase()}` : ""
                                    const kind =
                                        won === null
                                            ? "squash-rally-let"
                                            : `squash-side-${won}${rally.decision ? " squash-rally-call" : ""}`
                                    return (
                                        <span
                                            key={rally.number}
                                            className={`squash-rally-dot ${kind}`}
                                            title={`${rally.side1_points}-${rally.side2_points}${call}`}
                                        />
                                    )
                                })}
                        </span>
                    </div>
                )
            })}
        </>
    )
}

/**
 * How the games scored live went, as momentum (who was ahead by how much)
 * or point by point (a dot a rally), switched above it and remembered in
 * this browser, as the app has them.
 */
export default function RallyGraph({
    match,
    rallies,
    players,
    linkGames = true
}: {
    match: Match
    rallies: Rally[]
    players: Player[]
    linkGames?: boolean
}) {
    const [graph, setGraph] = useState<Graph>(storedGraph)
    if (rallies.length === 0) {
        return null
    }
    const choose = (next: Graph) => {
        setGraph(next)
        try {
            localStorage.setItem(KEY, next)
        } catch {
            // Kept for this visit only.
        }
    }
    return (
        <div className="squash-card">
            <div className="squash-rally-graph-switch">
                <div className="squash-segmented" role="radiogroup" aria-label="Graph">
                    {(
                        [
                            ["momentum", "Momentum"],
                            ["points", "Point by point"]
                        ] as [Graph, string][]
                    ).map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={graph === value}
                            className={graph === value ? "active" : ""}
                            onClick={() => choose(value)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            {graph === "momentum" ? (
                <MomentumChart match={match} rallies={rallies} players={players} />
            ) : (
                <RallyDots match={match} rallies={rallies} linkGames={linkGames} />
            )}
        </div>
    )
}
