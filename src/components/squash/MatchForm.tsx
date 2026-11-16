import React, { useState } from "react"

import { Match, MatchFormat, MatchInput, Player, Side, squashApi } from "./api"
import { fromLocalInput, toLocalInput } from "./format"
import "../go_heavier/LocationForm.css"
import "./Squash.css"

interface Props {
    players: Player[]
    me: Player | null
    // Set to edit a match; left out to arrange a new one.
    match?: Match
    // A new match's format before it's chosen, such as the list's filter
    defaultFormat?: MatchFormat
    onClose: () => void
    onSaved: (match: Match) => void
}

const BEST_OF_OPTIONS: { value: string; label: string }[] = [
    { value: "3", label: "Best of 3" },
    { value: "5", label: "Best of 5" },
    { value: "", label: "Open-ended: play until we stop" }
]

// One slot per player a side: [side 1 slots, side 2 slots].
type Slots = [string[], string[]]

function slotsFor(format: MatchFormat, match: Match | undefined, me: Player | null): Slots {
    const size = format === "singles" ? 1 : 2
    const fill = (side: Side, fallback: string[]) => {
        const ids = match ? match.players.filter((p) => p.side === side).map((p) => p.player_id) : fallback
        return Array.from({ length: size }, (_, i) => ids[i] ?? "")
    }
    return [fill(1, me ? [me.id] : []), fill(2, [])]
}

export default function MatchForm({ players, me, match, defaultFormat, onClose, onSaved }: Props) {
    const [format, setFormat] = useState<MatchFormat>(match?.format ?? defaultFormat ?? "singles")
    const [slots, setSlots] = useState<Slots>(slotsFor(match?.format ?? defaultFormat ?? "singles", match, me))
    const [bestOf, setBestOf] = useState(match ? (match.best_of === null ? "" : String(match.best_of)) : "5")
    const [pointsTo, setPointsTo] = useState(String(match?.points_to ?? 11))
    const [playedAt, setPlayedAt] = useState(toLocalInput(match ? match.played_at : new Date()))
    const [venue, setVenue] = useState(match?.venue ?? "")
    const [notes, setNotes] = useState(match?.notes ?? "")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Someone already in a match can't be picked twice, so each slot only
    // offers the players not chosen in another one.
    const chosen = new Set(slots.flat().filter(Boolean))

    const changeFormat = (next: MatchFormat) => {
        setFormat(next)
        const size = next === "singles" ? 1 : 2
        setSlots(slots.map((side) => Array.from({ length: size }, (_, i) => side[i] ?? "")) as Slots)
    }

    const setSlot = (side: number, index: number, playerId: string) => {
        const next = slots.map((s) => [...s]) as Slots
        next[side][index] = playerId
        setSlots(next)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError(null)
        const body: MatchInput = {
            format,
            status: match?.status ?? "scheduled",
            played_at: fromLocalInput(playedAt),
            venue: venue.trim() || null,
            points_to: Number(pointsTo),
            best_of: bestOf === "" ? null : Number(bestOf),
            notes: notes.trim() || null,
            players: slots.flatMap((side, i) =>
                side.map((playerId) => ({ player_id: playerId, side: (i + 1) as Side }))
            )
        }
        try {
            onSaved(match ? await squashApi.updateMatch(match.id, body) : await squashApi.createMatch(body))
        } catch (err) {
            setError((err as Error).message)
            setSaving(false)
        }
    }

    return (
        <div className="popup-overlay" onClick={onClose}>
            <div className="popup-form squash-form" onClick={(e) => e.stopPropagation()}>
                <button className="close-button" onClick={onClose} aria-label="Close">
                    ✖
                </button>
                <h2>{match ? "Edit match" : "New match"}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="squash-segmented" role="radiogroup" aria-label="Format">
                        {(["singles", "doubles"] as MatchFormat[]).map((option) => (
                            <button
                                key={option}
                                type="button"
                                role="radio"
                                aria-checked={format === option}
                                className={format === option ? "active" : ""}
                                onClick={() => changeFormat(option)}
                            >
                                {option === "singles" ? "Singles" : "Doubles"}
                            </button>
                        ))}
                    </div>

                    <div className="squash-sides-picker">
                        {slots.map((side, sideIndex) => (
                            <fieldset key={sideIndex} className={`squash-side-picker squash-side-${sideIndex + 1}`}>
                                <legend>Side {sideIndex + 1}</legend>
                                {side.map((playerId, slotIndex) => (
                                    <select
                                        key={slotIndex}
                                        value={playerId}
                                        onChange={(e) => setSlot(sideIndex, slotIndex, e.target.value)}
                                        required
                                        aria-label={`Side ${sideIndex + 1} player ${slotIndex + 1}`}
                                    >
                                        <option value="" disabled>
                                            Choose a player
                                        </option>
                                        {players
                                            .filter((p) => p.id === playerId || !chosen.has(p.id))
                                            .map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name}
                                                    {p.id === me?.id ? " (you)" : ""}
                                                </option>
                                            ))}
                                    </select>
                                ))}
                            </fieldset>
                        ))}
                    </div>

                    <div className="squash-form-row">
                        <label>
                            <span>Length</span>
                            <select value={bestOf} onChange={(e) => setBestOf(e.target.value)}>
                                {BEST_OF_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            <span>Games to</span>
                            <input
                                type="number"
                                min={1}
                                max={50}
                                value={pointsTo}
                                onChange={(e) => setPointsTo(e.target.value)}
                                required
                            />
                        </label>
                    </div>

                    <div className="squash-form-row">
                        <label>
                            <span>When</span>
                            <input
                                type="datetime-local"
                                value={playedAt}
                                onChange={(e) => setPlayedAt(e.target.value)}
                            />
                        </label>
                        <label>
                            <span>Where</span>
                            <input
                                type="text"
                                value={venue}
                                onChange={(e) => setVenue(e.target.value)}
                                maxLength={255}
                                placeholder="e.g. the club"
                            />
                        </label>
                    </div>

                    <label>
                        <span>Notes</span>
                        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={512} />
                    </label>

                    {error && <p className="error-message">{error}</p>}
                    <div className="form-actions">
                        <button type="submit" disabled={saving}>
                            {saving ? "Saving..." : match ? "Save changes" : "Create match"}
                        </button>
                        <button type="button" onClick={onClose}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
