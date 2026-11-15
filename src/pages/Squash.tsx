import React, { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import {
    Match,
    MatchFilters,
    MATCHES_PAGE_SIZE,
    MatchStatus,
    Player,
    squashApi,
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
}

const STATUSES: MatchStatus[] = ["in_progress", "scheduled", "completed", "cancelled"]

// Live matches first, so a match in progress is the first thing on the page
// for anyone opening it to follow along; the rest stay most recent first.
export function liveFirst(matches: Match[]): Match[] {
    return [...matches.filter((m) => m.status === "in_progress"), ...matches.filter((m) => m.status !== "in_progress")]
}

export default function Squash() {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const mine = searchParams.get("mine") === "1"
    const status = (searchParams.get("status") as MatchStatus | null) ?? undefined
    const access = useSquashAccess()
    const me = access.status === "member" ? access.me : null
    const filters = (): MatchFilters => ({ status, player_id: mine && me ? me.id : undefined })

    const { state, refreshing, reload } = useSquashLoad<MatchesData>(async () => {
        const [players, firstPage] = await Promise.all([squashApi.players(true), squashApi.matches(filters(), 1)])
        return { players, firstPage }
    }, [mine, status])

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
            {({ players, firstPage }) => {
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
                        </div>

                        {matches.length === 0 ? (
                            <div className="squash-card squash-empty">
                                <p>No matches yet.</p>
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
                            <button className="squash-secondary-button squash-load-more" onClick={loadMore} disabled={loadingMore}>
                                {loadingMore ? "Loading..." : "Load more"}
                            </button>
                        )}

                        {showForm && (
                            <MatchForm
                                players={activePlayers}
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
