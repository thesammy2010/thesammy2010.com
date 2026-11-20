import React, { useState } from "react"
import { useNavigate } from "react-router-dom"

import { RatingChange } from "./api"
import { formatWhen, signed } from "./format"
import { ratingPoints, ratingScale } from "./ratingScale"

interface Props {
    history: RatingChange[]
}

const HEIGHT = 180

// A player's Elo rating after each completed match, oldest first. Drawn in
// data units and stretched to fit, with strokes kept at 2px.
export default function RatingChart({ history }: Props) {
    const navigate = useNavigate()
    const [hovered, setHovered] = useState<number | null>(null)
    const points = ratingPoints(history)
    const { min, max, ticks } = ratingScale(history)
    // Half a step of room at each end, so the end dot isn't cut off
    const left = -0.5
    const span = points.length
    const x = (i: number) => `${((i - left) / span) * 100}%`
    const y = (rating: number) => `${((max - rating) / (max - min)) * 100}%`

    const path = points.map((rating, i) => `${i ? "L" : "M"}${i},${-rating}`).join(" ")
    const last = points.length - 1
    // Index 0 is the start, before any match, so it has no match to show.
    const match = hovered !== null && hovered > 0 ? history[hovered - 1] : null

    const indexAt = (clientX: number, element: HTMLElement) => {
        const box = element.getBoundingClientRect()
        const i = Math.round(((clientX - box.left) / box.width) * span + left)
        return Math.min(Math.max(i, 1), last)
    }

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault()
            const step = e.key === "ArrowRight" ? 1 : -1
            setHovered((h) => Math.min(Math.max((h ?? (step > 0 ? 0 : last + 1)) + step, 1), last))
        } else if (e.key === "Enter" && match) {
            navigate(`/squash/matches/${match.match_id}`)
        }
    }

    return (
        <figure className="squash-rating-chart">
            <figcaption>
                <h4 className="squash-card-title">Rating</h4>
                <p className="squash-muted">After each completed match, oldest first. Tap a point to open the match.</p>
            </figcaption>
            <div className="squash-rating-frame">
                <div className="squash-rating-axis" style={{ height: HEIGHT }} aria-hidden="true">
                    {ticks.map((t) => (
                        <span key={t} style={{ top: y(t) }}>
                            {t}
                        </span>
                    ))}
                </div>
                <div
                    className="squash-momentum-plot squash-rating-plot"
                    style={{ height: HEIGHT }}
                    tabIndex={0}
                    role="img"
                    aria-label={`Rating over ${history.length} ${history.length === 1 ? "match" : "matches"}, from ${
                        points[0]
                    } to ${points[last]}. Use the arrow keys to step through them and Enter to open one.`}
                    onPointerMove={(e) => setHovered(indexAt(e.clientX, e.currentTarget))}
                    onPointerLeave={() => setHovered(null)}
                    onClick={(e) =>
                        navigate(`/squash/matches/${history[indexAt(e.clientX, e.currentTarget) - 1].match_id}`)
                    }
                    onKeyDown={onKeyDown}
                    onBlur={() => setHovered(null)}
                >
                    <svg
                        className="squash-momentum-svg"
                        viewBox={`${left} ${-max} ${span} ${max - min}`}
                        preserveAspectRatio="none"
                        aria-hidden="true"
                    >
                        {ticks.map((t) => (
                            <line key={t} className="squash-rating-grid" x1={left} x2={left + span} y1={-t} y2={-t} />
                        ))}
                        <path className="squash-rating-line" d={path} />
                        {hovered !== null && (
                            <line className="squash-momentum-crosshair" x1={hovered} x2={hovered} y1={-max} y2={-min} />
                        )}
                    </svg>

                    <div
                        className="squash-momentum-dot squash-rating-dot"
                        style={{ left: x(last), top: y(points[last]) }}
                    />
                    <span className="squash-rating-end" style={{ top: y(points[last]) }} aria-hidden="true">
                        {points[last]}
                    </span>

                    {hovered !== null && match && (
                        <>
                            <div
                                className="squash-momentum-dot squash-rating-dot"
                                style={{ left: x(hovered), top: y(points[hovered]) }}
                                aria-hidden="true"
                            />
                            <div
                                className={`squash-momentum-tooltip ${hovered > last / 2 ? "flip" : ""}`}
                                style={{ left: x(hovered) }}
                                role="status"
                            >
                                <strong>{match.rating_after}</strong>
                                <span
                                    className={
                                        match.change > 0 ? "squash-ahead" : match.change < 0 ? "squash-behind" : ""
                                    }
                                >
                                    {signed(match.change)}
                                </span>
                                <span className="squash-muted">{formatWhen(match.played_at)}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </figure>
    )
}
