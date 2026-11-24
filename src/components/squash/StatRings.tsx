import React from "react"

import { PlayerInsights, PlayerRecord } from "./api"
import { formatDuration, winRate } from "./format"

// A figure as a ring: a rate fills it that far round, a count sits in a full
// one. Compared with another's figure, it's green where it's better, red
// where it's worse and grey when level, as in the app.
export interface StatFigure {
    title: string
    value: string
    // 0 to 1 for a rate; undefined for a count
    fraction?: number | null
    number?: number | null
    other?: number | null
    // The other's figure as shown, such as "You 48%"
    otherLabel?: string
    // Whether more is better; null for one that's neither, such as a time
    higherIsBetter?: boolean | null
}

export function beats(figure: StatFigure): boolean | null {
    const { number, other, higherIsBetter = true } = figure
    if (number == null || other == null || higherIsBetter === null || number === other) {
        return null
    }
    const higher = number > other
    return higher === higherIsBetter
}

export function rate(title: string, value: number | null, other?: number | null, otherName?: string): StatFigure {
    return {
        title,
        value: winRate(value),
        fraction: value,
        number: value,
        other,
        otherLabel: otherName ? `${otherName} ${winRate(other ?? null)}` : undefined
    }
}

export function count(
    title: string,
    value: number,
    other?: number | null,
    otherName?: string,
    higherIsBetter: boolean | null = true
): StatFigure {
    return {
        title,
        value: String(value),
        number: value,
        other,
        otherLabel: otherName && other != null ? `${otherName} ${other}` : undefined,
        higherIsBetter
    }
}

export function share(
    title: string,
    won: number,
    total: number,
    otherWon?: number,
    otherTotal?: number,
    otherName?: string
): StatFigure {
    const mine = total > 0 ? won / total : null
    const theirs = otherWon != null && otherTotal ? otherWon / otherTotal : null
    return rate(title, mine, theirs, otherName && theirs != null ? otherName : undefined)
}

/** A record's matches, games and points won, compared with another's. */
export function recordFigures(record: PlayerRecord, other?: PlayerRecord, otherName = "You"): StatFigure[] {
    const name = other ? otherName : undefined
    return [
        share(
            "Matches won",
            record.matches_won,
            record.matches_won + record.matches_lost,
            other?.matches_won,
            other && other.matches_won + other.matches_lost,
            name
        ),
        share(
            "Games won",
            record.games_won,
            record.games_won + record.games_lost,
            other?.games_won,
            other && other.games_won + other.games_lost,
            name
        ),
        share(
            "Points won",
            record.points_won,
            record.points_won + record.points_lost,
            other?.points_won,
            other && other.points_won + other.points_lost,
            name
        )
    ]
}

/** A player's point-by-point figures, compared with another's when given. */
export function insightFigures(
    insights: PlayerInsights,
    other?: PlayerInsights | null,
    otherName = "You"
): StatFigure[] {
    const a = insights.rallies
    const b = other?.rallies
    const name = other ? otherName : undefined
    const figures: StatFigure[] = []
    if (insights.games_scored_live > 0) {
        figures.push(
            rate("Rallies won", a.rally_win_rate, b?.rally_win_rate, name),
            rate("On serve", a.serve_win_rate, b?.serve_win_rate, name),
            rate("Receiving", a.receive_win_rate, b?.receive_win_rate, name),
            rate("Game points taken", a.game_point_win_rate, b?.game_point_win_rate, name),
            count("Longest run", a.longest_run, b?.longest_run, name),
            count("Biggest lead", a.biggest_lead, b?.biggest_lead, name),
            count("Comebacks", insights.comebacks, other?.comebacks, name),
            count("Leads of 3+ lost", insights.leads_lost, other?.leads_lost, name, false),
            count("Strokes won", a.strokes, b?.strokes, name)
        )
    }
    const deuce = insights.deuce_games_won + insights.deuce_games_lost
    if (deuce > 0) {
        const otherDeuce = other ? other.deuce_games_won + other.deuce_games_lost : 0
        figures.push(share("Tie-breaks won", insights.deuce_games_won, deuce, other?.deuce_games_won, otherDeuce, name))
    }
    const times = insights.times
    if (times && times.games > 0) {
        const theirs = other?.times && other.times.games > 0 ? other.times : null
        const time = (title: string, mine: number | null, them: number | null | undefined): StatFigure => ({
            title,
            value: formatDuration(mine ?? 0),
            otherLabel: name && them != null ? `${name} ${formatDuration(them)}` : undefined,
            higherIsBetter: null
        })
        figures.push(
            time("Average game", times.average_seconds, theirs?.average_seconds),
            time("Longest game", times.longest_seconds, theirs?.longest_seconds)
        )
    }
    return figures
}

const RADIUS = 28
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function Ring({ figure }: { figure: StatFigure }) {
    const better = beats(figure)
    const compared = figure.other != null && figure.higherIsBetter !== null
    const tone = better === true ? "better" : better === false ? "worse" : compared ? "level" : "plain"
    const fraction = figure.fraction == null ? 1 : Math.max(0, Math.min(1, figure.fraction))
    return (
        <li className={`squash-ring squash-ring-${tone}`}>
            <svg viewBox="0 0 64 64" className="squash-ring-svg" aria-hidden="true">
                <circle className="squash-ring-track" cx="32" cy="32" r={RADIUS} />
                <circle
                    className="squash-ring-fill"
                    cx="32"
                    cy="32"
                    r={RADIUS}
                    strokeDasharray={`${fraction * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                    transform="rotate(-90 32 32)"
                />
            </svg>
            <span className="squash-ring-value">{figure.value}</span>
            <span className="squash-ring-title">{figure.title}</span>
            {figure.otherLabel && <span className="squash-ring-other">{figure.otherLabel}</span>}
        </li>
    )
}

/** Figures three to a row, each centred under its ring. */
export default function StatRings({ figures }: { figures: StatFigure[] }) {
    if (figures.length === 0) {
        return null
    }
    return (
        <ul className="squash-rings">
            {figures.map((figure) => (
                <Ring key={figure.title} figure={figure} />
            ))}
        </ul>
    )
}
