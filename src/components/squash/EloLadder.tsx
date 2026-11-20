import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { MatchFormat, Player, Rating, squashApi } from "./api"
import { signed } from "./format"

interface Props {
    ratings: Rating[]
    // Which ladder, for fetching it again with former players
    format: MatchFormat
    players: Player[]
    me: Player | null
}

// The Elo ladder as the API ranks it, highest first. Former players are
// left off unless asked for, when the ladder's fetched again with them.
export default function EloLadder({ ratings: current, format, players, me }: Props) {
    const inactive = new Set(players.filter((p) => !p.is_active).map((p) => p.id))
    const [former, setFormer] = useState(false)
    const [withFormer, setWithFormer] = useState<Rating[] | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setWithFormer(null)
        setError(null)
        if (!former) {
            return
        }
        let cancelled = false
        squashApi.ratings(format, true).then(
            (all) => !cancelled && setWithFormer(all),
            (err) => !cancelled && setError((err as Error).message)
        )
        return () => {
            cancelled = true
        }
    }, [former, format])

    const ratings = former && withFormer ? withFormer : current
    return (
        <div className="squash-card squash-ladder">
            <h4 className="squash-card-title">Elo ladder</h4>
            <p className="squash-muted">
                Everyone starts on 1000. A win moves you up and a loss down, further against someone rated higher.
            </p>
            {inactive.size > 0 && (
                <label className="squash-checkbox">
                    <input type="checkbox" checked={former} onChange={(e) => setFormer(e.target.checked)} />
                    Include players who've left the group
                    {former && withFormer === null && !error && <span className="squash-muted"> · loading...</span>}
                </label>
            )}
            {error && <p className="error-message">{error}</p>}
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
