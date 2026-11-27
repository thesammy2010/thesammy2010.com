import { useState } from "react"

import { Player, squashApi } from "./api"
import { colourName, PLAYER_COLOURS, PlayerColour } from "./colours"

const known = (colour: string | null | undefined): PlayerColour | null =>
    PLAYER_COLOURS.includes(colour as PlayerColour) ? (colour as PlayerColour) : null

// The colours a player's side is shown in, here, in the app and on the
// watch: a primary, and a secondary for when the other side's is the same.
// The API settles each match's from its players'. They choose their own, on
// the home page or their player page; anyone else's is only shown.
export default function ColourPreference({ player, mine }: { player: Player; mine: boolean }) {
    const [primary, setPrimary] = useState(known(player.primary_colour))
    const [secondary, setSecondary] = useState(known(player.secondary_colour))
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!mine) {
        return primary ? (
            <p className="squash-muted squash-serve-preference">
                Plays in {primary}
                {secondary ? `, or ${secondary}` : ""}
            </p>
        ) : null
    }

    // A secondary only goes with a primary, and never the same.
    const choose = async (nextPrimary: PlayerColour | null, nextSecondary: PlayerColour | null) => {
        const kept = nextPrimary && nextSecondary !== nextPrimary ? nextSecondary : null
        const previous = [primary, secondary] as const
        setPrimary(nextPrimary)
        setSecondary(kept)
        setSaving(true)
        setError(null)
        try {
            const saved = await squashApi.setMyPreferences({ primary_colour: nextPrimary, secondary_colour: kept })
            setPrimary(known(saved.primary_colour))
            setSecondary(known(saved.secondary_colour))
        } catch (e) {
            setPrimary(previous[0])
            setSecondary(previous[1])
            setError((e as Error).message)
        } finally {
            setSaving(false)
        }
    }

    const swatches = (
        label: string,
        chosen: PlayerColour | null,
        taken: PlayerColour | null,
        pick: (c: PlayerColour | null) => void
    ) => (
        <div className="squash-colour-row">
            <span className="squash-colour-label">{label}</span>
            <div className="squash-colour-swatches" role="radiogroup" aria-label={`${label} colour`}>
                <button
                    type="button"
                    role="radio"
                    aria-checked={chosen === null}
                    aria-label="None"
                    className={`squash-colour-swatch squash-colour-none ${chosen === null ? "active" : ""}`}
                    onClick={() => pick(null)}
                    disabled={saving}
                />
                {PLAYER_COLOURS.filter((colour) => colour !== taken).map((colour) => (
                    <button
                        key={colour}
                        type="button"
                        role="radio"
                        aria-checked={chosen === colour}
                        aria-label={colourName(colour)}
                        title={colourName(colour)}
                        className={`squash-colour-swatch ${chosen === colour ? "active" : ""}`}
                        style={{ background: `var(--squash-colour-${colour})` }}
                        onClick={() => pick(colour)}
                        disabled={saving}
                    />
                ))}
            </div>
        </div>
    )

    return (
        <div className="squash-card">
            <h4 className="squash-card-title">Your colours</h4>
            {swatches("Primary", primary, null, (colour) => void choose(colour, secondary))}
            {primary && swatches("Secondary", secondary, primary, (colour) => void choose(primary, colour))}
            <p className="squash-muted">
                Your side's colour in every match you play, here, in the app and on the watch. The secondary is for when
                the other side's colour is your primary too.
            </p>
            {error && <p className="error-message">{error}</p>}
        </div>
    )
}
