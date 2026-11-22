import { FormEvent, useState } from "react"

import { Player, recheckSquashAccess, squashApi } from "./api"

// Changing the name the group sees you by, in every match and list, old ones
// included, from your own player page. Your Google or Apple account's name
// stays as it is.
export default function DisplayName({ player, onSaved }: { player: Player; onSaved: (player: Player) => void }) {
    const [editing, setEditing] = useState(false)
    const [name, setName] = useState(player.name)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const trimmed = name.trim()

    if (!editing) {
        return (
            <button
                type="button"
                className="squash-text-button"
                onClick={() => {
                    setName(player.name)
                    setError(null)
                    setEditing(true)
                }}
            >
                Change name
            </button>
        )
    }

    const save = async (event: FormEvent) => {
        event.preventDefault()
        if (!trimmed || trimmed === player.name) {
            return
        }
        setSaving(true)
        setError(null)
        try {
            const saved = await squashApi.setMyPreferences({ name: trimmed })
            setEditing(false)
            // The signed-in player is kept with the access check, so it's
            // fetched again to show the new name everywhere
            recheckSquashAccess()
            onSaved(saved)
        } catch (e) {
            setError((e as Error).message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <form className="squash-card" onSubmit={save}>
            <label className="squash-card-title" htmlFor="squash-display-name">
                Name in the group
            </label>
            <div className="squash-player-editor">
                <input
                    id="squash-display-name"
                    className="squash-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={255}
                    autoComplete="name"
                    autoFocus
                />
                <button type="button" className="squash-secondary-button" onClick={() => setEditing(false)}>
                    Cancel
                </button>
                <button
                    type="submit"
                    className="squash-primary-button"
                    disabled={saving || !trimmed || trimmed === player.name}
                >
                    {saving ? "Saving..." : "Save"}
                </button>
            </div>
            <p className="squash-muted">How everyone in the group sees you, in every match, old ones too.</p>
            {error && <p className="error-message">{error}</p>}
        </form>
    )
}
