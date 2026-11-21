import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { MatchFormat, Player, Rating, squashApi } from "./api"
import { signed } from "./format"

// Which ladder: every match together, or one format alone
export type Ladder = "overall" | MatchFormat

export const LADDERS: { value: Ladder; label: string }[] = [
    { value: "overall", label: "Overall" },
    { value: "singles", label: "Singles" },
    { value: "doubles", label: "Doubles" }
]

const MEDALS = ["🥇", "🥈", "🥉"]

interface Props {
    // The ladder for the format the page shows, already loaded
    ratings: Rating[]
    format: MatchFormat
    players: Player[]
    me: Player | null
}

// The Elo ladder as the API ranks it, highest first: overall, where every
// match counts, or singles or doubles alone, starting on the page's format.
// Former players are left off unless asked for. Any ladder but the one
// already loaded is fetched when it's picked.
export default function EloLadder({ ratings: current, format, players, me }: Props) {
    const inactive = new Set(players.filter((p) => !p.is_active).map((p) => p.id))
    const [ladder, setLadder] = useState<Ladder>(format)
    const [former, setFormer] = useState(false)
    const [fetched, setFetched] = useState<Rating[] | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Follow the page when it switches format
    useEffect(() => setLadder(format), [format])

    const needsFetch = former || ladder !== format
    useEffect(() => {
        setFetched(null)
        setError(null)
        if (!needsFetch) {
            return
        }
        let cancelled = false
        squashApi.ratings(ladder === "overall" ? undefined : ladder, former).then(
            (all) => !cancelled && setFetched(all),
            (err) => !cancelled && setError((err as Error).message)
        )
        return () => {
            cancelled = true
        }
    }, [ladder, former, format, needsFetch])

    const ratings = needsFetch ? fetched : current
    return (
        <div className="squash-card squash-ladder">
            <div className="squash-ladder-head">
                <h4 className="squash-card-title">Elo ladder</h4>
                <Link className="squash-elo-pill" to="/squash/elo">
                    <span aria-hidden="true">ⓘ</span> How Elo works
                </Link>
                <div className="squash-segmented" role="radiogroup" aria-label="Which ladder">
                    {LADDERS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={ladder === option.value}
                            className={ladder === option.value ? "active" : ""}
                            onClick={() => setLadder(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>
            <p className="squash-muted">
                {ladder === "overall"
                    ? "Every match counts, singles and doubles together. "
                    : `${ladder === "singles" ? "Singles" : "Doubles"} matches alone. `}
                Everyone starts on 1000. A win moves you up and a loss down, further against someone rated higher.
            </p>
            {inactive.size > 0 && (
                <label className="squash-checkbox">
                    <input type="checkbox" checked={former} onChange={(e) => setFormer(e.target.checked)} />
                    Include players who've left the group
                </label>
            )}
            {error && <p className="error-message">{error}</p>}
            {ratings === null && !error && <p className="squash-muted">Loading the ladder...</p>}
            {ratings?.length === 0 && <p className="squash-muted">No one's rated on this ladder yet.</p>}
            {ratings && ratings.length > 0 && (
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
                            <tr
                                key={r.player_id}
                                className={`${inactive.has(r.player_id) ? "squash-inactive" : ""} ${
                                    r.player_id === me?.id ? "squash-ladder-me" : ""
                                }`}
                            >
                                <th scope="row">
                                    <span className="squash-rank" aria-label={`Rank ${r.rank}`}>
                                        {MEDALS[r.rank - 1] ?? r.rank}
                                    </span>
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
            )}
        </div>
    )
}
