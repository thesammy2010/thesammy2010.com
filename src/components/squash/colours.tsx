import React, { CSSProperties } from "react"
import type { Match } from "./api"

// The colours a player can pick for their side of a match, by the API's
// names. The API settles each match's (side1_colour, side2_colour) from its
// players' choices, so the website, phone and watch all agree; Squash.css
// has each one's shade (--squash-colour-<name>).
export const PLAYER_COLOURS = ["blue", "orange", "red", "green", "purple", "pink", "teal", "yellow"] as const
export type PlayerColour = (typeof PLAYER_COLOURS)[number]

export const colourName = (colour: PlayerColour) => colour[0].toUpperCase() + colour.slice(1)

const known = (colour: string | null | undefined): colour is PlayerColour =>
    PLAYER_COLOURS.includes(colour as PlayerColour)

// A side's colour, blue and orange from an API from before, or for one this
// version doesn't know.
export function sideColour(match: Pick<Match, "side1_colour" | "side2_colour">, side: 1 | 2): PlayerColour {
    const chosen = side === 1 ? match.side1_colour : match.side2_colour
    return known(chosen) ? chosen : side === 1 ? "blue" : "orange"
}

// The match's colours for everything inside, by setting the variables the
// side classes (squash-side-1, squash-row-side-2...) are drawn with.
export function sideColourStyle(match: Pick<Match, "side1_colour" | "side2_colour">): CSSProperties {
    const style: Record<string, string> = {}
    for (const side of [1, 2] as const) {
        const colour = sideColour(match, side)
        style[`--squash-side-${side}`] = `var(--squash-colour-${colour})`
        style[`--squash-side-${side}-soft`] = `var(--squash-colour-${colour}-soft)`
    }
    return style as CSSProperties
}

// Around a page's worth of one match, adding no box of its own to the layout.
export function MatchColours({ match, children }: { match: Match; children: React.ReactNode }) {
    return (
        <div className="squash-match-colours" style={sideColourStyle(match)}>
            {children}
        </div>
    )
}

export const withColours = (match: Match, content: React.ReactNode) => (
    <MatchColours match={match}>{content}</MatchColours>
)
