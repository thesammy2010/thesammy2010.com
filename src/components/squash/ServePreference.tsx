import { useState } from "react"

import { Box, Player, squashApi } from "./api"

const BOXES: { value: Box | null; label: string }[] = [
    { value: "right", label: "Right" },
    { value: "left", label: "Left" },
    { value: null, label: "No preference" }
]

// The box a player likes to start a hand serving from, which live scoring
// starts each of their hands in. They choose their own, on the home page or
// their player page; anyone else's is only shown, and only when they have one.
export default function ServePreference({ player, mine }: { player: Player; mine: boolean }) {
    const [box, setBox] = useState<Box | null>(player.preferred_box ?? null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!mine) {
        return player.preferred_box ? (
            <p className="squash-muted squash-serve-preference">Likes to serve from the {player.preferred_box} box</p>
        ) : null
    }

    const choose = async (next: Box | null) => {
        const previous = box
        setBox(next)
        setSaving(true)
        setError(null)
        try {
            setBox((await squashApi.setMyPreferences({ preferred_box: next })).preferred_box ?? null)
        } catch (e) {
            setBox(previous)
            setError((e as Error).message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="squash-card">
            <div className="squash-header">
                <h4 className="squash-card-title squash-card-title-inline">Serve from</h4>
                <div className="squash-segmented" role="radiogroup" aria-label="Box you like to serve from">
                    {BOXES.map(({ value, label }) => (
                        <button
                            key={label}
                            type="button"
                            role="radio"
                            aria-checked={box === value}
                            className={box === value ? "active" : ""}
                            onClick={() => void choose(value)}
                            disabled={saving}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            <p className="squash-muted">
                When you're scored live, each hand you serve starts in this box. Switch box still changes it for a hand.
            </p>
            {error && <p className="error-message">{error}</p>}
        </div>
    )
}
