import React, { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import {
    Match,
    MatchFilters,
    MatchFormat,
    MATCHES_PAGE_SIZE,
    MatchStatus,
    Player,
    squashApi,
    Venue,
    useSquashAccess,
    useSquashLoad
} from "../components/squash/api"
import MatchCard from "../components/squash/MatchCard"
import MatchForm from "../components/squash/MatchForm"
import SquashPage from "../components/squash/SquashPage"
import { STATUS_LABELS } from "../components/squash/format"
import { dedupeById } from "../components/go_heavier/pagination"

interface MatchesData {
    // Everyone, inactive included, so older matches still get names.
    players: Player[]
    firstPage: Match[]
    // Every venue, so a match at one no longer used can still be found
    venues: Venue[]
}

const STATUSES: MatchStatus[] = ["in_progress", "scheduled", "completed", "cancelled"]
const FORMATS: { value: MatchFormat | ""; label: string }[] = [
    { value: "", label: "All" },
    { value: "singles", label: "Singles" },
    { value: "doubles", label: "Doubles" }
]

// Live matches first, so a match in progress is the first thing on the page
// for anyone opening it to follow along; the rest stay most recent first.
export function liveFirst(matches: Match[]): Match[] {
    return [...matches.filter((m) => m.status === "in_progress"), ...matches.filter((m) => m.status !== "in_progress")]
}

// A day picked in a date input ("2026-11-20"), as the start or end of that
// day where the browser is, for the API's played-at bounds.
export function dayBound(day: string, end: boolean): string | undefined {
    if (!day) {
        return undefined
    }
    const [year, month, date] = day.split("-").map(Number)
    return end
        ? new Date(year, month - 1, date, 23, 59, 59, 999).toISOString()
        : new Date(year, month - 1, date).toISOString()
}

export default function Squash() {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const mine = searchParams.get("mine") === "1"
    const status = (searchParams.get("status") as MatchStatus | null) ?? undefined
    const formatParam = searchParams.get("format")
    const format: MatchFormat | undefined =
        formatParam === "singles" || formatParam === "doubles" ? formatParam : undefined
    const access = useSquashAccess()
    const me = access.status === "member" ? access.me : null
    const venueId = searchParams.get("venue") ?? ""
    const from = searchParams.get("from") ?? ""
    const to = searchParams.get("to") ?? ""
    const filters = (): MatchFilters => ({
        status,
        format,
        player_id: mine && me ? me.id : undefined,
        venue_id: venueId || undefined,
        after: dayBound(from, false),
        before: dayBound(to, true)
    })

    const { state, refreshing, reload } = useSquashLoad<MatchesData>(async () => {
        const [players, firstPage, venues] = await Promise.all([
            squashApi.players(true),
            squashApi.matches(filters(), 1),
            squashApi.venues(true).catch(() => [])
        ])
        return { players, firstPage, venues }
    }, [mine, status, format, venueId, from, to])

    const [more, setMore] = useState<Match[]>([])
    const [nextPage, setNextPage] = useState(2)
    const [loadingMore, setLoadingMore] = useState(false)
    const [lastPageShort, setLastPageShort] = useState(false)
    const [moreError, setMoreError] = useState<string | null>(null)
    const [showForm, setShowForm] = useState(false)

    const firstPage = state.status === "ready" ? state.data.firstPage : null
    useEffect(() => {
        setMore([])
        setNextPage(2)
        setLastPageShort(false)
        setMoreError(null)
    }, [firstPage])

    const loadMore = async () => {
        setLoadingMore(true)
        setMoreError(null)
        try {
            const page = await squashApi.matches(filters(), nextPage)
            setMore((prev) => [...prev, ...page])
            setNextPage(nextPage + 1)
            setLastPageShort(page.length < MATCHES_PAGE_SIZE)
        } catch (error) {
            setMoreError((error as Error).message)
        } finally {
            setLoadingMore(false)
        }
    }

    const setParam = (key: string, value: string) => {
        const next = new URLSearchParams(searchParams)
        if (value) {
            next.set(key, value)
        } else {
            next.delete(key)
        }
        setSearchParams(next, { replace: true })
    }

    const activePlayers = useMemo(
        () => (state.status === "ready" ? state.data.players.filter((p) => p.is_active) : []),
        [state]
    )

    return (
        <SquashPage state={state} refreshing={refreshing} onRefresh={reload} what="Matches">
            {({ players, firstPage, venues }) => {
                const matches = liveFirst(dedupeById([...firstPage, ...more]))
                const done = firstPage.length < MATCHES_PAGE_SIZE || lastPageShort

                return (
                    <>
                        <div className="squash-header">
                            <h2 className="squash-title">Matches</h2>
                            <button className="squash-primary-button" onClick={() => setShowForm(true)}>
                                ➕ New match
                            </button>
                        </div>

                        <div className="squash-filters">
                            {me && (
                                <div className="squash-segmented" role="radiogroup" aria-label="Whose matches">
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={!mine}
                                        className={!mine ? "active" : ""}
                                        onClick={() => setParam("mine", "")}
                                    >
                                        Everyone
                                    </button>
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={mine}
                                        className={mine ? "active" : ""}
                                        onClick={() => setParam("mine", "1")}
                                    >
                                        Mine
                                    </button>
                                </div>
                            )}
                            <div className="squash-segmented" role="radiogroup" aria-label="Format">
                                {FORMATS.map(({ value, label }) => (
                                    <button
                                        key={label}
                                        type="button"
                                        role="radio"
                                        aria-checked={(format ?? "") === value}
                                        className={(format ?? "") === value ? "active" : ""}
                                        onClick={() => setParam("format", value)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <select
                                className="squash-input"
                                value={status ?? ""}
                                onChange={(e) => setParam("status", e.target.value)}
                                aria-label="Status"
                            >
                                <option value="">Any status</option>
                                {STATUSES.map((s) => (
                                    <option key={s} value={s}>
                                        {STATUS_LABELS[s]}
                                    </option>
                                ))}
                            </select>
                            {venues.length > 0 && (
                                <select
                                    className="squash-input"
                                    value={venueId}
                                    onChange={(e) => setParam("venue", e.target.value)}
                                    aria-label="Venue"
                                >
                                    <option value="">Any venue</option>
                                    {venues.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <label className="squash-date-filter">
                                <span>From</span>
                                <input
                                    className="squash-input"
                                    type="date"
                                    value={from}
                                    max={to || undefined}
                                    onChange={(e) => setParam("from", e.target.value)}
                                />
                            </label>
                            <label className="squash-date-filter">
                                <span>To</span>
                                <input
                                    className="squash-input"
                                    type="date"
                                    value={to}
                                    min={from || undefined}
                                    onChange={(e) => setParam("to", e.target.value)}
                                />
                            </label>
                            {(venueId || from || to || status) && (
                                <button
                                    type="button"
                                    className="squash-text-button"
                                    onClick={() => {
                                        const next = new URLSearchParams(searchParams)
                                        ;["venue", "from", "to", "status"].forEach((key) => next.delete(key))
                                        setSearchParams(next, { replace: true })
                                    }}
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>

                        {matches.length === 0 ? (
                            <div className="squash-card squash-empty">
                                <p>
                                    {venueId || from || to || status
                                        ? "No matches fit these filters."
                                        : format
                                        ? `No ${format} matches yet.`
                                        : "No matches yet."}
                                </p>
                                <button className="squash-primary-button" onClick={() => setShowForm(true)}>
                                    Arrange the first one
                                </button>
                            </div>
                        ) : (
                            <div className="squash-match-list">
                                {matches.map((match) => (
                                    <MatchCard key={match.id} match={match} players={players} me={me} />
                                ))}
                            </div>
                        )}

                        {moreError && <p className="error-message">{moreError}</p>}
                        {!done && matches.length > 0 && (
                            <button
                                className="squash-secondary-button squash-load-more"
                                onClick={loadMore}
                                disabled={loadingMore}
                            >
                                {loadingMore ? "Loading..." : "Load more"}
                            </button>
                        )}

                        {showForm && (
                            <MatchForm
                                players={activePlayers}
                                me={me}
                                defaultFormat={format}
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
