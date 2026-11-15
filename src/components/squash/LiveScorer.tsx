import { useState } from "react"

import { Match, Player, Side, squashApi, StaleMatchError } from "./api"
import { ballFor, currentGame, SIDES, sideNames } from "./format"

interface Props {
    match: Match
    players: Player[]
    onMatch: (match: Match) => void
}

// Scores a match a rally at a time: tap the side that won the point. Every
// change is sent against the version on screen, so if another phone scored
// the same rally first the API refuses it and hands back the match as it now
// stands, which is shown instead of adding the point twice.
export default function LiveScorer({ match, players, onMatch }: Props) {
    const [busy, setBusy] = useState(false)
    const [notice, setNotice] = useState<string | null>(null)
    const [confirmingEnd, setConfirmingEnd] = useState(false)

    const game = currentGame(match)
    const ball = ballFor(match)
    const finishedGames = match.games.filter((g) => g.winning_side !== null).length
    const canUndo = match.games.some((g) => g.rallies > 0)
    // A best-of match ends itself on its deciding point; an open-ended one
    // ends when the players say so, once at least one game counts.
    const canEnd = match.best_of === null && finishedGames > 0

    const run = async (action: () => Promise<Match>, staleMessage: string) => {
        setBusy(true)
        setNotice(null)
        try {
            onMatch(await action())
        } catch (error) {
            if (error instanceof StaleMatchError) {
                onMatch(error.match)
                setNotice(staleMessage)
            } else {
                setNotice((error as Error).message)
            }
        } finally {
            setBusy(false)
        }
    }

    const point = (side: Side) =>
        run(
            () => squashApi.addRally(match.id, side, match.version),
            "Someone else scored that rally first, so it's shown as they scored it. Tap again if it was another point."
        )

    const undo = () =>
        run(() => squashApi.undoRally(match.id, match.version), "The score changed before the undo went through. Check it and try again.")

    const end = () => {
        setConfirmingEnd(false)
        return run(() => squashApi.completeMatch(match.id, match.version), "The score changed just now. Check it and end the match again.")
    }

    return (
        <section className="squash-scorer" aria-label="Live scoring">
            <div className="squash-scorer-head">
                <span>Game {game.number}</span>
                {ball && (
                    <span className={`squash-ball squash-side-${ball.side}-text`}>
                        {ball.kind === "match" ? "Match ball" : "Game ball"}
                    </span>
                )}
            </div>

            <div className="squash-scorer-buttons">
                {SIDES.map((side) => {
                    const points = side === 1 ? game.side1_points : game.side2_points
                    const games = side === 1 ? match.side1_games : match.side2_games
                    const serving = match.serving_side === side
                    return (
                        <button
                            key={side}
                            type="button"
                            className={`squash-point-button squash-side-${side}`}
                            onClick={() => point(side)}
                            disabled={busy}
                            aria-label={`Point to ${sideNames(match, side, players)}, now ${points}`}
                        >
                            <span className="squash-point-names">{sideNames(match, side, players)}</span>
                            <span className="squash-point-score">{points}</span>
                            <span className="squash-point-meta">
                                {games} {games === 1 ? "game" : "games"}
                                {serving && <span className="squash-serving">● serving</span>}
                            </span>
                        </button>
                    )
                })}
            </div>

            {notice && (
                <p className="squash-notice" role="status">
                    {notice}
                </p>
            )}

            <div className="squash-scorer-actions">
                <button type="button" className="squash-secondary-button" onClick={undo} disabled={busy || !canUndo}>
                    ↶ Undo last point
                </button>
                {canEnd &&
                    (confirmingEnd ? (
                        <span className="squash-confirm">
                            End it at {match.side1_games}-{match.side2_games}
                            {game.rallies > 0 ? " and drop the unfinished game" : ""}?
                            <button type="button" className="squash-secondary-button" onClick={() => setConfirmingEnd(false)}>
                                No
                            </button>
                            <button type="button" className="squash-primary-button" onClick={end} disabled={busy}>
                                End match
                            </button>
                        </span>
                    ) : (
                        <button type="button" className="squash-secondary-button" onClick={() => setConfirmingEnd(true)} disabled={busy}>
                            🏁 End match
                        </button>
                    ))}
            </div>
        </section>
    )
}
