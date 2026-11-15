import React from "react"
import { Link, useParams } from "react-router-dom"

import { HeadToHead, Match, Player, PlayerStats, squashApi, useSquashLoad } from "../../components/squash/api"
import MatchCard from "../../components/squash/MatchCard"
import SquashPage from "../../components/squash/SquashPage"
import { record, winRate } from "../../components/squash/format"

interface PlayerData {
    player: Player
    players: Player[]
    stats: PlayerStats
    headToHeads: HeadToHead[]
    matches: Match[]
}

function Tile({ value, label }: { value: string; label: string }) {
    return (
        <div className="stat-tile">
            <div className="stat-tile-value">{value}</div>
            <div className="stat-tile-label">{label}</div>
        </div>
    )
}

export default function PlayerDetail() {
    const { id = "" } = useParams()

    const { state, refreshing, reload } = useSquashLoad<PlayerData>(async () => {
        const [player, players, stats, matches] = await Promise.all([
            squashApi.player(id),
            squashApi.players(true),
            squashApi.playerStats(id),
            squashApi.matches({ player_id: id }, 1)
        ])
        // Only opponents they've actually played are worth a row.
        const opponents = new Set(
            matches.flatMap((m) => {
                const side = m.players.find((p) => p.player_id === id)?.side
                return m.players.filter((p) => p.side !== side).map((p) => p.player_id)
            })
        )
        const headToHeads = await Promise.all(Array.from(opponents).map((o) => squashApi.headToHead(id, o)))
        return { player, players, stats, matches, headToHeads }
    }, [id])

    return (
        <SquashPage state={state} refreshing={refreshing} onRefresh={reload} what="Player">
            {({ player, players, stats, headToHeads, matches }, me) => (
                <>
                    <div className="squash-header">
                        <Link className="squash-link" to="/squash/players">
                            ← All players
                        </Link>
                    </div>
                    <h2 className="squash-title">
                        {player.name}
                        {player.id === me?.id && <span className="squash-you">you</span>}
                        {!player.is_active && <span className="squash-muted"> · left the group</span>}
                    </h2>

                    <div className="stats-grid">
                        <Tile value={String(stats.matches_played)} label="Matches" />
                        <Tile value={record(stats.matches_won, stats.matches_lost, stats.matches_drawn)} label="Won-lost" />
                        <Tile value={winRate(stats.win_rate)} label="Win rate" />
                        <Tile value={`${stats.games_won}-${stats.games_lost}`} label="Games" />
                        <Tile value={`${stats.points_won}-${stats.points_lost}`} label="Points" />
                    </div>

                    {headToHeads.length > 0 && (
                        <div className="squash-card">
                            <h4 className="squash-card-title">Head to head</h4>
                            <p className="squash-muted">Completed matches on opposite sides, doubles included.</p>
                            <table className="squash-table">
                                <thead>
                                    <tr>
                                        <th>Against</th>
                                        <th>Played</th>
                                        <th>Record</th>
                                        <th>Games</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...headToHeads]
                                        .sort((a, b) => b.matches_played - a.matches_played)
                                        .map((h) => (
                                            <tr key={h.opponent_id}>
                                                <th scope="row">
                                                    <Link className="squash-link" to={`/squash/players/${h.opponent_id}`}>
                                                        {players.find((p) => p.id === h.opponent_id)?.name ?? "Unknown player"}
                                                    </Link>
                                                </th>
                                                <td>{h.matches_played}</td>
                                                <td
                                                    className={
                                                        h.matches_won > h.matches_lost
                                                            ? "squash-ahead"
                                                            : h.matches_won < h.matches_lost
                                                            ? "squash-behind"
                                                            : ""
                                                    }
                                                >
                                                    {record(h.matches_won, h.matches_lost, h.matches_drawn)}
                                                </td>
                                                <td>
                                                    {h.games_won}-{h.games_lost}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <h3 className="squash-section-title">Matches</h3>
                    {matches.length === 0 ? (
                        <div className="squash-card squash-empty">
                            <p>No matches yet.</p>
                        </div>
                    ) : (
                        <div className="squash-match-list">
                            {matches.map((match) => (
                                <MatchCard key={match.id} match={match} players={players} me={me} />
                            ))}
                        </div>
                    )}
                </>
            )}
        </SquashPage>
    )
}
