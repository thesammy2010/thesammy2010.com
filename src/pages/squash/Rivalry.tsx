import React from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"

import {
    HeadToHead,
    Match,
    MatchFormat,
    Player,
    PlayerInsights,
    squashApi,
    useSquashLoad
} from "../../components/squash/api"
import { PlayerInsightsCard } from "../../components/squash/Insights"
import MatchCard from "../../components/squash/MatchCard"
import MatchRecord from "../../components/squash/MatchRecord"
import PlayerAvatar from "../../components/squash/PlayerAvatar"
import { useSimpleView } from "../../components/squash/simple"
import SquashPage from "../../components/squash/SquashPage"
import StatRings, { share, StatFigure } from "../../components/squash/StatRings"

interface RivalryData {
    player: Player
    opponent: Player
    players: Player[]
    record: HeadToHead
    // Each of them over the matches against the other
    mine: PlayerInsights
    theirs: PlayerInsights
    matches: Match[]
}

const FORMATS: { value: MatchFormat | ""; label: string }[] = [
    { value: "", label: "All" },
    { value: "singles", label: "Singles" },
    { value: "doubles", label: "Doubles" }
]

// "Sam leads", "Level", from the player's matches against the opponent.
function verdict(record: HeadToHead, player: Player, opponent: Player): string {
    if (record.matches_played === 0) {
        return "Not played yet"
    }
    if (record.matches_won === record.matches_lost) {
        return "Level"
    }
    return `${record.matches_won > record.matches_lost ? player.name : opponent.name} leads`
}

// Their record against each other as rings, the opponent's being the other
// side of the same matches.
function recordFigures(record: HeadToHead, mine: PlayerInsights, name: string): StatFigure[] {
    const played = record.matches_won + record.matches_lost
    const games = record.games_won + record.games_lost
    const figures = [
        share("Matches won", record.matches_won, played, record.matches_lost, played, name),
        share("Games won", record.games_won, games, record.games_lost, games, name)
    ]
    const won = record.points_won ?? 0
    const lost = record.points_lost ?? 0
    if (won + lost > 0) {
        figures.push(share("Points won", won, won + lost, lost, won + lost, name))
    }
    const deuce = mine.deuce_games_won + mine.deuce_games_lost
    if (deuce > 0) {
        figures.push(share("Tie-breaks won", mine.deuce_games_won, deuce, mine.deuce_games_lost, deuce, name))
    }
    return figures
}

// How one player does against another: their record, games and points, and
// point by point, over the matches they played on opposite sides of the
// court, then those matches. As the app's rivalry page.
export default function Rivalry() {
    const { id = "", opponentId = "" } = useParams()
    const [searchParams, setSearchParams] = useSearchParams()
    const param = searchParams.get("format")
    const format: MatchFormat | undefined = param === "singles" || param === "doubles" ? param : undefined
    const simple = useSimpleView()

    const { state, refreshing, reload } = useSquashLoad<RivalryData>(async () => {
        const [player, opponent, players, record, mine, theirs, matches] = await Promise.all([
            squashApi.player(id),
            squashApi.player(opponentId),
            squashApi.players(true),
            squashApi.headToHead(id, opponentId, format),
            squashApi.playerInsights(id, format, opponentId),
            squashApi.playerInsights(opponentId, format, id),
            squashApi.matches({ player_id: id, opponent_id: opponentId, format }, 1)
        ])
        // Narrowed here too, as an API from before gives all their matches
        const against = matches.filter((match) => {
            const side = match.players.find((p) => p.player_id === id)?.side
            const theirSide = match.players.find((p) => p.player_id === opponentId)?.side
            return side !== undefined && theirSide !== undefined && side !== theirSide
        })
        return { player, opponent, players, record, mine, theirs, matches: against }
    }, [id, opponentId, format])

    return (
        <SquashPage state={state} refreshing={refreshing} onRefresh={reload} what="Rivalry">
            {({ player, opponent, players, record, mine, theirs, matches }, me) => (
                <>
                    <div className="squash-header">
                        <Link className="squash-link" to={`/squash/players/${player.id}`}>
                            ← {player.name}
                        </Link>
                    </div>

                    <div className="squash-card">
                        <div className="squash-rivalry-head">
                            {[player, opponent].map((who, index) => (
                                <React.Fragment key={who.id}>
                                    {index === 1 && (
                                        <div className="squash-rivalry-record">
                                            <MatchRecord
                                                won={record.matches_won}
                                                lost={record.matches_lost}
                                                drawn={record.matches_drawn}
                                            />
                                            <span className="squash-muted">{verdict(record, player, opponent)}</span>
                                        </div>
                                    )}
                                    <Link className="squash-rivalry-face squash-link" to={`/squash/players/${who.id}`}>
                                        <PlayerAvatar player={who} players={players} size={64} />
                                        {who.name}
                                    </Link>
                                </React.Fragment>
                            ))}
                        </div>
                        <div className="squash-rivalry-formats">
                            <div className="squash-segmented" role="radiogroup" aria-label="Format">
                                {FORMATS.map(({ value, label }) => (
                                    <button
                                        key={label}
                                        type="button"
                                        role="radio"
                                        aria-checked={(format ?? "") === value}
                                        className={(format ?? "") === value ? "active" : ""}
                                        onClick={() =>
                                            setSearchParams(value ? { format: value } : {}, { replace: true })
                                        }
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {record.matches_played === 0 ? (
                        <div className="squash-card squash-empty">
                            <p>No completed {format ? `${format} ` : ""}matches against each other yet.</p>
                        </div>
                    ) : (
                        <>
                            <div className="squash-card">
                                <h4 className="squash-card-title">{player.name}'s record</h4>
                                <p className="squash-muted">
                                    Completed matches on opposite sides of the court
                                    {format ? `, ${format} only` : ", singles and doubles"}. Green where {player.name}{" "}
                                    is ahead, red where {opponent.name} is.
                                </p>
                                <StatRings figures={recordFigures(record, mine, opponent.name)} />
                            </div>
                            {!simple && mine.games_scored_live > 0 && (
                                <div className="squash-card">
                                    <h4 className="squash-card-title">{player.name}, point by point</h4>
                                    <PlayerInsightsCard insights={mine} other={theirs} otherName={opponent.name} />
                                </div>
                            )}
                        </>
                    )}

                    {matches.length > 0 && (
                        <>
                            <h3 className="squash-section-title">Matches</h3>
                            <div className="squash-match-list">
                                {matches.map((match) => (
                                    <MatchCard key={match.id} match={match} players={players} me={me} />
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </SquashPage>
    )
}
