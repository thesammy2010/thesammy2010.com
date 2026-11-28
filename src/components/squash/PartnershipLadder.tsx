import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { PartnershipRating, Player, squashApi } from "./api"
import { RATING_SETTLED_AFTER, signed } from "./format"

const MEDALS = ["🥇", "🥈", "🥉"]

interface Props {
    players: Player[]
    me: Player | null
}

// The doubles pairs' own Elo ladder: each pair rated as one, from the games
// they've played together, apart from their own ratings. Pairs still
// settling are listed too, marked provisional, so every pairing played shows.
export default function PartnershipLadder({ players, me }: Props) {
    const inactive = new Set(players.filter((p) => !p.is_active).map((p) => p.id))
    const [former, setFormer] = useState(false)
    const [ratings, setRatings] = useState<PartnershipRating[] | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setRatings(null)
        setError(null)
        let cancelled = false
        squashApi.partnershipRatings(former, true).then(
            (all) => !cancelled && setRatings(all),
            (err) => !cancelled && setError((err as Error).message)
        )
        return () => {
            cancelled = true
        }
    }, [former])

    return (
        <div className="squash-card squash-ladder">
            <div className="squash-ladder-head">
                <h4 className="squash-card-title">Partnership Elo</h4>
            </div>
            <p className="squash-muted">
                Each pair rated as one, from 1000, on the doubles games they've played together. A pair's settled once
                they've played {RATING_SETTLED_AFTER} games together.
            </p>
            {inactive.size > 0 && (
                <label className="squash-checkbox">
                    <input type="checkbox" checked={former} onChange={(e) => setFormer(e.target.checked)} />
                    Include pairs with someone who's left the group
                </label>
            )}
            {error && <p className="error-message">{error}</p>}
            {ratings === null && !error && <p className="squash-muted">Loading the partnerships...</p>}
            {ratings?.length === 0 && <p className="squash-muted">No pairs have played doubles yet.</p>}
            {ratings && ratings.length > 0 && (
                <table className="squash-table">
                    <thead>
                        <tr>
                            <th>Pair</th>
                            <th>Rating</th>
                            <th>Last game</th>
                            <th className="squash-hide-narrow">Peak</th>
                            <th className="squash-hide-narrow">Games</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ratings.map((r) => {
                            const mine = me !== null && r.player_ids.includes(me.id)
                            return (
                                <tr key={r.player_ids.join("-")} className={mine ? "squash-ladder-me" : ""}>
                                    <th scope="row">
                                        <span className="squash-rank" aria-label={`Rank ${r.rank}`}>
                                            {MEDALS[r.rank - 1] ?? r.rank}
                                        </span>
                                        {r.player_ids.map((id, index) => (
                                            <React.Fragment key={id}>
                                                {index > 0 && " & "}
                                                <Link className="squash-link" to={`/squash/players/${id}`}>
                                                    {r.names[index]}
                                                </Link>
                                            </React.Fragment>
                                        ))}
                                        {r.provisional && (
                                            <span
                                                className="squash-muted squash-pending"
                                                title="Too few games together to mean much yet"
                                            >
                                                provisional
                                            </span>
                                        )}
                                    </th>
                                    <td className="squash-rating">{r.rating}</td>
                                    <td
                                        className={
                                            r.last_change > 0
                                                ? "squash-ahead"
                                                : r.last_change < 0
                                                ? "squash-behind"
                                                : ""
                                        }
                                    >
                                        {signed(r.last_change)}
                                    </td>
                                    <td className="squash-hide-narrow">{r.peak}</td>
                                    <td className="squash-hide-narrow">{r.games_rated}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            )}
        </div>
    )
}
