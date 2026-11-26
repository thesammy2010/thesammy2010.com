import React, { useState } from "react"

import { Match, Rally, squashApi, StaleMatchError } from "./api"
import { apiTime, formatDuration } from "./format"

interface Props {
    match: Match
    rally: Rally
    // The match's rallies either side, in milliseconds, if there are any
    previous: number | null
    next: number | null
    // The game's middle rally length, offered as a quick fix
    typical: number | null
    onDone: (changed: boolean) => void
}

const clock = (ms: number) =>
    new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })

// Corrects when a rally was played, such as a point undone by mistake and
// scored again minutes later, which otherwise reads as a very long rally.
// Given as seconds after the rally before, or for a match's first rally as
// a time of day, and kept between the rallies either side of it.
export default function RallyTimeFix({ match, rally, previous, next, typical, onDone }: Props) {
    const current = apiTime(rally.created_at ?? "")
    const latest = Math.min(next ?? Date.now(), Date.now())
    const [seconds, setSeconds] = useState(previous === null ? 0 : Math.max(0, Math.round((current - previous) / 1000)))
    // hh:mm:ss on the rally's own day, for a match's first rally
    const [timeOfDay, setTimeOfDay] = useState(clock(current).slice(0, 8))
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const when = (): number | null => {
        if (previous !== null) {
            return previous + seconds * 1000
        }
        const [h, m, s] = timeOfDay.split(":").map(Number)
        if ([h, m].some(Number.isNaN)) return null
        const day = new Date(current)
        day.setHours(h, m, s || 0, 0)
        return day.getTime()
    }
    const target = when()
    const valid = target !== null && (previous === null || target >= previous) && target <= latest + 1000

    const save = async (event: React.FormEvent) => {
        event.preventDefault()
        if (target === null || !valid) return
        setSaving(true)
        setError(null)
        try {
            await squashApi.setRallyTime(
                match.id,
                rally.game,
                rally.number,
                new Date(target).toISOString(),
                match.version
            )
            onDone(true)
        } catch (e) {
            setError(
                e instanceof StaleMatchError
                    ? "The match changed meanwhile. Refresh, check the time and try again."
                    : e instanceof Error
                    ? e.message
                    : "Couldn't correct the time"
            )
        } finally {
            setSaving(false)
        }
    }

    return (
        <form className="squash-rally-fix" onSubmit={save}>
            {previous !== null ? (
                <label>
                    Took{" "}
                    <input
                        type="number"
                        min={0}
                        max={Math.floor((latest - previous) / 1000)}
                        value={seconds}
                        onChange={(e) => setSeconds(Math.max(0, Number(e.target.value) || 0))}
                        aria-label="Seconds after the rally before"
                    />{" "}
                    seconds after the rally before, at {clock(previous)}
                </label>
            ) : (
                <label>
                    Played at{" "}
                    <input type="time" step={1} value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} />
                </label>
            )}
            {previous !== null && typical !== null && typical !== seconds && (
                <button type="button" className="squash-text-button" onClick={() => setSeconds(typical)}>
                    Use the game's usual {formatDuration(typical)}
                </button>
            )}
            {next !== null && (
                <span className="squash-muted">It has to be before the next rally, at {clock(next)}.</span>
            )}
            <span className="squash-rally-fix-actions">
                <button type="submit" className="squash-primary-button" disabled={!valid || saving}>
                    {saving ? "Saving…" : "Save"}
                </button>
                <button type="button" className="squash-secondary-button" onClick={() => onDone(false)}>
                    Cancel
                </button>
            </span>
            {error && <p className="error-message squash-inline-error">{error}</p>}
        </form>
    )
}
