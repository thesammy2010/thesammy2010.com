import React, { useState } from "react"
import { Link, useParams } from "react-router-dom"

import {
    Match,
    MatchInsights,
    Player,
    Rally,
    squashApi,
    unlessPrivate,
    useSquashLoad
} from "../../components/squash/api"
import Comments from "../../components/squash/Comments"
import { gameNotes, SidesTable } from "../../components/squash/Insights"
import RallyGraph from "../../components/squash/RallyGraph"
import RallyTimeFix from "../../components/squash/RallyTimeFix"
import { useSimpleView } from "../../components/squash/simple"
import SquashPage from "../../components/squash/SquashPage"
import {
    apiTime,
    CALLS,
    formatDuration,
    formatWhen,
    SIDES,
    sideNames,
    typicalRallySeconds
} from "../../components/squash/format"
import { useIsAdmin, useOwnUserId } from "../../roles"
import { withColours } from "../../components/squash/colours"

interface GameData {
    match: Match
    players: Player[]
    rallies: Rally[]
    // Null for a private match the caller isn't in
    insights: MatchInsights | null
}

// One game of a match: its score, how it went, each side's figures and
// every rally, with the games either side of it a tap away.
export default function GameDetail() {
    const { id = "", number = "" } = useParams()
    const gameNumber = Number(number)
    const simple = useSimpleView()
    const isAdmin = useIsAdmin()
    const ownUserId = useOwnUserId()
    // The rally whose time is being corrected
    const [fixing, setFixing] = useState<number | null>(null)

    const { state, refreshing, reload } = useSquashLoad<GameData>(async () => {
        const [match, players, rallies, insights] = await Promise.all([
            squashApi.match(id),
            squashApi.players(true),
            unlessPrivate(squashApi.rallies(id)),
            unlessPrivate(squashApi.matchInsights(id))
        ])
        return { match, players, rallies: rallies ?? [], insights }
    }, [id])

    return (
        <SquashPage state={state} refreshing={refreshing} onRefresh={reload} what="Game">
            {({ match, players, rallies, insights }, me) =>
                withColours(
                    match,
                    (() => {
                        // Its players, whoever arranged it and admins, as the API allows
                        const canChange =
                            isAdmin ||
                            (ownUserId !== null && match.created_by_id === ownUserId) ||
                            (me !== null && match.players.some((p) => p.player_id === me.id))
                        // Every rally in the order played, for a rally's neighbours
                        const allOrdered = [...rallies].sort((a, b) => a.game - b.game || a.number - b.number)
                        const timeOf = (r: Rally | undefined) => (r?.created_at ? apiTime(r.created_at) : null)
                        const matchLink = `/squash/matches/${match.id}`
                        const game = match.games.find((g) => g.number === gameNumber)
                        const header = (
                            <div className="squash-header squash-game-nav">
                                <Link className="squash-link" to={matchLink}>
                                    ← Match
                                </Link>
                                {game && (
                                    <span className="squash-game-steps">
                                        {gameNumber > 1 && (
                                            <Link className="squash-link" to={`${matchLink}/games/${gameNumber - 1}`}>
                                                ‹ Game {gameNumber - 1}
                                            </Link>
                                        )}
                                        {gameNumber < match.games.length && (
                                            <Link className="squash-link" to={`${matchLink}/games/${gameNumber + 1}`}>
                                                Game {gameNumber + 1} ›
                                            </Link>
                                        )}
                                    </span>
                                )}
                            </div>
                        )
                        if (match.hidden) {
                            return (
                                <>
                                    {header}
                                    <p className="squash-muted">
                                        Only its players and admins can see this match's games.
                                    </p>
                                </>
                            )
                        }
                        if (!game) {
                            return (
                                <>
                                    {header}
                                    <p className="squash-muted">This match has no game {number}.</p>
                                </>
                            )
                        }

                        const gameRallies = rallies
                            .filter((r) => r.game === gameNumber)
                            .sort((a, b) => a.number - b.number)
                        const gameInsights = insights?.games.find((g) => g.number === gameNumber)
                        const notes = gameInsights ? gameNotes(match, gameInsights, players) : []
                        const nameOf = (playerId: string | null) => players.find((p) => p.id === playerId)?.name ?? null
                        const showServer = gameRallies.some((r) => r.server_id !== null)

                        return (
                            <>
                                {header}

                                <div className="squash-card squash-scoreboard">
                                    <div className="squash-card-head">
                                        <span className="squash-when">
                                            Game {game.number} of {match.games.length}
                                            <span className="squash-muted"> · {formatWhen(match.played_at)}</span>
                                            {game.duration_seconds != null && (
                                                <span
                                                    className="squash-muted"
                                                    title="From its first rally, a let included, to the winning point"
                                                >
                                                    {" "}
                                                    · ⏱ {formatDuration(game.duration_seconds)}
                                                </span>
                                            )}
                                        </span>
                                        {game.winning_side === null && <span className="squash-status">In play</span>}
                                    </div>
                                    <div className="squash-scoreboard-sides">
                                        {SIDES.map((side) => {
                                            const winner = game.winning_side === side
                                            const loser = game.winning_side !== null && !winner
                                            return (
                                                <div
                                                    key={side}
                                                    className={`squash-scoreboard-side squash-row-side-${side} ${
                                                        winner ? "winner" : ""
                                                    } ${loser ? "loser" : ""}`}
                                                >
                                                    <span
                                                        className={`squash-side-dot squash-side-${side}`}
                                                        aria-hidden="true"
                                                    />
                                                    <span className="squash-scoreboard-names">
                                                        {sideNames(match, side, players)}
                                                    </span>
                                                    {winner && <span className="squash-won-badge">🏆 Won</span>}
                                                    <span className="squash-scoreboard-games">
                                                        {side === 1 ? game.side1_points : game.side2_points}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    {notes.length > 0 && (
                                        <p className="squash-notes">
                                            {notes.join(", and ").replace(/^./, (c) => c.toUpperCase())}.
                                        </p>
                                    )}
                                    {game.rallies === 0 && (
                                        <p className="squash-muted">
                                            Entered as a final score, so there's no point by point for this game.
                                        </p>
                                    )}
                                </div>

                                {!simple && (
                                    <RallyGraph
                                        match={match}
                                        rallies={gameRallies}
                                        players={players}
                                        linkGames={false}
                                    />
                                )}

                                {!simple && gameInsights?.scored_live && (
                                    <div className="squash-card">
                                        <h4 className="squash-card-title">Stats</h4>
                                        <SidesTable match={match} sides={gameInsights.sides} players={players} />
                                    </div>
                                )}

                                {!simple && gameRallies.length > 0 && (
                                    <div className="squash-card">
                                        <h4 className="squash-card-title">Rally by rally</h4>
                                        <p className="squash-muted">
                                            Shaded for who won the point. A rally's time runs from the one before it
                                            being scored, so the first has none.
                                            {canChange && " Choose Fix on a rally to correct its time."}
                                        </p>
                                        <table className="squash-table squash-rally-table">
                                            <thead>
                                                <tr>
                                                    <th scope="col">#</th>
                                                    {showServer && <th scope="col">Served</th>}
                                                    <th scope="col">Call</th>
                                                    <th scope="col">Time</th>
                                                    <th scope="col">Score</th>
                                                    {canChange && <th scope="col" aria-label="Correct the time" />}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {gameRallies.map((rally, index) => {
                                                    const before = gameRallies[index - 1]
                                                    const seconds =
                                                        before?.created_at && rally.created_at
                                                            ? (apiTime(rally.created_at) - apiTime(before.created_at)) /
                                                              1000
                                                            : null
                                                    const at = allOrdered.findIndex(
                                                        (r) => r.game === rally.game && r.number === rally.number
                                                    )
                                                    const won = rally.won_by_side
                                                    return (
                                                        <React.Fragment key={rally.number}>
                                                            <tr
                                                                className={
                                                                    won === null ? "" : `squash-rally-won-${won}`
                                                                }
                                                                title={
                                                                    won === null
                                                                        ? "Replayed"
                                                                        : `Point to ${sideNames(match, won, players)}`
                                                                }
                                                            >
                                                                <th scope="row">{rally.number}</th>
                                                                {showServer && (
                                                                    <td>
                                                                        {nameOf(rally.server_id) ?? "—"}
                                                                        {rally.box && (
                                                                            <span className="squash-muted">
                                                                                {" "}
                                                                                · {rally.box} box
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                )}
                                                                <td>
                                                                    {rally.decision ? (
                                                                        <>
                                                                            {CALLS[rally.decision]}
                                                                            {rally.appealed_by_side !== null && (
                                                                                <span className="squash-muted">
                                                                                    {" "}
                                                                                    ·{" "}
                                                                                    {sideNames(
                                                                                        match,
                                                                                        rally.appealed_by_side,
                                                                                        players
                                                                                    )}{" "}
                                                                                    appealed
                                                                                </span>
                                                                            )}
                                                                        </>
                                                                    ) : won === null ? (
                                                                        <span className="squash-muted">Replayed</span>
                                                                    ) : (
                                                                        ""
                                                                    )}
                                                                </td>
                                                                <td className="squash-muted">
                                                                    {seconds === null
                                                                        ? "—"
                                                                        : formatDuration(
                                                                              Math.max(0, Math.round(seconds))
                                                                          )}
                                                                </td>
                                                                <td className="squash-rally-score">
                                                                    {rally.side1_points}-{rally.side2_points}
                                                                </td>
                                                                {canChange && (
                                                                    <td>
                                                                        <button
                                                                            type="button"
                                                                            className="squash-text-button"
                                                                            aria-label={`Correct rally ${rally.number}'s time`}
                                                                            onClick={() =>
                                                                                setFixing(
                                                                                    fixing === rally.number
                                                                                        ? null
                                                                                        : rally.number
                                                                                )
                                                                            }
                                                                        >
                                                                            Fix
                                                                        </button>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                            {fixing === rally.number && rally.created_at && (
                                                                <tr>
                                                                    <td
                                                                        className="squash-rally-fix-cell"
                                                                        colSpan={(showServer ? 5 : 4) + 1}
                                                                    >
                                                                        <RallyTimeFix
                                                                            match={match}
                                                                            rally={rally}
                                                                            previous={timeOf(allOrdered[at - 1])}
                                                                            next={timeOf(allOrdered[at + 1])}
                                                                            typical={typicalRallySeconds(gameRallies)}
                                                                            onDone={(changed) => {
                                                                                setFixing(null)
                                                                                if (changed) reload()
                                                                            }}
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <Comments match={match} game={game.number} />
                            </>
                        )
                    })()
                )
            }
        </SquashPage>
    )
}
