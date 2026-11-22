import React from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"

import {
    HeadToHead,
    Match,
    MatchFormat,
    Player,
    PlayerInsights,
    PlayerRecord,
    PlayerStats,
    RatingChange,
    squashApi,
    useSquashLoad
} from "../../components/squash/api"
import { PlayerInsightsCard } from "../../components/squash/Insights"
import MatchCard from "../../components/squash/MatchCard"
import RatingChart from "../../components/squash/RatingChart"
import DisplayName from "../../components/squash/DisplayName"
import ServePreference from "../../components/squash/ServePreference"
import SquashPage from "../../components/squash/SquashPage"
import { winRate } from "../../components/squash/format"
import MatchRecord from "../../components/squash/MatchRecord"

interface PlayerData {
    player: Player
    players: Player[]
    stats: PlayerStats
    // Everyone they've played against, from their latest matches
    opponents: string[]
    matches: Match[]
}

interface RatingData {
    history: RatingChange[]
    insights: PlayerInsights
}

const FORMATS: { value: MatchFormat | ""; label: string }[] = [
    { value: "", label: "All" },
    { value: "singles", label: "Singles" },
    { value: "doubles", label: "Doubles" }
]

// The format picked on the page, in its address so it's kept on reload:
// singles or doubles alone, or undefined for both.
function useFormat(): [MatchFormat | undefined, (format: MatchFormat | "") => void] {
    const [searchParams, setSearchParams] = useSearchParams()
    const param = searchParams.get("format")
    const format: MatchFormat | undefined = param === "singles" || param === "doubles" ? param : undefined
    return [format, (value) => setSearchParams(value ? { format: value } : {}, { replace: true })]
}

// The rating chart and point-by-point figures, for all matches or one
// format, loaded apart from the rest so switching format is quick.
function RatingAndInsights({ id }: { id: string }) {
    const [format, setFormat] = useFormat()
    const { state, refreshing } = useSquashLoad<RatingData>(async () => {
        const [history, insights] = await Promise.all([
            squashApi.ratingHistory(id, format),
            squashApi.playerInsights(id, format)
        ])
        return { history, insights }
    }, [id, format])

    return (
        <div className={`squash-card ${refreshing ? "squash-refreshing" : ""}`}>
            <div className="squash-header">
                <h4 className="squash-card-title squash-card-title-inline">Rating and point by point</h4>
                <div className="squash-segmented" role="radiogroup" aria-label="Format">
                    {FORMATS.map(({ value, label }) => (
                        <button
                            key={label}
                            type="button"
                            role="radio"
                            aria-checked={(format ?? "") === value}
                            className={(format ?? "") === value ? "active" : ""}
                            onClick={() => setFormat(value)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            {state.status === "loading" && <p className="squash-muted">Loading...</p>}
            {state.status === "error" && <p className="error-message">{state.message}</p>}
            {state.status === "ready" && (
                <>
                    {state.data.history.length > 0 ? (
                        <RatingChart history={state.data.history} />
                    ) : (
                        <p className="squash-muted">No completed {format ?? ""} matches to rate yet.</p>
                    )}
                    <PlayerInsightsCard insights={state.data.insights} />
                </>
            )}
        </div>
    )
}

// Their record against each opponent, in the format picked above, loaded
// apart from the rest like the rating so switching format is quick.
function HeadToHeadCard({ id, opponents, players }: { id: string; opponents: string[]; players: Player[] }) {
    const [format] = useFormat()
    const { state, refreshing } = useSquashLoad<HeadToHead[]>(async () => {
        const all = await Promise.all(opponents.map((o) => squashApi.headToHead(id, o, format)))
        // Only those they've played in this format
        return all.filter((h) => h.matches_played > 0)
    }, [id, format, opponents.join()])
    if (state.status !== "ready" || (state.data.length === 0 && !format)) {
        return null
    }
    const headToHeads = state.data

    return (
        <div className={`squash-card ${refreshing ? "squash-refreshing" : ""}`}>
            <h4 className="squash-card-title">Head to head</h4>
            <p className="squash-muted">
                Completed {format ?? "singles and doubles"} matches on opposite sides
                {format ? ", as picked above" : ""}.
            </p>
            {headToHeads.length === 0 ? (
                <p className="squash-muted">No completed {format} matches against anyone yet.</p>
            ) : (
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
                                    <td>
                                        <MatchRecord
                                            won={h.matches_won}
                                            lost={h.matches_lost}
                                            drawn={h.matches_drawn}
                                        />
                                    </td>
                                    <td>
                                        {h.games_won}-{h.games_lost}
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}

function Tile({ value, label }: { value: React.ReactNode; label: string }) {
    return (
        <div className="stat-tile">
            <div className="stat-tile-value">{value}</div>
            <div className="stat-tile-label">{label}</div>
        </div>
    )
}

// Singles and doubles side by side, as a doubles result says less about a
// player than a singles one. Left out until they've played both.
function RecordByFormat({ stats }: { stats: PlayerStats }) {
    const rows: { label: string; r: PlayerRecord }[] = [
        { label: "Singles", r: stats.singles },
        { label: "Doubles", r: stats.doubles }
    ]
    if (rows.some(({ r }) => r.matches_played === 0)) {
        return null
    }
    return (
        <div className="squash-card">
            <h4 className="squash-card-title">Singles and doubles</h4>
            <table className="squash-table">
                <thead>
                    <tr>
                        <th></th>
                        <th scope="col">Matches</th>
                        <th scope="col">Won-lost</th>
                        <th scope="col">Win rate</th>
                        <th scope="col" className="squash-hide-narrow">
                            Games
                        </th>
                        <th scope="col" className="squash-hide-narrow">
                            Points
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(({ label, r }) => (
                        <tr key={label}>
                            <th scope="row">{label}</th>
                            <td>{r.matches_played}</td>
                            <td>
                                <MatchRecord won={r.matches_won} lost={r.matches_lost} drawn={r.matches_drawn} />
                            </td>
                            <td>{winRate(r.win_rate)}</td>
                            <td className="squash-hide-narrow">
                                {r.games_won}-{r.games_lost}
                            </td>
                            <td className="squash-hide-narrow">
                                {r.points_won}-{r.points_lost}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
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
        return { player, players, stats, matches, opponents: Array.from(opponents) }
    }, [id])

    return (
        <SquashPage state={state} refreshing={refreshing} onRefresh={reload} what="Player">
            {({ player, players, stats, opponents, matches }, me) => (
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
                    {player.id === me?.id && <DisplayName key={player.id} player={player} onSaved={reload} />}
                    <ServePreference key={player.id} player={player} mine={player.id === me?.id} />

                    <div className="stats-grid">
                        <Tile value={String(stats.matches_played)} label="Matches" />
                        <Tile
                            value={
                                <MatchRecord
                                    won={stats.matches_won}
                                    lost={stats.matches_lost}
                                    drawn={stats.matches_drawn}
                                />
                            }
                            label="Record"
                        />
                        <Tile value={winRate(stats.win_rate)} label="Win rate" />
                        <Tile value={`${stats.games_won}-${stats.games_lost}`} label="Games" />
                        <Tile value={`${stats.points_won}-${stats.points_lost}`} label="Points" />
                    </div>

                    <RecordByFormat stats={stats} />

                    <RatingAndInsights id={player.id} />

                    <HeadToHeadCard id={player.id} opponents={opponents} players={players} />

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
