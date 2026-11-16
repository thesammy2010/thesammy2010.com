import React, { useEffect, useState } from "react"

import { Match, squashApi } from "./api"
import { canMerge, formatWhen, gameScores, STATUS_LABELS } from "./format"

interface Props {
    match: Match
    onClose: () => void
    // With the match that was kept, which may be the other one
    onMerged: (kept: Match) => void
}

type Candidates = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; matches: Match[] }

// Picks another match between the same players to fold this one into, such
// as a session saved as two matches. Only the API's first page of their
// matches is offered: a split session is a recent one.
export default function MergeMatches({ match, onClose, onMerged }: Props) {
    const [candidates, setCandidates] = useState<Candidates>({ status: "loading" })
    const [chosen, setChosen] = useState<Match | null>(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        squashApi.matches({ player_id: match.players[0]?.player_id, format: match.format }, 1).then(
            (matches) =>
                !cancelled && setCandidates({ status: "ready", matches: matches.filter((m) => canMerge(match, m)) }),
            (err) => !cancelled && setCandidates({ status: "error", message: (err as Error).message })
        )
        return () => {
            cancelled = true
        }
    }, [match])

    const merge = async (other: Match) => {
        setBusy(true)
        setError(null)
        try {
            onMerged(await squashApi.mergeMatches(match.id, other.id))
        } catch (err) {
            setError((err as Error).message)
            setBusy(false)
        }
    }

    // Scores as this match's sides read them, even when the other had the
    // players on opposite sides.
    const scoresFor = (other: Match) => {
        const first = match.players[0]
        const swapped = first && other.players.find((p) => p.player_id === first.player_id)?.side !== first.side
        return swapped ? other.games.map((g) => `${g.side2_points}-${g.side1_points}`).join(", ") : gameScores(other)
    }

    return (
        <div className="squash-card squash-merge">
            <h4 className="squash-card-title">Merge with another match</h4>
            <p className="squash-muted">
                For one session saved as two matches. The one played first is kept, with the other's games after its
                own, and the other is deleted. The merged match isn't best of anything, and is completed only if both
                were.
            </p>

            {candidates.status === "loading" && (
                <p className="squash-muted">Finding matches between the same players...</p>
            )}
            {candidates.status === "error" && <p className="error-message">{candidates.message}</p>}
            {candidates.status === "ready" && candidates.matches.length === 0 && (
                <p className="squash-muted">
                    No other recent match has the same players, paired the same way, with games to the same points.
                </p>
            )}
            {candidates.status === "ready" && candidates.matches.length > 0 && (
                <ul className="squash-merge-list">
                    {candidates.matches.map((other) => (
                        <li key={other.id}>
                            <button
                                type="button"
                                className={`squash-merge-option ${chosen?.id === other.id ? "active" : ""}`}
                                aria-pressed={chosen?.id === other.id}
                                onClick={() => setChosen(other)}
                            >
                                <span>
                                    {formatWhen(other.played_at)}
                                    {other.venue && <span className="squash-muted"> · {other.venue}</span>}
                                </span>
                                <span className="squash-muted">
                                    {STATUS_LABELS[other.status]}
                                    {other.games.length > 0 && ` · ${scoresFor(other)}`}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <div className="squash-confirm">
                <button type="button" className="squash-secondary-button" onClick={onClose} disabled={busy}>
                    Cancel
                </button>
                <button
                    type="button"
                    className="squash-primary-button"
                    disabled={!chosen || busy}
                    onClick={() => chosen && merge(chosen)}
                >
                    {busy ? "Merging..." : "Merge"}
                </button>
            </div>
            {error && <p className="error-message squash-inline-error">{error}</p>}
        </div>
    )
}
