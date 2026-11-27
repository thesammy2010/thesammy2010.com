import React, { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"

import {
    Match,
    MatchFilters,
    MatchFormat,
    MATCHES_PAGE_SIZE,
    Player,
    squashApi,
    useSquashAccess,
    useSquashLoad
} from "../../components/squash/api"
import DateRangeFilter, { useDateRangeParams } from "../../components/squash/DateRangeFilter"
import SquashPage from "../../components/squash/SquashPage"
import { formatDuration, formatWhen, SIDES, sideNames } from "../../components/squash/format"
import { dayBound } from "../../components/squash/dateRange"
import { GAME_LENGTHS, GameEntry, gamesOf, GameSort } from "../../components/squash/games"
import { dedupeById } from "../../components/go_heavier/pagination"
import { sideColourStyle } from "../../components/squash/colours"

interface GamesData {
    // Everyone, inactive included, so older games still get names
    players: Player[]
    firstPage: Match[]
}

const FORMATS: { value: MatchFormat | ""; label: string }[] = [
    { value: "", label: "All" },
    { value: "singles", label: "Singles" },
    { value: "doubles", label: "Doubles" }
]

// One game: when, which game of its match, and each side's points with the
// winner's boxed in their colour, linking to the game's own page.
function GameCard({ entry, players, me }: { entry: GameEntry; players: Player[]; me: Player | null }) {
    const { match, game, deuce } = entry
    return (
        <Link
            to={`/squash/matches/${match.id}/games/${game.number}`}
            className="squash-card squash-match-card"
            style={sideColourStyle(match)}
        >
            <div className="squash-card-head">
                <span className="squash-when">
                    {formatWhen(match.played_at)}
                    <span className="squash-muted">
                        {" "}
                        · Game {game.number} of {match.games.length}
                        {match.venue && ` · ${match.venue}`}
                    </span>
                </span>
                <span className="squash-game-tags">
                    {game.winning_side === null && (
                        <span className="squash-status squash-status-in_progress">In play</span>
                    )}
                    {deuce && <span className="squash-game-tag">Deuce</span>}
                    {game.rallies > 0 && <span className="squash-game-tag">Point by point</span>}
                    {game.duration_seconds != null && (
                        <span className="squash-game-tag" title="From the first rally to the winning point">
                            ⏱ {formatDuration(game.duration_seconds)}
                        </span>
                    )}
                </span>
            </div>
            <div className="squash-scoreline">
                {SIDES.map((side) => {
                    const won = game.winning_side === side
                    const lost = game.winning_side !== null && !won
                    const isMine = match.players.some((p) => p.side === side && p.player_id === me?.id)
                    return (
                        <div
                            key={side}
                            className={`squash-scoreline-row squash-row-side-${side} ${won ? "winner" : ""} ${
                                lost ? "loser" : ""
                            }`}
                        >
                            <span className={`squash-side-dot squash-side-${side}`} aria-hidden="true" />
                            <span className="squash-scoreline-names">
                                {sideNames(match, side, players)}
                                {isMine && <span className="squash-you">you</span>}
                            </span>
                            {won && <span className="squash-won-badge">Won</span>}
                            <span className="squash-scoreline-games">
                                <span className={won ? "won" : game.winning_side === null ? "open" : ""}>
                                    {side === 1 ? game.side1_points : game.side2_points}
                                </span>
                            </span>
                        </div>
                    )
                })}
            </div>
        </Link>
    )
}

// Every game across the group's matches, newest first, filtered like the
// matches list, and to deuce games or those scored point by point. Matches
// are loaded a page at a time, with each page's games added below.
export default function Games() {
    const [searchParams, setSearchParams] = useSearchParams()
    const mine = searchParams.get("mine") === "1"
    const formatParam = searchParams.get("format")
    const format: MatchFormat | undefined =
        formatParam === "singles" || formatParam === "doubles" ? formatParam : undefined
    const deuceOnly = searchParams.get("deuce") === "1"
    const liveOnly = searchParams.get("live") === "1"
    const lengthParam = searchParams.get("length")
    const length = GAME_LENGTHS.find((b) => b.value === lengthParam)?.value
    const sortParam = searchParams.get("sort")
    const sort: GameSort = sortParam === "longest" || sortParam === "shortest" ? sortParam : "newest"
    const access = useSquashAccess()
    const me = access.status === "member" ? access.me : null
    const [{ from, to }, setRange] = useDateRangeParams()
    const filters = (): MatchFilters => ({
        format,
        player_id: mine && me ? me.id : undefined,
        after: dayBound(from, false),
        before: dayBound(to, true)
    })

    const { state, refreshing, reload } = useSquashLoad<GamesData>(async () => {
        const [players, firstPage] = await Promise.all([squashApi.players(true), squashApi.matches(filters(), 1)])
        return { players, firstPage }
    }, [mine, format, from, to])

    const [more, setMore] = useState<Match[]>([])
    const [nextPage, setNextPage] = useState(2)
    const [loadingMore, setLoadingMore] = useState(false)
    const [lastPageShort, setLastPageShort] = useState(false)
    const [moreError, setMoreError] = useState<string | null>(null)

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

    return (
        <SquashPage state={state} refreshing={refreshing} onRefresh={reload} what="Games">
            {({ players, firstPage }) => {
                const games = gamesOf(dedupeById([...firstPage, ...more]), { deuceOnly, liveOnly, length, sort })
                const done = firstPage.length < MATCHES_PAGE_SIZE || lastPageShort

                return (
                    <>
                        <div className="squash-header">
                            <h2 className="squash-title">Games</h2>
                        </div>

                        <div className="squash-filters">
                            {me && (
                                <div className="squash-segmented" role="radiogroup" aria-label="Whose games">
                                    {[
                                        { value: "", label: "Everyone" },
                                        { value: "1", label: "Mine" }
                                    ].map(({ value, label }) => (
                                        <button
                                            key={label}
                                            type="button"
                                            role="radio"
                                            aria-checked={mine === (value === "1")}
                                            className={mine === (value === "1") ? "active" : ""}
                                            onClick={() => setParam("mine", value)}
                                        >
                                            {label}
                                        </button>
                                    ))}
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
                            <DateRangeFilter range={{ from, to }} onChange={setRange} />
                            <label className="squash-checkbox">
                                <input
                                    type="checkbox"
                                    checked={deuceOnly}
                                    onChange={(e) => setParam("deuce", e.target.checked ? "1" : "")}
                                />
                                <span>Deuce games only</span>
                            </label>
                            <label className="squash-checkbox">
                                <input
                                    type="checkbox"
                                    checked={liveOnly}
                                    onChange={(e) => setParam("live", e.target.checked ? "1" : "")}
                                />
                                <span>Scored point by point</span>
                            </label>
                            <div className="squash-segmented" role="radiogroup" aria-label="How long it took">
                                {[{ value: "", label: "Any length" }, ...GAME_LENGTHS].map(({ value, label }) => (
                                    <button
                                        key={label}
                                        type="button"
                                        role="radio"
                                        aria-checked={(length ?? "") === value}
                                        className={(length ?? "") === value ? "active" : ""}
                                        onClick={() => setParam("length", value)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <label className="squash-sort">
                                <span>Sort</span>
                                <select
                                    className="squash-input"
                                    value={sort}
                                    onChange={(e) =>
                                        setParam("sort", e.target.value === "newest" ? "" : e.target.value)
                                    }
                                >
                                    <option value="newest">Newest first</option>
                                    <option value="longest">Longest first</option>
                                    <option value="shortest">Shortest first</option>
                                </select>
                            </label>
                        </div>

                        {games.length === 0 ? (
                            <div className="squash-card squash-empty">
                                <p>
                                    {deuceOnly || liveOnly || length || from || to
                                        ? done
                                            ? "No games fit these filters."
                                            : "No games fit these filters in the latest matches. Load more to look further back."
                                        : "No games played yet."}
                                </p>
                            </div>
                        ) : (
                            <div className="squash-match-list">
                                {games.map((entry) => (
                                    <GameCard
                                        key={`${entry.match.id}-${entry.game.number}`}
                                        entry={entry}
                                        players={players}
                                        me={me}
                                    />
                                ))}
                            </div>
                        )}

                        {moreError && <p className="error-message">{moreError}</p>}
                        {!done && (
                            <button
                                className="squash-secondary-button squash-load-more"
                                onClick={loadMore}
                                disabled={loadingMore}
                            >
                                {loadingMore ? "Loading..." : "Load more"}
                            </button>
                        )}
                    </>
                )
            }}
        </SquashPage>
    )
}
