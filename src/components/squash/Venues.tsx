import React, { useEffect, useState } from "react"

import { squashApi, Venue, VenueInput } from "./api"

const input = (venue: Venue, changes: Partial<VenueInput>): VenueInput => ({
    name: venue.name,
    address: venue.address,
    notes: venue.notes,
    is_active: venue.is_active,
    ...changes
})

// One venue's name, address and notes being changed in place.
function VenueEditor({
    venue,
    busy,
    onSave,
    onCancel
}: {
    venue: Venue
    busy: boolean
    onSave: (changes: Partial<VenueInput>) => void
    onCancel: () => void
}) {
    const [name, setName] = useState(venue.name)
    const [address, setAddress] = useState(venue.address ?? "")
    const [notes, setNotes] = useState(venue.notes ?? "")
    return (
        <form
            className="squash-player-editor"
            onSubmit={(e) => {
                e.preventDefault()
                onSave({ name: name.trim(), address: address.trim() || null, notes: notes.trim() || null })
            }}
        >
            <input
                className="squash-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={255}
                required
                aria-label="Venue name"
            />
            <input
                className="squash-input"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Address (optional)"
                maxLength={512}
                aria-label="Address"
            />
            <input
                className="squash-input"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes, such as how to book a court"
                maxLength={512}
                aria-label="Notes"
            />
            <button type="submit" className="squash-primary-button" disabled={busy}>
                Save
            </button>
            <button type="button" className="squash-secondary-button" onClick={onCancel}>
                Cancel
            </button>
        </form>
    )
}

// Where the group plays, for admins: matches pick from these. One the group
// stops using is kept for its matches, just no longer offered. Each can be
// renamed, and given an address and notes, such as how to book.
export default function Venues() {
    const [venues, setVenues] = useState<Venue[] | null>(null)
    const [name, setName] = useState("")
    const [address, setAddress] = useState("")
    const [editing, setEditing] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const load = () =>
        squashApi.venues(true).then(setVenues, (err) => {
            setVenues([])
            setError((err as Error).message)
        })

    useEffect(() => {
        void load()
    }, [])

    const run = async (action: () => Promise<unknown>) => {
        setBusy(true)
        setError(null)
        try {
            await action()
            await load()
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setBusy(false)
        }
    }

    const add = (e: React.FormEvent) => {
        e.preventDefault()
        void run(async () => {
            await squashApi.createVenue({
                name: name.trim(),
                address: address.trim() || null,
                notes: null,
                is_active: true
            })
            setName("")
            setAddress("")
        })
    }

    return (
        <div className="squash-card">
            <h4 className="squash-card-title">Venues</h4>
            <p className="squash-muted">Where the group plays, for picking when arranging a match.</p>

            {venues === null ? (
                <p className="squash-muted">Loading venues...</p>
            ) : (
                venues.length > 0 && (
                    <table className="squash-table squash-venues">
                        <tbody>
                            {venues.map((venue) =>
                                editing === venue.id ? (
                                    <tr key={venue.id}>
                                        <td colSpan={2}>
                                            <VenueEditor
                                                venue={venue}
                                                busy={busy}
                                                onCancel={() => setEditing(null)}
                                                onSave={(changes) =>
                                                    run(async () => {
                                                        await squashApi.updateVenue(venue.id, input(venue, changes))
                                                        setEditing(null)
                                                    })
                                                }
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    <tr key={venue.id} className={venue.is_active ? "" : "squash-inactive"}>
                                        <th scope="row">
                                            {venue.name}
                                            {venue.address && (
                                                <span className="squash-muted squash-pending">{venue.address}</span>
                                            )}
                                            {venue.notes && (
                                                <span className="squash-muted squash-pending">{venue.notes}</span>
                                            )}
                                        </th>
                                        <td>
                                            <button
                                                type="button"
                                                className="squash-text-button"
                                                disabled={busy}
                                                onClick={() => setEditing(venue.id)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="squash-text-button"
                                                disabled={busy}
                                                onClick={() =>
                                                    run(() =>
                                                        squashApi.updateVenue(
                                                            venue.id,
                                                            input(venue, { is_active: !venue.is_active })
                                                        )
                                                    )
                                                }
                                            >
                                                {venue.is_active ? "Stop using" : "Use again"}
                                            </button>
                                        </td>
                                    </tr>
                                )
                            )}
                        </tbody>
                    </table>
                )
            )}

            <form className="squash-player-editor" onSubmit={add}>
                <input
                    className="squash-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name"
                    maxLength={255}
                    required
                    aria-label="Venue name"
                />
                <input
                    className="squash-input"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Address (optional)"
                    maxLength={512}
                    aria-label="Address"
                />
                <button type="submit" className="squash-primary-button" disabled={busy}>
                    Add venue
                </button>
                {error && <p className="error-message squash-inline-error">{error}</p>}
            </form>
        </div>
    )
}
