import React from "react"
import { Link, useSearchParams } from "react-router-dom"

import { formatCount } from "../../components/go_heavier/format"
import {
    Match,
    MatchFormat,
    MATCHES_PAGE_SIZE,
    Player,
    Rating,
    Side,
    squashApi,
    useSquashLoad,
    counts
} from "../../components/squash/api"
import EloLadder from "../../components/squash/EloLadder"
import SquashPage from "../../components/squash/SquashPage"
import { formatDuration, formatWhen, sideNames } from "../../components/squash/format"
import MatchRecord from "../../components/squash/MatchRecord"
import {
    busierFormat,
    formFor,
    partnerships,
    pointMargin,
    records,
    Result,
    rivalries,
    totals
} from "../../components/squash/stats"

interface StatsData {
    players: Player[]
    // Completed, most recent first
    matches: Match[]
    // Each format's own ladder
    ratings: Record<MatchFormat, Rating[]>
}

const FORM_LENGTH = 5
const PAIRS_SHOWN = 5
const FORMATS: MatchFormat[] = ["singles", "doubles"]

// Every completed match: the figures span the group's whole history, less
// the private matches the caller isn't in, whose results they can't see.
async function allCompleted(): Promise<Match[]> {
    const matches: Match[] = []
    for (let page = 1; ; page++) {
        const next = await squashApi.matches({ status: "completed" }, page)
        matches.push(...next)
        if (next.length < MATCHES_PAGE_SIZE) {
            // Only results that count, as the API's own figures have them
            return matches.filter((m) => !m.hidden && counts(m))
        }
    }
}

const RESULT_LABELS: Record<Result, string> = { W: "Won", L: "Lost", D: "Drawn" }

// "11-9, 9-11, 12-10" from one side's point of view.
function scoresFor(match: Match, side: Side): string {
    return match.games
        .map((g) => (side === 1 ? `${g.side1_points}-${g.side2_points}` : `${g.side2_points}-${g.side1_points}`))
        .join(", ")
}

function Tile({ value, label }: { value: string; label: string }) {
    return (
        <div className="stat-tile">
            <div className="stat-tile-value">{value}</div>
            <div className="stat-tile-label">{label}</div>
        </div>
    )
}

function RecordRow({
    label,
    match,
    players,
    detail
}: {
    label: string
    match: Match
    players: Player[]
    detail: string
}) {
    const winner: Side = match.winning_side ?? 1
    const loser: Side = winner === 1 ? 2 : 1
    return (
        <tr>
            <th scope="row">{label}</th>
            <td className="squash-stats-record">
                <Link className="squash-link" to={`/squash/matches/${match.id}`}>
                    {sideNames(match, winner, players)} beat {sideNames(match, loser, players)}
                </Link>
                <span className="squash-muted">
                    {detail} · {formatWhen(match.played_at)}
                </span>
            </td>
        </tr>
    )
}

export default function Stats() {
    const [searchParams, setSearchParams] = useSearchParams()
    const chosen = searchParams.get("format")

    const { state, refreshing, reload } = useSquashLoad<StatsData>(async () => {
        const [players, matches, singles, doubles] = await Promise.all([
            squashApi.players(true),
            allCompleted(),
            squashApi.ratings("singles"),
            squashApi.ratings("doubles")
        ])
        return { players, matches, ratings: { singles, doubles } }
    }, [])

    return (
        <SquashPage state={state} refreshing={refreshing} onRefresh={reload} what="Stats">
            {({ players, matches: all, ratings }, me) => {
                if (all.length === 0) {
                    return (
                        <>
                            <h2 className="squash-title">Stats</h2>
                            <div className="squash-card squash-empty">
                                <p>No completed matches yet. Stats appear once the first one is finished.</p>
                                <Link className="squash-link" to="/squash/matches">
                                    Go to matches
                                </Link>
                            </div>
                        </>
                    )
                }

                // Singles and doubles are kept apart: a doubles result says less
                // about a player than a singles one, so mixing them muddies form.
                const format: MatchFormat = chosen === "singles" || chosen === "doubles" ? chosen : busierFormat(all)
                const matches = all.filter((m) => m.format === format)
                const header = (
                    <div className="squash-header">
                        <h2 className="squash-title">Stats</h2>
                        <div className="squash-segmented" role="radiogroup" aria-label="Format">
                            {FORMATS.map((f) => (
                                <button
                                    key={f}
                                    type="button"
                                    role="radio"
                                    aria-checked={f === format}
                                    className={f === format ? "active" : ""}
                                    onClick={() => setSearchParams({ format: f }, { replace: true })}
                                >
                                    {f === "singles" ? "Singles" : "Doubles"}
                                </button>
                            ))}
                        </div>
                    </div>
                )
                if (matches.length === 0) {
                    return (
                        <>
                            {header}
                            <div className="squash-card squash-empty">
                                <p>No completed {format} matches yet.</p>
                            </div>
                        </>
                    )
                }

                const sum = totals(matches)
                const { longestGame, closestMatch, biggestWin } = records(matches)
                const name = (id: string) => players.find((p) => p.id === id)?.name ?? "Unknown player"
                // Anyone who's finished a match, the most played first.
                const forms = players
                    .map((player) => ({ player, form: formFor(matches, player.id) }))
                    .filter(({ form }) => form.results.length > 0)
                    .sort(
                        (a, b) =>
                            b.form.results.length - a.form.results.length || a.player.name.localeCompare(b.player.name)
                    )
                const topRivalries = rivalries(matches).slice(0, PAIRS_SHOWN)
                const topPartnerships = partnerships(matches).slice(0, PAIRS_SHOWN)

                return (
                    <>
                        {header}

                        <div className="stats-grid">
                            <Tile value={formatCount(sum.matches)} label="Matches" />
                            <Tile value={formatCount(sum.games)} label="Games" />
                            <Tile value={formatCount(sum.points)} label="Points" />
                            <Tile value={formatCount(sum.scoredLive)} label="Scored live" />
                            {sum.averageGameSeconds !== null && (
                                <Tile value={formatDuration(sum.averageGameSeconds)} label="Average game" />
                            )}
                            {sum.longestGameSeconds !== null && (
                                <Tile value={formatDuration(sum.longestGameSeconds)} label="Longest game" />
                            )}
                        </div>

                        <EloLadder ratings={ratings[format]} format={format} players={players} me={me} />

                        <div className="squash-card">
                            <h4 className="squash-card-title">Form</h4>
                            <p className="squash-muted">The last {FORM_LENGTH} results, most recent first.</p>
                            <table className="squash-table">
                                <thead>
                                    <tr>
                                        <th>Player</th>
                                        <th>Last {FORM_LENGTH}</th>
                                        <th>Run</th>
                                        <th className="squash-hide-narrow">Best streak</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {forms.map(({ player, form }) => (
                                        <tr key={player.id} className={player.is_active ? "" : "squash-inactive"}>
                                            <th scope="row">
                                                <Link className="squash-link" to={`/squash/players/${player.id}`}>
                                                    {player.name}
                                                </Link>
                                                {player.id === me?.id && <span className="squash-you">you</span>}
                                            </th>
                                            <td>
                                                <span className="squash-results">
                                                    {form.results.slice(0, FORM_LENGTH).map(({ result, matchId }) => (
                                                        <Link
                                                            key={matchId}
                                                            to={`/squash/matches/${matchId}`}
                                                            className={`squash-result squash-result-${result}`}
                                                            title={RESULT_LABELS[result]}
                                                            aria-label={RESULT_LABELS[result]}
                                                        >
                                                            {result}
                                                        </Link>
                                                    ))}
                                                </span>
                                            </td>
                                            <td
                                                className={
                                                    form.current?.result === "W"
                                                        ? "squash-ahead"
                                                        : form.current?.result === "L"
                                                        ? "squash-behind"
                                                        : ""
                                                }
                                            >
                                                {form.current && `${form.current.result}${form.current.length}`}
                                            </td>
                                            <td className="squash-hide-narrow">{form.longestWinStreak}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {(longestGame || closestMatch || biggestWin) && (
                            <div className="squash-card">
                                <h4 className="squash-card-title">Records</h4>
                                <table className="squash-table squash-stats-records">
                                    <tbody>
                                        {longestGame && (
                                            <tr>
                                                <th scope="row">Longest game</th>
                                                <td className="squash-stats-record">
                                                    <Link
                                                        className="squash-link"
                                                        to={`/squash/matches/${longestGame.match.id}`}
                                                    >
                                                        {sideNames(longestGame.match, 1, players)} v{" "}
                                                        {sideNames(longestGame.match, 2, players)}
                                                    </Link>
                                                    <span className="squash-muted">
                                                        {longestGame.game.side1_points}-{longestGame.game.side2_points}{" "}
                                                        in game {longestGame.game.number} ·{" "}
                                                        {formatWhen(longestGame.match.played_at)}
                                                    </span>
                                                </td>
                                            </tr>
                                        )}
                                        {closestMatch && (
                                            <RecordRow
                                                label="Closest match"
                                                match={closestMatch}
                                                players={players}
                                                detail={`${scoresFor(
                                                    closestMatch,
                                                    closestMatch.winning_side ?? 1
                                                )}, by ${pointMargin(closestMatch)} ${
                                                    pointMargin(closestMatch) === 1 ? "point" : "points"
                                                }`}
                                            />
                                        )}
                                        {biggestWin && biggestWin !== closestMatch && (
                                            <RecordRow
                                                label="Biggest win"
                                                match={biggestWin}
                                                players={players}
                                                detail={`${scoresFor(
                                                    biggestWin,
                                                    biggestWin.winning_side ?? 1
                                                )}, by ${pointMargin(biggestWin)} points`}
                                            />
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {topRivalries.length > 0 && (
                            <div className="squash-card">
                                <h4 className="squash-card-title">Rivalries</h4>
                                <p className="squash-muted">The pairings played most.</p>
                                <table className="squash-table">
                                    <thead>
                                        <tr>
                                            <th>Players</th>
                                            <th>Played</th>
                                            <th>Wins</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topRivalries.map(({ playerIds: [a, b], played, wins, drawn }) => (
                                            <tr key={`${a}:${b}`}>
                                                <th scope="row">
                                                    <Link className="squash-link" to={`/squash/players/${a}`}>
                                                        {name(a)}
                                                    </Link>{" "}
                                                    v{" "}
                                                    <Link className="squash-link" to={`/squash/players/${b}`}>
                                                        {name(b)}
                                                    </Link>
                                                </th>
                                                <td>{played}</td>
                                                <td>
                                                    <MatchRecord won={wins[0]} lost={wins[1]} drawn={drawn} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {topPartnerships.length > 0 && (
                            <div className="squash-card">
                                <h4 className="squash-card-title">Partnerships</h4>
                                <p className="squash-muted">The pairs who've played together most.</p>
                                <table className="squash-table">
                                    <thead>
                                        <tr>
                                            <th>Pair</th>
                                            <th>Played</th>
                                            <th>Record</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topPartnerships.map(({ playerIds: [a, b], played, won, lost, drawn }) => (
                                            <tr key={`${a}:${b}`}>
                                                <th scope="row">
                                                    <Link className="squash-link" to={`/squash/players/${a}`}>
                                                        {name(a)}
                                                    </Link>{" "}
                                                    &amp;{" "}
                                                    <Link className="squash-link" to={`/squash/players/${b}`}>
                                                        {name(b)}
                                                    </Link>
                                                </th>
                                                <td>{played}</td>
                                                <td>
                                                    <MatchRecord won={won} lost={lost} drawn={drawn} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )
            }}
        </SquashPage>
    )
}
