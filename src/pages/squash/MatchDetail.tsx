import React, { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import {
    Match,
    MatchInput,
    MatchInsights,
    Player,
    Rally,
    squashApi,
    StaleMatchError,
    useSquashLoad
} from "../../components/squash/api"
import { MatchInsightsCard } from "../../components/squash/Insights"
import LiveScorer from "../../components/squash/LiveScorer"
import MatchForm from "../../components/squash/MatchForm"
import MergeMatches from "../../components/squash/MergeMatches"
import MomentumChart from "../../components/squash/MomentumChart"
import SquashPage from "../../components/squash/SquashPage"
import {
    CALLS,
    formatLabel,
    formatWhen,
    gameWinner,
    isLive,
    nextEnteredGame,
    SIDES,
    sideNames,
    STATUS_LABELS
} from "../../components/squash/format"
import { useIsAdmin, useOwnUserId } from "../../roles"

interface MatchData {
    match: Match
    players: Player[]
    rallies: Rally[]
    insights: MatchInsights
}

// Long enough not to hammer the API, short enough that a point scored on
// one phone shows on another before anyone looks up.
const POLL_MS = 2000

function toInput(match: Match, changes: Partial<MatchInput> = {}): MatchInput {
    return {
        format: match.format,
        status: match.status,
        played_at: match.played_at,
        venue_id: match.venue_id,
        points_to: match.points_to,
        best_of: match.best_of,
        notes: match.notes,
        players: match.players,
        ...changes
    }
}

function Scoreboard({ match, players }: { match: Match; players: Player[] }) {
    return (
        <div className="squash-card squash-scoreboard">
            <div className="squash-card-head">
                <span className="squash-when">
                    {formatWhen(match.played_at)}
                    {match.venue && <span className="squash-muted"> · {match.venue}</span>}
                </span>
                <span className={`squash-status squash-status-${match.status}`}>{STATUS_LABELS[match.status]}</span>
            </div>
            <div className="squash-scoreboard-sides">
                {SIDES.map((side) => {
                    const winner = match.status === "completed" && match.winning_side === side
                    return (
                        <div key={side} className={`squash-scoreboard-side ${winner ? "winner" : ""}`}>
                            <span className={`squash-side-dot squash-side-${side}`} aria-hidden="true" />
                            <span className="squash-scoreboard-names">
                                {sideNames(match, side, players)}
                                {winner && " 🏆"}
                            </span>
                            <span className="squash-scoreboard-games">{side === 1 ? match.side1_games : match.side2_games}</span>
                        </div>
                    )
                })}
            </div>
            <p className="squash-muted">
                {formatLabel(match)}
                {match.status === "completed" && match.winning_side === null && " · drawn"}
            </p>
            {match.notes && <p className="squash-notes">{match.notes}</p>}
        </div>
    )
}

// Each rally as a dot in the colour of the side that won it, a game per row,
// so runs of points and comebacks show at a glance. A let is a hollow dot,
// and a point given on a stroke or no let has a hole in it.
function PointByPoint({ match, rallies, players }: { match: Match; rallies: Rally[]; players: Player[] }) {
    if (rallies.length === 0) {
        return null
    }
    const byGame = new Map<number, Rally[]>()
    rallies.forEach((rally) => byGame.set(rally.game, [...(byGame.get(rally.game) ?? []), rally]))

    return (
        <div className="squash-card">
            <MomentumChart match={match} rallies={rallies} players={players} />
            <h4 className="squash-card-title">Point by point</h4>
            {Array.from(byGame.entries()).map(([gameNumber, gameRallies]) => {
                const game = match.games.find((g) => g.number === gameNumber)
                return (
                    <div key={gameNumber} className="squash-rally-row">
                        <span className="squash-rally-label">
                            Game {gameNumber}
                            {game && (
                                <span className="squash-muted">
                                    {" "}
                                    {game.side1_points}-{game.side2_points}
                                </span>
                            )}
                        </span>
                        <span className="squash-rally-dots">
                            {gameRallies.map((rally) => {
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
        </div>
    )
}

function EnterGame({ match, onMatch }: { match: Match; onMatch: (match: Match) => void }) {
    const number = nextEnteredGame(match)
    const existing = match.games.find((g) => g.number === number)
    const [side1, setSide1] = useState(existing ? String(existing.side1_points) : "")
    const [side2, setSide2] = useState(existing ? String(existing.side2_points) : "")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const unfinished = side1 !== "" && side2 !== "" && gameWinner(Number(side1), Number(side2), match.points_to) === null

    const save = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError(null)
        try {
            onMatch(await squashApi.setGame(match.id, number, { side1_points: Number(side1), side2_points: Number(side2) }))
            setSide1("")
            setSide2("")
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <form className="squash-enter-game" onSubmit={save}>
            <span className="squash-enter-label">Game {number}</span>
            <input
                className="squash-input squash-points-input"
                type="number"
                min={0}
                max={99}
                inputMode="numeric"
                value={side1}
                onChange={(e) => setSide1(e.target.value)}
                aria-label="Side 1 points"
                required
            />
            <span aria-hidden="true">–</span>
            <input
                className="squash-input squash-points-input"
                type="number"
                min={0}
                max={99}
                inputMode="numeric"
                value={side2}
                onChange={(e) => setSide2(e.target.value)}
                aria-label="Side 2 points"
                required
            />
            <button type="submit" className="squash-secondary-button" disabled={saving}>
                {saving ? "Saving..." : "Save game"}
            </button>
            {unfinished && <span className="squash-muted">Saved as still in play</span>}
            {error && <p className="error-message squash-inline-error">{error}</p>}
        </form>
    )
}

export default function MatchDetail() {
    const { id = "" } = useParams()
    const navigate = useNavigate()
    const isAdmin = useIsAdmin()
    const ownUserId = useOwnUserId()
    const [editing, setEditing] = useState(false)
    const [merging, setMerging] = useState(false)
    const [confirming, setConfirming] = useState<"cancel" | "delete" | null>(null)
    const [actionError, setActionError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    const { state, setState, refreshing, reload } = useSquashLoad<MatchData>(async () => {
        const [match, players, rallies, insights] = await Promise.all([
            squashApi.match(id),
            squashApi.players(true),
            squashApi.rallies(id),
            squashApi.matchInsights(id)
        ])
        return { match, players, rallies, insights }
    }, [id])

    const ready = state.status === "ready" ? state : null
    const match = ready?.data.match ?? null

    // Swaps in a newer copy of the match, from a score, a poll or a 409, and
    // refreshes the point-by-point that goes with it.
    const latest = useRef<Match | null>(null)
    latest.current = match
    const applyMatch = (next: Match) => {
        if (latest.current && next.version < latest.current.version) {
            return
        }
        setState((prev) =>
            prev.status === "ready" ? { ...prev, data: { ...prev.data, match: next } } : prev
        )
        Promise.all([squashApi.rallies(next.id), squashApi.matchInsights(next.id)]).then(
            ([rallies, insights]) =>
                setState((prev) =>
                    prev.status === "ready" && prev.data.match.version === next.version
                        ? { ...prev, data: { ...prev.data, rallies, insights } }
                        : prev
                ),
            () => undefined
        )
    }

    // Follow a match that's on, so several phones can score it and anyone
    // else can watch. Paused while the tab is hidden.
    const live = match !== null && isLive(match)
    useEffect(() => {
        if (!live) {
            return
        }
        const timer = window.setInterval(() => {
            const current = latest.current
            if (!current || document.hidden) {
                return
            }
            squashApi.pollMatch(current.id, current.version).then(
                (next) => next && applyMatch(next),
                () => undefined
            )
        }, POLL_MS)
        return () => window.clearInterval(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [live, id])

    const act = async (action: () => Promise<void>) => {
        setBusy(true)
        setActionError(null)
        try {
            await action()
        } catch (error) {
            if (error instanceof StaleMatchError) {
                applyMatch(error.match)
            }
            setActionError((error as Error).message)
        } finally {
            setBusy(false)
            setConfirming(null)
        }
    }

    return (
        <SquashPage state={state} refreshing={refreshing} onRefresh={reload} what="Match">
            {({ match, players, rallies, insights }, me) => {
                const canChange =
                    isAdmin ||
                    (ownUserId !== null && match.created_by_id === ownUserId) ||
                    (me !== null && match.players.some((p) => p.player_id === me.id))
                const lastGame = match.games[match.games.length - 1]
                // A game typed in can be taken back as a whole; one scored
                // live is undone a point at a time instead.
                const canRemoveLastGame = canChange && lastGame !== undefined && lastGame.rallies === 0 && match.status !== "cancelled"
                // The point that won a best-of match can be taken back,
                // which reopens it.
                const canUndoWinner = canChange && match.status === "completed" && lastGame !== undefined && lastGame.rallies > 0

                return (
                    <>
                        <div className="squash-header">
                            <Link className="squash-link" to="/squash">
                                ← All matches
                            </Link>
                        </div>

                        <Scoreboard match={match} players={players} />

                        {isLive(match) && canChange && <LiveScorer match={match} players={players} onMatch={applyMatch} />}
                        {isLive(match) && !canChange && (
                            <p className="squash-muted squash-following">Following live. The score updates as it's played.</p>
                        )}

                        {match.games.length > 0 && (
                            <div className="squash-card">
                                <h4 className="squash-card-title">Games</h4>
                                <table className="squash-games-table">
                                    <thead>
                                        <tr>
                                            <th>Side</th>
                                            {match.games.map((g) => (
                                                <th key={g.number}>{g.number}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {SIDES.map((side) => (
                                            <tr key={side}>
                                                <th scope="row">
                                                    <span className={`squash-side-dot squash-side-${side}`} aria-hidden="true" />{" "}
                                                    {sideNames(match, side, players)}
                                                </th>
                                                {match.games.map((g) => (
                                                    <td
                                                        key={g.number}
                                                        className={g.winning_side === side ? "won" : g.winning_side === null ? "open" : ""}
                                                    >
                                                        {side === 1 ? g.side1_points : g.side2_points}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {(canRemoveLastGame || canUndoWinner) && (
                                    <div className="squash-row-actions">
                                        {canRemoveLastGame && (
                                            <button
                                                type="button"
                                                className="squash-text-button"
                                                disabled={busy}
                                                onClick={() =>
                                                    act(async () => applyMatch(await squashApi.deleteLastGame(match.id)))
                                                }
                                            >
                                                Remove game {lastGame.number}
                                            </button>
                                        )}
                                        {canUndoWinner && (
                                            <button
                                                type="button"
                                                className="squash-text-button"
                                                disabled={busy}
                                                onClick={() =>
                                                    act(async () => applyMatch(await squashApi.undoRally(match.id, match.version)))
                                                }
                                            >
                                                Undo the winning point
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {canChange && match.status !== "cancelled" && (match.status !== "completed" || match.best_of === null) && (
                            <details className="squash-card squash-details">
                                <summary>Enter a game's score instead</summary>
                                <p className="squash-muted">
                                    For games played without scoring them here. The game that decides a best-of match
                                    finishes it.
                                </p>
                                <EnterGame key={`${match.version}`} match={match} onMatch={applyMatch} />
                            </details>
                        )}

                        <PointByPoint match={match} rallies={rallies} players={players} />

                        <MatchInsightsCard match={match} insights={insights} players={players} />

                        {canChange && (
                            <div className="squash-card squash-manage">
                                <button type="button" className="squash-secondary-button" onClick={() => setEditing(true)}>
                                    Edit details
                                </button>
                                {match.status !== "cancelled" && !merging && (
                                    <button type="button" className="squash-secondary-button" onClick={() => setMerging(true)}>
                                        Merge with another match
                                    </button>
                                )}
                                {isLive(match) && confirming !== "cancel" && (
                                    <button type="button" className="squash-secondary-button" onClick={() => setConfirming("cancel")}>
                                        Cancel match
                                    </button>
                                )}
                                {confirming === "cancel" && (
                                    <span className="squash-confirm">
                                        Mark it cancelled?
                                        <button type="button" className="squash-secondary-button" onClick={() => setConfirming(null)}>
                                            No
                                        </button>
                                        <button
                                            type="button"
                                            className="squash-danger-button"
                                            disabled={busy}
                                            onClick={() =>
                                                act(async () =>
                                                    applyMatch(await squashApi.updateMatch(match.id, toInput(match, { status: "cancelled" })))
                                                )
                                            }
                                        >
                                            Cancel it
                                        </button>
                                    </span>
                                )}
                                {confirming !== "delete" ? (
                                    <button type="button" className="squash-danger-button" onClick={() => setConfirming("delete")}>
                                        Delete
                                    </button>
                                ) : (
                                    <span className="squash-confirm">
                                        Delete this match and its scores for good?
                                        <button type="button" className="squash-secondary-button" onClick={() => setConfirming(null)}>
                                            No
                                        </button>
                                        <button
                                            type="button"
                                            className="squash-danger-button"
                                            disabled={busy}
                                            onClick={() =>
                                                act(async () => {
                                                    await squashApi.deleteMatch(match.id)
                                                    navigate("/squash")
                                                })
                                            }
                                        >
                                            Delete
                                        </button>
                                    </span>
                                )}
                                {actionError && <p className="error-message squash-inline-error">{actionError}</p>}
                            </div>
                        )}

                        {merging && (
                            <MergeMatches
                                key={match.id}
                                match={match}
                                onClose={() => setMerging(false)}
                                onMerged={(kept) => {
                                    setMerging(false)
                                    // This match may be the one that was deleted.
                                    if (kept.id === match.id) {
                                        applyMatch(kept)
                                    } else {
                                        navigate(`/squash/matches/${kept.id}`, { replace: true })
                                    }
                                }}
                            />
                        )}

                        {editing && (
                            <MatchForm
                                players={players.filter((p) => p.is_active || match.players.some((mp) => mp.player_id === p.id))}
                                me={me}
                                match={match}
                                onClose={() => setEditing(false)}
                                onSaved={(saved) => {
                                    setEditing(false)
                                    applyMatch(saved)
                                }}
                            />
                        )}
                    </>
                )
            }}
        </SquashPage>
    )
}
