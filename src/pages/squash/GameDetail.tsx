import React from "react"
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
import MomentumChart from "../../components/squash/MomentumChart"
import SquashPage from "../../components/squash/SquashPage"
import { CALLS, formatWhen, SIDES, sideNames } from "../../components/squash/format"

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
            {({ match, players, rallies, insights }) => {
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
                            <p className="squash-muted">Only its players and admins can see this match's games.</p>
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

                const gameRallies = rallies.filter((r) => r.game === gameNumber).sort((a, b) => a.number - b.number)
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

                        {gameRallies.length > 0 && (
                            <div className="squash-card">
                                <MomentumChart match={match} rallies={gameRallies} players={players} />
                            </div>
                        )}

                        {gameInsights?.scored_live && (
                            <div className="squash-card">
                                <h4 className="squash-card-title">Stats</h4>
                                <SidesTable match={match} sides={gameInsights.sides} players={players} />
                            </div>
                        )}

                        {gameRallies.length > 0 && (
                            <div className="squash-card">
                                <h4 className="squash-card-title">Rally by rally</h4>
                                <table className="squash-table squash-rally-table">
                                    <thead>
                                        <tr>
                                            <th scope="col">Rally</th>
                                            {showServer && <th scope="col">Served</th>}
                                            <th scope="col">Point to</th>
                                            <th scope="col">Call</th>
                                            <th scope="col">Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {gameRallies.map((rally) => (
                                            <tr key={rally.number}>
                                                <th scope="row">{rally.number}</th>
                                                {showServer && <td>{nameOf(rally.server_id) ?? "—"}</td>}
                                                <td>
                                                    {rally.won_by_side === null ? (
                                                        <span className="squash-muted">Replayed</span>
                                                    ) : (
                                                        <>
                                                            <span
                                                                className={`squash-side-dot squash-side-${rally.won_by_side}`}
                                                                aria-hidden="true"
                                                            />{" "}
                                                            {sideNames(match, rally.won_by_side, players)}
                                                        </>
                                                    )}
                                                </td>
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
                                                    ) : (
                                                        ""
                                                    )}
                                                </td>
                                                <td className="squash-rally-score">
                                                    {rally.side1_points}-{rally.side2_points}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <Comments match={match} game={game.number} />
                    </>
                )
            }}
        </SquashPage>
    )
}
