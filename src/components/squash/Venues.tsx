import React, { useEffect, useState } from "react"

import { squashApi, Venue, VenueInput } from "./api"

const input = (venue: Venue, changes: Partial<VenueInput>): VenueInput => ({
    name: venue.name,
    address: venue.address,
    notes: venue.notes,
    is_active: venue.is_active,
    ...changes
})

// Where the group plays, for admins: matches pick from these. One the group
// stops using is kept for its matches, just no longer offered.
export default function Venues() {
    const [venues, setVenues] = useState<Venue[] | null>(null)
    const [name, setName] = useState("")
    const [address, setAddress] = useState("")
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
                            {venues.map((venue) => (
                                <tr key={venue.id} className={venue.is_active ? "" : "squash-inactive"}>
                                    <th scope="row">
                                        {venue.name}
                                        {venue.address && (
                                            <span className="squash-muted squash-pending">{venue.address}</span>
                                        )}
                                    </th>
                                    <td>
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
                            ))}
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
