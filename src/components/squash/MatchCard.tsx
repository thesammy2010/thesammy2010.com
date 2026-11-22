import { Link } from "react-router-dom"

import { Match, Player } from "./api"
import { currentGame, formatDuration, formatLabel, formatWhen, SIDES, sideNames, STATUS_LABELS } from "./format"

interface Props {
    match: Match
    players: Player[]
    me: Player | null
}

// One match in a list: when and where, then a row per side with the games
// they won and each game's points. The winner's row is tinted in their
// side's colour with a badge, the loser's greyed, and each game's winning
// score boxed in the winner's colour.
export default function MatchCard({ match, players, me }: Props) {
    const live = match.status === "in_progress"
    const game = currentGame(match)

    return (
        <Link to={`/squash/matches/${match.id}`} className={`squash-card squash-match-card ${live ? "live" : ""}`}>
            <div className="squash-card-head">
                <span className="squash-when">
                    {formatWhen(match.played_at)}
                    {match.venue && <span className="squash-muted"> · {match.venue}</span>}
                </span>
                {match.is_private && <span className="squash-private-badge">🔒 Private</span>}
                <span className={`squash-status squash-status-${match.status}`}>{STATUS_LABELS[match.status]}</span>
            </div>

            <div className="squash-scoreline">
                {SIDES.map((side) => {
                    const won = side === 1 ? match.side1_games : match.side2_games
                    const isWinner = match.status === "completed" && match.winning_side === side
                    const isLoser = match.status === "completed" && match.winning_side !== null && !isWinner
                    const isMine = match.players.some((p) => p.side === side && p.player_id === me?.id)
                    return (
                        <div
                            key={side}
                            className={`squash-scoreline-row squash-row-side-${side} ${isWinner ? "winner" : ""} ${
                                isLoser ? "loser" : ""
                            }`}
                        >
                            <span className={`squash-side-dot squash-side-${side}`} aria-hidden="true" />
                            <span className="squash-scoreline-names">
                                {sideNames(match, side, players)}
                                {isMine && <span className="squash-you">you</span>}
                            </span>
                            {isWinner && <span className="squash-won-badge">🏆 Won</span>}
                            <span className="squash-scoreline-games">
                                {match.games.map((g) => (
                                    <span
                                        key={g.number}
                                        className={g.winning_side === side ? "won" : g.winning_side === null ? "open" : ""}
                                        title={g.winning_side === side ? `Won game ${g.number}` : undefined}
                                    >
                                        {side === 1 ? g.side1_points : g.side2_points}
                                    </span>
                                ))}
                            </span>
                            <span className="squash-scoreline-total">{match.games.length > 0 ? won : ""}</span>
                        </div>
                    )
                })}
            </div>

            <div className="squash-card-foot squash-muted">
                {formatLabel(match)}
                {match.duration_seconds != null && ` · ⏱ ${formatDuration(match.duration_seconds)}`}
                {live && game.rallies > 0 && ` · game ${game.number} in play`}
                {!match.hidden && match.status === "completed" && match.winning_side === null && " · drawn"}
                {match.hidden && " · score private"}
            </div>
        </Link>
    )
}
