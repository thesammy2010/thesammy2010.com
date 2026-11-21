// A rating's recent path as a small line with a dot at where it is now, for
// beside the number itself: the shape matters, not the values, so there are
// no axes. The full chart is on the player's page.
interface Props {
    points: number[]
    // What the points are, for the label read out in place of the picture
    label: string
}

const WIDTH = 120
const HEIGHT = 36
// Room for the end dot and the line's width at the edges
const PAD = 4

export default function Sparkline({ points, label }: Props) {
    if (points.length < 2) {
        return null
    }
    const min = Math.min(...points)
    const max = Math.max(...points)
    // A flat run sits in the middle rather than on an edge
    const span = max - min || 1
    const x = (i: number) => PAD + (i / (points.length - 1)) * (WIDTH - PAD * 2)
    const y = (value: number) => (max === min ? HEIGHT / 2 : PAD + (1 - (value - min) / span) * (HEIGHT - PAD * 2))
    const path = points.map((value, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(value).toFixed(1)}`).join(" ")
    const last = points.length - 1

    return (
        <svg
            className="squash-sparkline"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            width={WIDTH}
            height={HEIGHT}
            role="img"
            aria-label={`${label}: from ${points[0]} to ${points[last]}`}
        >
            <path
                d={path}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            <circle cx={x(last)} cy={y(points[last])} r="3.5" fill="currentColor" stroke="white" strokeWidth="1.5" />
        </svg>
    )
}
