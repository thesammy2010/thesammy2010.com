import { useState } from "react"

import { Box, Match, Player, Rally, RallyInput, Side, squashApi, StaleMatchError } from "./api"
import { advancedTracking, ballFor, currentGame, SIDES, sideNames, toInput } from "./format"
import { serviceBox } from "./serve"
import { sideColourStyle } from "./colours"

interface Props {
    match: Match
    // Every rally so far, for which box to serve from
    rallies: Rally[]
    players: Player[]
    onMatch: (match: Match) => void
}

// Scores a match a rally at a time: tap the side that won the point. Every
// change is sent against the version on screen, so if another phone scored
// the same rally first the API refuses it and hands back the match as it now
// stands, which is shown instead of adding the point twice. Under each side
// are the calls on that side's appeals: a let, replayed with no point, a
// stroke to them, or a no let, the point to their opponent. A match without
// advanced tracking has neither the calls nor the box.
//
// Above the buttons is who's serving and from which box. Who serves first
// comes from the API: the spin of the racket for the first game, then the
// sides taking turns. Change swaps it as any game starts, before a point's
// won (or it's asked, from an API that doesn't spin); after that the API
// works it out from who won the last point. Each rally is sent with its server, so the game's page
// can show who served it. In doubles, which partner serves is picked here.
// A hand starts in the box its server prefers, which they choose on their
// own player page, and Switch box changes it for that hand, until they've won
// a point in it. The API says which box, and keeps a switch, so every phone,
// watch and page scoring the match shows the same one. A match set not to
// track the boxes shows none of that, and sends no box.
export default function LiveScorer({ match, rallies, players, onMatch }: Props) {
    const [busy, setBusy] = useState(false)
    // Chosen here as a game starts, over the side the API gives
    const [firstServer, setFirstServer] = useState<{ game: number; side: Side } | null>(null)
    // In doubles, a partner said here to be serving instead of the one the
    // API has, until the score moves on
    const [chosenServer, setChosenServer] = useState<{ version: number; id: string } | null>(null)
    // Hands whose server chose the other box to start
    const [switched, setSwitched] = useState<Set<string>>(new Set())
    const [notice, setNotice] = useState<string | null>(null)
    const [confirmingEnd, setConfirmingEnd] = useState(false)

    const game = currentGame(match)
    const ball = ballFor(match)
    // Before the game's first point, when either side can still serve first
    const atGameStart = game.side1_points === 0 && game.side2_points === 0
    const picked = atGameStart && firstServer?.game === game.number ? firstServer.side : null
    const serving = picked ?? match.serving_side
    const onSide = (side: Side) => match.players.filter((p) => p.side === side).map((p) => p.player_id)
    // Who serves for a side: one chosen here, else the API's (which in
    // doubles goes round all four in turn), else the side's first player
    const serverId = (side: Side) => {
        const ids = onSide(side)
        if (chosenServer?.version === match.version && ids.includes(chosenServer.id)) {
            return chosenServer.id
        }
        if (match.serving_player_id && ids.includes(match.serving_player_id)) {
            return match.serving_player_id
        }
        return ids[0] ?? null
    }
    const playerOf = (playerId: string | null) => players.find((p) => p.id === playerId)
    const nameOf = (playerId: string | null) => playerOf(playerId)?.name ?? "Unknown player"
    // The API's box, unless it's from before it gave one, or the side
    // picked here to serve first isn't the one it has serving
    const boxFromApi = match.can_choose_box !== undefined && (picked === null || picked === match.serving_side)
    // Worked out here otherwise: each hand starts in the box its server
    // prefers, or else the right
    const tracked = advancedTracking(match)
    const localBox =
        !tracked || boxFromApi
            ? null
            : serviceBox(match, rallies, picked, switched, (side) => playerOf(serverId(side))?.preferred_box ?? "right")
    const box: Box | null = !tracked ? null : boxFromApi ? match.serving_box ?? null : localBox?.box ?? null
    const canSwitchBox = boxFromApi ? match.can_choose_box === true && box !== null : localBox !== null
    const across = (side: Box): Box => (side === "right" ? "left" : "right")
    const switchBox = () => {
        if (box === null) {
            return
        }
        if (boxFromApi) {
            void run(
                () => squashApi.chooseBox(match.id, across(box), match.version),
                "The score changed before the box was switched. Check it and switch again."
            )
        } else if (localBox) {
            const next = new Set(switched)
            if (!next.delete(localBox.hand)) {
                next.add(localBox.hand)
            }
            setSwitched(next)
        }
    }
    const finishedGames = match.games.filter((g) => g.winning_side !== null).length
    const canUndo = match.games.some((g) => g.rallies > 0)
    // A match can be ended where it stands once a game counts. A best-of
    // match ends itself on its deciding point, so ending one sooner makes it
    // open-ended first, as the API only ends those early.
    const canEnd = finishedGames > 0
    const endingEarly = match.best_of !== null

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

    const score = (rally: RallyInput) =>
        run(
            () =>
                squashApi.addRally(
                    match.id,
                    {
                        ...rally,
                        server_id: serving === null ? null : serverId(serving),
                        // Kept with the rally, as the scorer follows it
                        box
                    },
                    match.version
                ),
            "Someone else scored that rally first, so it's shown as they scored it. Tap again if it was another point."
        )

    const undo = () =>
        run(
            () => squashApi.undoRally(match.id, match.version),
            "The score changed before the undo went through. Check it and try again."
        )

    const other = (side: Side): Side => (side === 1 ? 2 : 1)

    const end = () => {
        setConfirmingEnd(false)
        return run(async () => {
            const current = endingEarly
                ? await squashApi.updateMatch(match.id, toInput(match, { best_of: null }))
                : match
            return squashApi.completeMatch(current.id, current.version)
        }, "The score changed just now. Check it and end the match again.")
    }

    return (
        <section className="squash-scorer" aria-label="Live scoring" style={sideColourStyle(match)}>
            <div className="squash-scorer-head">
                <span>Game {game.number}</span>
                {ball && (
                    <span className={`squash-ball squash-side-${ball.side}-text`}>
                        {ball.kind === "match" ? "Match ball" : "Game ball"}
                    </span>
                )}
            </div>

            {serving === null && atGameStart && (
                <div className="squash-serve-row" role="group" aria-label="Who serves first">
                    <span>Who serves first?</span>
                    {SIDES.map((side) => (
                        <button
                            key={side}
                            type="button"
                            className="squash-secondary-button"
                            onClick={() => setFirstServer({ game: game.number, side })}
                        >
                            {sideNames(match, side, players)}
                        </button>
                    ))}
                </div>
            )}
            {serving !== null && (
                <div className="squash-serve-row">
                    <span>
                        <span className={`squash-side-dot squash-side-${serving}`} aria-hidden="true" />{" "}
                        <strong>{nameOf(serverId(serving))}</strong> to serve
                        {box && (
                            <>
                                {" "}
                                from the <strong>{box}</strong> box
                            </>
                        )}
                    </span>
                    {canSwitchBox && (
                        <button type="button" className="squash-text-button" disabled={busy} onClick={switchBox}>
                            Switch box
                        </button>
                    )}
                    {onSide(serving).length > 1 && (
                        <button
                            type="button"
                            className="squash-text-button"
                            onClick={() => {
                                const ids = onSide(serving)
                                const current = serverId(serving)
                                const next = ids[(ids.indexOf(current ?? "") + 1) % ids.length]
                                setChosenServer({ version: match.version, id: next })
                            }}
                        >
                            Other partner serving
                        </button>
                    )}
                    {atGameStart && (
                        <button
                            type="button"
                            className="squash-text-button"
                            onClick={() => setFirstServer({ game: game.number, side: other(serving) })}
                        >
                            Change
                        </button>
                    )}
                </div>
            )}

            <div className="squash-scorer-buttons">
                {SIDES.map((side) => {
                    const points = side === 1 ? game.side1_points : game.side2_points
                    const games = side === 1 ? match.side1_games : match.side2_games
                    const isServing = serving === side
                    return (
                        <button
                            key={side}
                            type="button"
                            className={`squash-point-button squash-side-${side}`}
                            onClick={() => score({ won_by_side: side })}
                            disabled={busy}
                            aria-label={`Point to ${sideNames(match, side, players)}, now ${points}`}
                        >
                            <span className="squash-point-names">{sideNames(match, side, players)}</span>
                            <span className="squash-point-score">{points}</span>
                            <span className="squash-point-meta">
                                {games} {games === 1 ? "game" : "games"}
                                {isServing && <span className="squash-serving">● serving</span>}
                            </span>
                        </button>
                    )
                })}
            </div>

            {tracked && (
                <div className="squash-scorer-appeals">
                    {SIDES.map((side) => {
                        const names = sideNames(match, side, players)
                        return (
                            <div key={side} className="squash-appeal" role="group" aria-label={`${names} appealed`}>
                                <span className="squash-appeal-label">Appeal by {names}</span>
                                <div className="squash-appeal-buttons">
                                    <button
                                        type="button"
                                        className="squash-secondary-button"
                                        onClick={() => score({ decision: "let", appealed_by_side: side })}
                                        disabled={busy}
                                        title="Replayed: no point, same server"
                                    >
                                        Let
                                    </button>
                                    <button
                                        type="button"
                                        className="squash-secondary-button"
                                        onClick={() => score({ won_by_side: side, decision: "stroke" })}
                                        disabled={busy}
                                        title={`Point to ${names}`}
                                    >
                                        Stroke
                                    </button>
                                    <button
                                        type="button"
                                        className="squash-secondary-button"
                                        onClick={() => score({ won_by_side: other(side), decision: "no_let" })}
                                        disabled={busy}
                                        title={`Point to ${sideNames(match, other(side), players)}`}
                                    >
                                        No let
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {notice && (
                <p className="squash-notice" role="status">
                    {notice}
                </p>
            )}

            <div className="squash-scorer-actions">
                <button type="button" className="squash-secondary-button" onClick={undo} disabled={busy || !canUndo}>
                    ↶ Undo last rally
                </button>
                {canEnd &&
                    (confirmingEnd ? (
                        <span className="squash-confirm">
                            End it at {match.side1_games}-{match.side2_games}
                            {game.rallies > 0 ? " and drop the unfinished game" : ""}?
                            {endingEarly && (
                                <span className="squash-warning">
                                    It's best of {match.best_of} and not yet won, so it'll be changed to open-ended to
                                    end it now. It won't show as best of {match.best_of} afterwards.
                                </span>
                            )}
                            <button
                                type="button"
                                className="squash-secondary-button"
                                onClick={() => setConfirmingEnd(false)}
                            >
                                No
                            </button>
                            <button type="button" className="squash-primary-button" onClick={end} disabled={busy}>
                                End match
                            </button>
                        </span>
                    ) : (
                        <button
                            type="button"
                            className="squash-secondary-button"
                            onClick={() => setConfirmingEnd(true)}
                            disabled={busy}
                        >
                            🏁 End match
                        </button>
                    ))}
            </div>
        </section>
    )
}
