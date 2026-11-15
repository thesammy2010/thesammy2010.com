import React, { useState } from "react"
import { Link } from "react-router-dom"

import { Player, PlayerInput, PlayerStats, squashApi, useSquashLoad } from "../../components/squash/api"
import SquashPage from "../../components/squash/SquashPage"
import { record, winRate } from "../../components/squash/format"
import { useCanAccess } from "../../roles"

interface PlayersData {
    players: Player[]
    stats: Record<string, PlayerStats>
}

// Most wins first, then the better rate, so the table reads as a ladder.
export function ladder(players: Player[], stats: Record<string, PlayerStats>): Player[] {
    return [...players].sort((a, b) => {
        const sa = stats[a.id]
        const sb = stats[b.id]
        return (
            (sb?.matches_won ?? 0) - (sa?.matches_won ?? 0) ||
            (sb?.win_rate ?? -1) - (sa?.win_rate ?? -1) ||
            a.name.localeCompare(b.name)
        )
    })
}

function PlayerEditor({
    player,
    onSaved,
    onCancel
}: {
    player?: Player
    onSaved: () => void
    onCancel?: () => void
}) {
    const [name, setName] = useState(player?.name ?? "")
    const [email, setEmail] = useState(player?.email ?? "")
    const [active, setActive] = useState(player?.is_active ?? true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const save = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError(null)
        const body: PlayerInput = {
            name: name.trim(),
            email: email.trim() || null,
            // Kept as is: the API links a user from the email when it can.
            user_id: player?.user_id ?? null,
            is_active: active
        }
        try {
            if (player) {
                await squashApi.updatePlayer(player.id, body)
            } else {
                await squashApi.createPlayer(body)
                setName("")
                setEmail("")
            }
            onSaved()
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <form className="squash-player-editor" onSubmit={save}>
            <input
                className="squash-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                maxLength={255}
                required
                aria-label="Name"
            />
            <input
                className="squash-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Google email, so they can sign in"
                maxLength={255}
                aria-label="Email"
            />
            {player && (
                <label className="squash-checkbox">
                    <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                    <span>In the group</span>
                </label>
            )}
            <button type="submit" className="squash-primary-button" disabled={saving}>
                {saving ? "Saving..." : player ? "Save" : "Add player"}
            </button>
            {onCancel && (
                <button type="button" className="squash-secondary-button" onClick={onCancel}>
                    Cancel
                </button>
            )}
            {error && <p className="error-message squash-inline-error">{error}</p>}
        </form>
    )
}

export default function Players() {
    // Only admins add and change players.
    const canManage = useCanAccess("POST", "/squash/players")
    const [showInactive, setShowInactive] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    const { state, refreshing, reload } = useSquashLoad<PlayersData>(async () => {
        const players = await squashApi.players(showInactive)
        // The group is a handful of friends, so a request each is fine.
        const stats = await Promise.all(players.map((p) => squashApi.playerStats(p.id)))
        return { players, stats: Object.fromEntries(stats.map((s) => [s.player_id, s])) }
    }, [showInactive])

    return (
        <SquashPage state={state} refreshing={refreshing} onRefresh={reload} what="Players">
            {({ players, stats }, me) => (
                <>
                    <div className="squash-header">
                        <h2 className="squash-title">Players</h2>
                        {canManage && (
                            <label className="squash-checkbox">
                                <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
                                <span>Show people who've left</span>
                            </label>
                        )}
                    </div>

                    <div className="squash-card squash-ladder">
                        <table className="squash-table">
                            <thead>
                                <tr>
                                    <th>Player</th>
                                    <th>Played</th>
                                    <th>Record</th>
                                    <th>Win rate</th>
                                    <th className="squash-hide-narrow">Games</th>
                                    <th className="squash-hide-narrow">Points</th>
                                    {canManage && <th></th>}
                                </tr>
                            </thead>
                            <tbody>
                                {ladder(players, stats).map((player) => {
                                    const s = stats[player.id]
                                    if (editingId === player.id) {
                                        return (
                                            <tr key={player.id}>
                                                <td colSpan={7}>
                                                    <PlayerEditor
                                                        player={player}
                                                        onCancel={() => setEditingId(null)}
                                                        onSaved={() => {
                                                            setEditingId(null)
                                                            reload()
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                        )
                                    }
                                    return (
                                        <tr key={player.id} className={player.is_active ? "" : "squash-inactive"}>
                                            <th scope="row">
                                                <Link className="squash-link" to={`/squash/players/${player.id}`}>
                                                    {player.name}
                                                </Link>
                                                {player.id === me?.id && <span className="squash-you">you</span>}
                                                {canManage && !player.user_id && (
                                                    <span className="squash-muted squash-pending" title={player.email ?? undefined}>
                                                        {player.email ? "hasn't signed in" : "no sign-in"}
                                                    </span>
                                                )}
                                            </th>
                                            <td>{s?.matches_played ?? 0}</td>
                                            <td>{s ? record(s.matches_won, s.matches_lost, s.matches_drawn) : "0-0"}</td>
                                            <td>{winRate(s?.win_rate ?? null)}</td>
                                            <td className="squash-hide-narrow">{s ? `${s.games_won}-${s.games_lost}` : "0-0"}</td>
                                            <td className="squash-hide-narrow">{s ? `${s.points_won}-${s.points_lost}` : "0-0"}</td>
                                            {canManage && (
                                                <td>
                                                    <button type="button" className="squash-text-button" onClick={() => setEditingId(player.id)}>
                                                        Edit
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {canManage && (
                        <div className="squash-card">
                            <h4 className="squash-card-title">Add someone to the group</h4>
                            <p className="squash-muted">
                                With their Google email they can sign in and score their own matches; they're linked
                                the first time they do. Without one they can still be put in matches.
                            </p>
                            <PlayerEditor onSaved={reload} />
                        </div>
                    )}
                </>
            )}
        </SquashPage>
    )
}
