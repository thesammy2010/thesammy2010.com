import React from "react"
import { Link } from "react-router-dom"

import { Player, Rating } from "./api"
import { signed } from "./format"

interface Props {
    ratings: Rating[]
    players: Player[]
    me: Player | null
}

// The Elo ladder as the API ranks it, highest first.
export default function EloLadder({ ratings, players, me }: Props) {
    const inactive = new Set(players.filter((p) => !p.is_active).map((p) => p.id))
    return (
        <div className="squash-card squash-ladder">
            <h4 className="squash-card-title">Elo ladder</h4>
            <p className="squash-muted">
                Everyone starts on 1000. A win moves you up and a loss down, further against someone rated higher.
            </p>
            <table className="squash-table">
                <thead>
                    <tr>
                        <th>Player</th>
                        <th>Rating</th>
                        <th>Last match</th>
                        <th className="squash-hide-narrow">Peak</th>
                        <th className="squash-hide-narrow">Rated</th>
                    </tr>
                </thead>
                <tbody>
                    {ratings.map((r) => (
                        <tr key={r.player_id} className={inactive.has(r.player_id) ? "squash-inactive" : ""}>
                            <th scope="row">
                                <span className="squash-rank">{r.rank}</span>
                                <Link className="squash-link" to={`/squash/players/${r.player_id}`}>
                                    {r.name}
                                </Link>
                                {r.player_id === me?.id && <span className="squash-you">you</span>}
                                {r.provisional && (
                                    <span
                                        className="squash-muted squash-pending"
                                        title="Too few matches to mean much yet"
                                    >
                                        provisional
                                    </span>
                                )}
                            </th>
                            <td className="squash-rating">{r.rating}</td>
                            <td
                                className={
                                    r.last_change > 0 ? "squash-ahead" : r.last_change < 0 ? "squash-behind" : ""
                                }
                            >
                                {r.matches_rated > 0 ? signed(r.last_change) : ""}
                            </td>
                            <td className="squash-hide-narrow">{r.peak}</td>
                            <td className="squash-hide-narrow">{r.matches_rated}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
