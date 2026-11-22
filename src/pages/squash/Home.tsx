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
import { Ladder } from "../../components/squash/EloLadder"
import MatchForm from "../../components/squash/MatchForm"
import PendingRequests from "../../components/squash/PendingRequests"
import ServePreference from "../../components/squash/ServePreference"
import Sparkline from "../../components/squash/Sparkline"
import SquashPage from "../../components/squash/SquashPage"
import { signed, winRate } from "../../components/squash/format"
import { changedSince, latestChange, soonestFirst } from "../../components/squash/home"
import { formFor } from "../../components/squash/stats"
import { ratingPoints } from "../../components/squash/ratingScale"

interface HomeData {
    players: Player[]
    ratings: Record<Ladder, Rating[]>
    // The caller's overall rating after each match, oldest first
    trend: number[]
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

// "▲ +12" for a rise, "▼ −8" for a fall, from the last game rated
function Change({ rating }: { rating: Rating }) {
    if (rating.matches_rated === 0) {
        return null
    }
    const change = rating.last_change
    const tone = change > 0 ? "up" : change < 0 ? "down" : "level"
    return (
        <span className={`squash-elo-change ${tone}`} title="Last game">
            <span aria-hidden="true">{change > 0 ? "▲" : change < 0 ? "▼" : "•"}</span> {signed(change)}
        </span>
    )
}

// The caller's Elo: overall, where every match counts, as the headline with
// its recent path, and singles and doubles beside it.
function Ratings({ ratings, trend, me }: { ratings: HomeData["ratings"]; trend: number[]; me: Player }) {
    const mine = (ladder: Ladder) => ratings[ladder].find((r) => r.player_id === me.id)
    const overall = mine("overall")
    if (!overall) {
        return <p className="squash-muted">Not on the ladder yet. Finish a match to get a rating.</p>
    }
    const recent = trend.slice(-20)

    return (
        <>
            <div className="squash-elo">
                <Link className="squash-elo-hero" to={`/squash/players/${me.id}`}>
                    <span className="squash-elo-eyebrow">Overall Elo</span>
                    <span className="squash-elo-main">
                        <span className="squash-elo-value">{overall.rating}</span>
                        <Sparkline
                            points={recent}
                            label={`Your overall rating over your last ${recent.length - 1} matches`}
                        />
                    </span>
                    <span className="squash-elo-meta">
                        <span className="squash-elo-rank">
                            #{overall.rank} of {ratings.overall.length}
                        </span>
                        <Change rating={overall} />
                        {overall.provisional && (
                            <span className="squash-elo-tag" title="Too few matches to mean much yet">
                                provisional
                            </span>
                        )}
                    </span>
                </Link>
                <div className="squash-elo-formats">
                    {(["singles", "doubles"] as MatchFormat[]).map((format) => {
                        const rating = mine(format)
                        return (
                            <Link key={format} className="squash-elo-format" to={`/squash/stats?format=${format}`}>
                                <span className="squash-elo-eyebrow">
                                    {format === "singles" ? "Singles" : "Doubles"}
                                </span>
                                {rating ? (
                                    <>
                                        <span className="squash-elo-format-value">{rating.rating}</span>
                                        <span className="squash-elo-meta">
                                            <span className="squash-elo-rank">
                                                #{rating.rank} of {ratings[format].length}
                                            </span>
                                            <Change rating={rating} />
                                        </span>
                                    </>
                                ) : (
                                    <span className="squash-muted">Not played yet</span>
                                )}
                            </Link>
                        )
                    })}
                </div>
            </div>
            <Link className="squash-elo-explain" to="/squash/elo">
                <span className="squash-elo-explain-icon" aria-hidden="true">
                    🧮
                </span>
                <span className="squash-elo-explain-text">
                    <strong>How is your Elo worked out?</strong>
                    <span>The maths, worked examples, and a calculator to try your next match.</span>
                </span>
                <span className="squash-elo-explain-arrow" aria-hidden="true">
                    →
                </span>
            </Link>
        </>
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
        const [players, overall, singles, doubles, history, live, upcoming, mine, stats] = await Promise.all([
            squashApi.players(true),
            squashApi.ratings(),
            squashApi.ratings("singles"),
            squashApi.ratings("doubles"),
            // Only for the trend line, so it's fine without one
            meId ? squashApi.ratingHistory(meId).catch(() => []) : Promise.resolve([]),
            squashApi.matches({ status: "in_progress" }, 1),
            squashApi.matches({ status: "scheduled" }, 1),
            meId ? squashApi.matches({ player_id: meId }, 1) : Promise.resolve([]),
            meId ? squashApi.playerStats(meId) : Promise.resolve(null)
        ])
        return {
            players,
            ratings: { overall, singles, doubles },
            trend: ratingPoints(history),
            live,
            upcoming,
            mine,
            stats
        }
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
            {({ players, ratings, trend, live, upcoming, mine, stats }, me) => {
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

                        <PendingRequests />

                        {me && (
                            <div className="squash-card">
                                <Ratings ratings={ratings} trend={trend} me={me} />
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

                        {me && (
                            <ServePreference
                                key={me.id}
                                // The list is loaded with the page, so it's the freshest copy
                                player={players.find((p) => p.id === me.id) ?? me}
                                mine
                            />
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
