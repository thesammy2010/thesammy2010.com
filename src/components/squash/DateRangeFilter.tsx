import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { DateRange, presets, rangeLabel } from "./dateRange"

// The range in the page's ?from= and ?to=, so it's kept in links and on
// going back
export function useDateRangeParams(): [DateRange, (range: DateRange) => void] {
    const [searchParams, setSearchParams] = useSearchParams()
    const range = { from: searchParams.get("from") ?? "", to: searchParams.get("to") ?? "" }
    const setRange = (next: DateRange) =>
        setSearchParams(
            (current) => {
                const params = new URLSearchParams(current)
                ;(["from", "to"] as const).forEach((key) =>
                    next[key] ? params.set(key, next[key]) : params.delete(key)
                )
                return params
            },
            { replace: true }
        )
    return [range, setRange]
}

interface Props {
    range: DateRange
    onChange: (range: DateRange) => void
}

// When matches were played, as one pill in a row of filters that names the
// range briefly ("This month", "3–15 Nov"). Opening it puts the presets and
// a pair of dates on a line of their own below, so the row stays one line.
export default function DateRangeFilter({ range, onChange }: Props) {
    const [open, setOpen] = useState(false)
    const today = new Date()
    const set = Boolean(range.from || range.to)

    useEffect(() => {
        if (!open) {
            return
        }
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [open])

    return (
        <>
            <button
                type="button"
                className={`squash-pill squash-pill-select ${set ? "squash-pill-set" : ""}`}
                aria-expanded={open}
                aria-controls="squash-date-range"
                aria-label={`When: ${rangeLabel(range, today)}`}
                onClick={() => setOpen(!open)}
            >
                <span aria-hidden="true">📅</span> {rangeLabel(range, today)}
            </button>
            {open && (
                <div id="squash-date-range" className="squash-date-range" role="group" aria-label="When played">
                    <div className="squash-date-range-presets">
                        {[{ label: "Any time", from: "", to: "" }, ...presets(today)].map((preset) => {
                            const active = preset.from === range.from && preset.to === range.to
                            return (
                                <button
                                    key={preset.label}
                                    type="button"
                                    className={`squash-pill ${active ? "squash-pill-set" : ""}`}
                                    aria-pressed={active}
                                    onClick={() => {
                                        onChange({ from: preset.from, to: preset.to })
                                        setOpen(false)
                                    }}
                                >
                                    {preset.label}
                                </button>
                            )
                        })}
                    </div>
                    <div className="squash-date-range-custom">
                        <label>
                            <span>From</span>
                            <input
                                className="squash-input"
                                type="date"
                                value={range.from}
                                max={range.to || undefined}
                                onChange={(e) => onChange({ ...range, from: e.target.value })}
                            />
                        </label>
                        <label>
                            <span>To</span>
                            <input
                                className="squash-input"
                                type="date"
                                value={range.to}
                                min={range.from || undefined}
                                onChange={(e) => onChange({ ...range, to: e.target.value })}
                            />
                        </label>
                        <button type="button" className="squash-text-button" onClick={() => setOpen(false)}>
                            Done
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
