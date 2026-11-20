import React, { useMemo, useState } from "react"

import { Match, Player, Rally, Side } from "./api"
import { momentum, MomentumPoint, nearestPoint } from "./momentum"
import { CALLS, sideNames } from "./format"

interface Props {
    match: Match
    rallies: Rally[]
    players: Player[]
}

const HEIGHT = 160

// Side 1's lead through the match: above the middle line side 1 is ahead,
// below it side 2, in the sides' own colours. Drawn in data units and
// stretched to fit, with strokes kept at 2px whatever the width.
export default function MomentumChart({ match, rallies, players }: Props) {
    const data = useMemo(() => momentum(rallies), [rallies])
    const [hovered, setHovered] = useState<{ game: number; point: MomentumPoint } | null>(null)
    const { games, width, maxLead } = data
    // A point of headroom either way and half a step at each end, so the
    // biggest lead and the last rally aren't cut off at the edge.
    const top = maxLead + 1
    const left = -0.5
    const span = width + 1
    const names: Record<Side, string> = { 1: sideNames(match, 1, players), 2: sideNames(match, 2, players) }

    const linePath = (points: MomentumPoint[]) => points.map((p, i) => `${i ? "L" : "M"}${p.x},${-p.lead}`).join(" ")
    const areaPath = (points: MomentumPoint[]) =>
        `${linePath(points)} L${points[points.length - 1].x},0 L${points[0].x},0 Z`

    const pointAt = (clientX: number, element: HTMLElement) => {
        const box = element.getBoundingClientRect()
        return nearestPoint(data, ((clientX - box.left) / box.width) * span + left)
    }

    // Arrow keys step through the rallies for anyone not using a pointer.
    const allPoints = games.flatMap((g) => g.points.filter((p) => p.rally).map((point) => ({ game: g.number, point })))
    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
            return
        }
        e.preventDefault()
        const index = hovered ? allPoints.findIndex((p) => p.point === hovered.point) : -1
        const next = e.key === "ArrowRight" ? index + 1 : index <= 0 ? allPoints.length - 1 : index - 1
        setHovered(allPoints[next % allPoints.length] ?? null)
    }

    const percent = (x: number) => `${((x - left) / span) * 100}%`
    const final = games[games.length - 1]?.points.slice(-1)[0]

    return (
        <figure className="squash-momentum">
            <figcaption className="squash-momentum-caption">
                <h4 className="squash-card-title">Momentum</h4>
                <p className="squash-muted">Who was ahead through each game, rally by rally.</p>
            </figcaption>

            <div className="squash-momentum-key squash-momentum-key-top">
                <span className="squash-side-dot squash-side-1" aria-hidden="true" /> {names[1]} ahead
            </div>
            <div
                className="squash-momentum-plot"
                style={{ height: HEIGHT }}
                tabIndex={0}
                role="img"
                aria-label={`Momentum chart over ${games.length} ${games.length === 1 ? "game" : "games"}${
                    final ? `, ending ${final.side1}-${final.side2}` : ""
                }. Use the arrow keys to step through the rallies.`}
                onPointerMove={(e) => setHovered(pointAt(e.clientX, e.currentTarget))}
                onPointerLeave={() => setHovered(null)}
                onKeyDown={onKeyDown}
                onBlur={() => setHovered(null)}
            >
                <svg
                    className="squash-momentum-svg"
                    viewBox={`${left} ${-top} ${span} ${top * 2}`}
                    preserveAspectRatio="none"
                    aria-hidden="true"
                >
                    <defs>
                        <clipPath id={`momentum-above-${match.id}`}>
                            <rect x={left} y={-top} width={span} height={top} />
                        </clipPath>
                        <clipPath id={`momentum-below-${match.id}`}>
                            <rect x={left} y={0} width={span} height={top} />
                        </clipPath>
                    </defs>

                    {games.slice(1).map((game) => (
                        <line
                            key={game.number}
                            className="squash-momentum-divider"
                            x1={game.points[0].x - 0.5}
                            x2={game.points[0].x - 0.5}
                            y1={-top}
                            y2={top}
                        />
                    ))}
                    <line className="squash-momentum-zero" x1={left} x2={left + span} y1={0} y2={0} />

                    {([1, 2] as Side[]).map((side) => (
                        <g key={side} clipPath={`url(#momentum-${side === 1 ? "above" : "below"}-${match.id})`}>
                            {games.map((game) => (
                                <React.Fragment key={game.number}>
                                    <path
                                        className={`squash-momentum-area squash-side-${side}`}
                                        d={areaPath(game.points)}
                                    />
                                    <path
                                        className={`squash-momentum-line squash-side-${side}`}
                                        d={linePath(game.points)}
                                    />
                                </React.Fragment>
                            ))}
                        </g>
                    ))}

                    {hovered && (
                        <line
                            className="squash-momentum-crosshair"
                            x1={hovered.point.x}
                            x2={hovered.point.x}
                            y1={-top}
                            y2={top}
                        />
                    )}
                </svg>

                {games.map((game) => (
                    <span
                        key={game.number}
                        className="squash-momentum-game"
                        style={{ left: percent(game.points[0].x) }}
                        aria-hidden="true"
                    >
                        G{game.number}
                    </span>
                ))}

                {hovered && hovered.point.rally && (
                    <div
                        className={`squash-momentum-dot squash-side-${hovered.point.rally.wonBy}`}
                        style={{
                            left: percent(hovered.point.x),
                            top: `${((top - hovered.point.lead) / (top * 2)) * 100}%`
                        }}
                        aria-hidden="true"
                    />
                )}
                {hovered && hovered.point.rally && (
                    <div
                        className={`squash-momentum-tooltip ${hovered.point.x > width / 2 ? "flip" : ""}`}
                        style={{ left: percent(hovered.point.x) }}
                        role="status"
                    >
                        <strong>
                            {hovered.point.side1}-{hovered.point.side2}
                        </strong>
                        <span>
                            {names[hovered.point.rally.wonBy]} won the point
                            {hovered.point.rally.decision
                                ? ` on a ${CALLS[hovered.point.rally.decision].toLowerCase()}`
                                : ""}
                        </span>
                        <span className="squash-muted">
                            Game {hovered.game}, rally {hovered.point.rally.number}
                        </span>
                    </div>
                )}
            </div>
            <div className="squash-momentum-key">
                <span className="squash-side-dot squash-side-2" aria-hidden="true" /> {names[2]} ahead
            </div>
        </figure>
    )
}
