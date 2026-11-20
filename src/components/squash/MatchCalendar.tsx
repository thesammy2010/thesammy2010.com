import React, { useEffect, useState } from "react"

import { Match, Player, squashApi } from "./api"
import { byDay, calendarMark, CalendarMark, dayKey, monthWeeks } from "./home"
import MatchCard from "./MatchCard"

interface Props {
    // Whose matches, and whose results the marks show; null shows the group's
    me: Player | null
    players: Player[]
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const MARK_LABELS: Record<CalendarMark, string> = {
    W: "won",
    L: "lost",
    D: "drawn",
    live: "being played",
    upcoming: "to come",
    played: "played"
}

// A month of matches: a mark on each day one was played or is arranged,
// filled for a result (W, L or D from your side), outlined while it's to
// come and green while it's on. Tapping a day lists its matches beneath.
// Each month is loaded as it's shown, so it goes back as far as there are
// any.
export default function MatchCalendar({ me, players }: Props) {
    const today = new Date()
    const [month, setMonth] = useState({ year: today.getFullYear(), month: today.getMonth() })
    const [matches, setMatches] = useState<Match[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [day, setDay] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        setMatches(null)
        setError(null)
        const start = new Date(month.year, month.month, 1)
        const end = new Date(month.year, month.month + 1, 1, 0, 0, 0, -1)
        squashApi.matches({ player_id: me?.id, after: start.toISOString(), before: end.toISOString() }, 1).then(
            (found) => !cancelled && setMatches(found),
            (err) => !cancelled && setError((err as Error).message)
        )
        return () => {
            cancelled = true
        }
    }, [month, me?.id])

    const days = byDay(matches ?? [])
    const step = (by: number) => {
        const next = new Date(month.year, month.month + by, 1)
        setMonth({ year: next.getFullYear(), month: next.getMonth() })
        setDay(null)
    }
    const title = new Date(month.year, month.month, 1).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric"
    })
    const chosen = day ? days.get(day) ?? [] : []

    return (
        <div className="squash-card squash-calendar">
            <div className="squash-calendar-head">
                <button
                    type="button"
                    className="squash-text-button"
                    onClick={() => step(-1)}
                    aria-label="Previous month"
                >
                    ‹
                </button>
                <h4 className="squash-card-title">{title}</h4>
                <button type="button" className="squash-text-button" onClick={() => step(1)} aria-label="Next month">
                    ›
                </button>
            </div>
            {error && <p className="error-message">{error}</p>}
            <table className="squash-calendar-grid" aria-busy={matches === null}>
                <thead>
                    <tr>
                        {WEEKDAYS.map((d) => (
                            <th key={d} scope="col">
                                {d}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {monthWeeks(month.year, month.month).map((week, i) => (
                        <tr key={i}>
                            {week.map((date, j) => {
                                if (!date) {
                                    return <td key={j} />
                                }
                                const key = dayKey(date)
                                const onDay = days.get(key) ?? []
                                const marks = onDay.map((m) => calendarMark(m, me?.id ?? null))
                                const isToday = key === dayKey(today)
                                const label = `${date.toLocaleDateString(undefined, {
                                    day: "numeric",
                                    month: "long"
                                })}${onDay.length ? `: ${marks.map((m) => MARK_LABELS[m]).join(", ")}` : ""}`
                                return (
                                    <td key={j}>
                                        <button
                                            type="button"
                                            className={`squash-calendar-day ${isToday ? "today" : ""} ${
                                                day === key ? "chosen" : ""
                                            }`}
                                            disabled={onDay.length === 0}
                                            aria-label={label}
                                            aria-pressed={day === key}
                                            onClick={() => setDay(day === key ? null : key)}
                                        >
                                            <span>{date.getDate()}</span>
                                            <span className="squash-calendar-marks" aria-hidden="true">
                                                {marks.slice(0, 3).map((mark, k) => (
                                                    <span key={k} className={`squash-calendar-mark mark-${mark}`} />
                                                ))}
                                            </span>
                                        </button>
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="squash-muted squash-calendar-key">
                {me ? (
                    <>
                        <span className="squash-calendar-mark mark-W" /> won{" "}
                        <span className="squash-calendar-mark mark-L" /> lost{" "}
                        <span className="squash-calendar-mark mark-D" /> drawn{" "}
                    </>
                ) : (
                    <>
                        <span className="squash-calendar-mark mark-played" /> played{" "}
                    </>
                )}
                <span className="squash-calendar-mark mark-live" /> on now{" "}
                <span className="squash-calendar-mark mark-upcoming" /> to come
            </p>
            {chosen.length > 0 && (
                <div className="squash-match-list">
                    {chosen.map((m) => (
                        <MatchCard key={m.id} match={m} players={players} me={me} />
                    ))}
                </div>
            )}
        </div>
    )
}
