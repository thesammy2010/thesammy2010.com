import React, { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import {
    Match,
    MatchFormat,
    Player,
    PlayerStats,
    Rating,
    squashApi,
    useSquashAccess,
    useSquashLoad
} from "../../components/squash/api"
import MatchCalendar from "../../components/squash/MatchCalendar"
import MatchCard from "../../components/squash/MatchCard"
import MatchForm from "../../components/squash/MatchForm"
import SquashPage from "../../components/squash/SquashPage"
import { signed, winRate } from "../../components/squash/format"
import { changedSince, latestChange, soonestFirst } from "../../components/squash/home"
import { formFor } from "../../components/squash/stats"

interface HomeData {
    players: Player[]
    ratings: Record<MatchFormat, Rating[]>
    live: Match[]
    upcoming: Match[]
    // The caller's own, most recent first; empty for an admin who doesn't play
    mine: Match[]
    stats: PlayerStats | null
}

const DAY_MS = 24 * 60 * 60 * 1000
// How many of the arranged and changed matches to show before "see all"
const SHOWN = 4

function seenKey(playerId: string): string {
    return `squash-last-seen:${playerId}`
}

function readSeen(playerId: string): string | null {
    try {
        return localStorage.getItem(seenKey(playerId))
    } catch {
        return null
    }
}

function Tile({ value, label }: { value: string; label: string }) {
    return (
        <div className="stat-tile">
            <div className="stat-tile-value">{value}</div>
            <div className="stat-tile-label">{label}</div>
        </div>
    )
}

// The caller's place on each ladder they're on.
function Ratings({ ratings, me }: { ratings: HomeData["ratings"]; me: Player }) {
    const rows = (["singles", "doubles"] as MatchFormat[]).flatMap((format) => {
        const rating = ratings[format].find((r) => r.player_id === me.id)
        return rating ? [{ format, rating, of: ratings[format].length }] : []
    })
    if (rows.length === 0) {
        return <p className="squash-muted">Not on the ladder yet. Finish a match to get a rating.</p>
    }
    return (
        <div className="squash-home-ratings">
            {rows.map(({ format, rating, of }) => (
                <Link key={format} className="squash-home-rating" to={`/squash/stats?format=${format}`}>
                    <span className="squash-home-rating-value">{rating.rating}</span>
                    <span className="squash-home-rating-label">
                        {format === "singles" ? "Singles" : "Doubles"} Elo · #{rating.rank} of {of}
                    </span>
                    <span className="squash-muted">
                        {rating.matches_rated > 0 && `${signed(rating.last_change)} last match`}
                        {rating.provisional && " · provisional"}
                    </span>
                </Link>
            ))}
        </div>
    )
}

// Where a player starts: their rating and a few figures, what's on now and
// to come, what's changed since they last looked, their last match, and a
// calendar of their matches.
export default function SquashHome() {
    const navigate = useNavigate()
    const access = useSquashAccess()
    const meId = access.status === "member" && access.me ? access.me.id : null
    const [showForm, setShowForm] = useState(false)
    // Read once, before this visit moves it on
    const [seen, setSeen] = useState<{ id: string; at: string | null } | null>(null)
    if (meId && seen?.id !== meId) {
        setSeen({ id: meId, at: readSeen(meId) })
    }

    const { state, refreshing, reload } = useSquashLoad<HomeData>(async () => {
        const [players, singles, doubles, live, upcoming, mine, stats] = await Promise.all([
            squashApi.players(true),
            squashApi.ratings("singles"),
            squashApi.ratings("doubles"),
            squashApi.matches({ status: "in_progress" }, 1),
            squashApi.matches({ status: "scheduled" }, 1),
            meId ? squashApi.matches({ player_id: meId }, 1) : Promise.resolve([]),
            meId ? squashApi.playerStats(meId) : Promise.resolve(null)
        ])
        return { players, ratings: { singles, doubles }, live, upcoming, mine, stats }
    }, [meId])

    // Remember this look, so next time only what's changed since shows
    const mine = state.status === "ready" ? state.data.mine : null
    useEffect(() => {
        const latest = mine && latestChange(mine)
        if (meId && latest) {
            try {
                localStorage.setItem(seenKey(meId), latest)
            } catch {
                // Private windows and blocked storage just show nothing new
            }
        }
    }, [mine, meId])

    return (
        <SquashPage state={state} refreshing={refreshing} onRefresh={reload} what="Squash">
            {({ players, ratings, live, upcoming, mine, stats }, me) => {
                const form = me
                    ? formFor(
                          mine.filter((m) => m.status === "completed"),
                          me.id
                      )
                    : null
                const lastMonth = mine.filter(
                    (m) =>
                        m.status === "completed" &&
                        m.played_at !== null &&
                        Date.now() - new Date(m.played_at).getTime() < 30 * DAY_MS
                ).length
                const lastMatch = mine.find((m) => m.status === "completed")
                const changed = changedSince(mine, seen?.at ?? null)
                const toCome = soonestFirst(upcoming)

                return (
                    <>
                        <div className="squash-header">
                            <h2 className="squash-title">{me ? `Hi, ${me.name}` : "Squash"}</h2>
                            <button className="squash-primary-button" onClick={() => setShowForm(true)}>
                                ➕ New match
                            </button>
                        </div>

                        {me && (
                            <div className="squash-card">
                                <Ratings ratings={ratings} me={me} />
                                {stats && (
                                    <div className="stats-grid squash-home-tiles">
                                        <Tile value={String(stats.matches_played)} label="Played" />
                                        <Tile value={winRate(stats.win_rate)} label="Win rate" />
                                        <Tile
                                            value={form?.current ? `${form.current.result}${form.current.length}` : "—"}
                                            label="Current run"
                                        />
                                        <Tile value={String(lastMonth)} label="Last 30 days" />
                                    </div>
                                )}
                            </div>
                        )}

                        {live.length > 0 && (
                            <section className="squash-home-section">
                                <h3 className="squash-section-title">On now</h3>
                                <div className="squash-match-list">
                                    {live.map((m) => (
                                        <MatchCard key={m.id} match={m} players={players} me={me} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {changed.length > 0 && (
                            <section className="squash-home-section">
                                <h3 className="squash-section-title">New since you last looked</h3>
                                <p className="squash-muted">
                                    Your matches added, finished, changed or cancelled since your last visit.
                                </p>
                                <div className="squash-match-list">
                                    {changed.slice(0, SHOWN).map((m) => (
                                        <MatchCard key={m.id} match={m} players={players} me={me} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {toCome.length > 0 && (
                            <section className="squash-home-section">
                                <h3 className="squash-section-title">Coming up</h3>
                                <div className="squash-match-list">
                                    {toCome.slice(0, SHOWN).map((m) => (
                                        <MatchCard key={m.id} match={m} players={players} me={me} />
                                    ))}
                                </div>
                                {toCome.length > SHOWN && (
                                    <Link className="squash-link" to="/squash/matches?status=scheduled">
                                        All {toCome.length} arranged matches →
                                    </Link>
                                )}
                            </section>
                        )}

                        {lastMatch && (
                            <section className="squash-home-section">
                                <h3 className="squash-section-title">Your last match</h3>
                                <MatchCard match={lastMatch} players={players} me={me} />
                            </section>
                        )}

                        <MatchCalendar me={me} players={players} />

                        <p className="squash-home-links">
                            <Link className="squash-link" to="/squash/matches">
                                All matches →
                            </Link>
                            <Link className="squash-link" to="/squash/how">
                                How it works →
                            </Link>
                        </p>

                        {showForm && (
                            <MatchForm
                                players={players.filter((p) => p.is_active)}
                                me={me}
                                onClose={() => setShowForm(false)}
                                onSaved={(match) => {
                                    setShowForm(false)
                                    navigate(`/squash/matches/${match.id}`)
                                }}
                            />
                        )}
                    </>
                )
            }}
        </SquashPage>
    )
}
