import { useEffect, useState } from "react"

import { isSignedIn, useIsAdmin } from "../../roles"
import AdminNavBar from "../../components/admin/NavBar"
import SignInPrompt from "../../components/SignInPrompt"
import { AdminAccessRequest, Player, squashApi } from "../../components/squash/api"
import "./AdminForms.css"
import "./Users.css"
import "./SquashRequests.css"

function formatDate(value: string): string {
    return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

// One request waiting for an answer. Approving adds them as a new player,
// named after their Google account unless renamed, or makes them a player
// already recorded in matches who hasn't signed in.
function PendingRequest({
    request,
    unlinked,
    busy,
    onApprove,
    onDecline
}: {
    request: AdminAccessRequest
    unlinked: Player[]
    busy: boolean
    onApprove: (approval: { player_id: string | null; name: string | null }) => void
    onDecline: () => void
}) {
    const [playerId, setPlayerId] = useState("")
    const [name, setName] = useState(request.name ?? "")
    return (
        <div className="admin-user-card">
            <div className="admin-user-card-row admin-user-card-id-row">
                <div className="admin-user-identity">
                    <span className="admin-user-name">{request.name || "Unnamed user"}</span>
                    {request.email && <span className="admin-user-email">{request.email}</span>}
                </div>
            </div>
            {request.message && <blockquote className="squash-requests-message">{request.message}</blockquote>}
            <div className="admin-user-card-row admin-user-card-activity-row">
                <span>Asked {formatDate(request.created_at)}</span>
            </div>
            <div className="squash-requests-approve">
                <label>
                    Add them as
                    <select value={playerId} onChange={(e) => setPlayerId(e.target.value)} disabled={busy}>
                        <option value="">A new player</option>
                        {unlinked.map((player) => (
                            <option key={player.id} value={player.id}>
                                {player.name}
                                {player.is_active ? "" : " (inactive)"}
                            </option>
                        ))}
                    </select>
                </label>
                {playerId === "" && (
                    <label>
                        Called
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={255}
                            placeholder="Their Google name"
                            disabled={busy}
                        />
                    </label>
                )}
            </div>
            <div className="admin-confirm-actions">
                <button
                    type="button"
                    className="squash-requests-approve-button"
                    disabled={busy}
                    onClick={() =>
                        onApprove(
                            playerId
                                ? { player_id: playerId, name: null }
                                : { player_id: null, name: name.trim() || null }
                        )
                    }
                >
                    Approve
                </button>
                <button type="button" className="admin-danger-button" disabled={busy} onClick={onDecline}>
                    Decline
                </button>
            </div>
        </div>
    )
}

export default function SquashRequests() {
    const isAdmin = useIsAdmin()
    const [requests, setRequests] = useState<AdminAccessRequest[] | null>(null)
    // Players nobody has signed in as, such as friends recorded in matches
    const [unlinked, setUnlinked] = useState<Player[]>([])
    const [busyId, setBusyId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const load = async () => {
        try {
            const [all, players] = await Promise.all([squashApi.accessRequests(), squashApi.players(true)])
            setRequests(all)
            setUnlinked(players.filter((player) => player.user_id === null))
        } catch (err) {
            setRequests([])
            setError((err as Error).message)
        }
    }

    useEffect(() => {
        if (isAdmin) {
            void load()
        }
    }, [isAdmin])

    const review = async (id: string, action: () => Promise<unknown>) => {
        setBusyId(id)
        setError(null)
        try {
            await action()
            await load()
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setBusyId(null)
        }
    }

    const pending = requests?.filter((request) => request.status === "pending") ?? []
    const reviewed = requests?.filter((request) => request.status !== "pending") ?? []

    return (
        <div className="center-container-grid">
            <AdminNavBar />
            <div className="page-container">
                <div className="admin-form-page admin-users-page">
                    {!isSignedIn() ? (
                        <SignInPrompt message="Sign in to review squash requests." />
                    ) : !isAdmin ? (
                        <p className="admin-restricted">This page is restricted to admins.</p>
                    ) : (
                        <>
                            <div className="admin-form-hero">
                                <h1>🎾 Squash requests</h1>
                                <p>People who've signed in and asked to join the squash group.</p>
                            </div>
                            {error && <p className="admin-error">{error}</p>}
                            {requests === null && <p className="admin-users-loading">Loading...</p>}
                            {requests !== null && (
                                <>
                                    <h2 className="squash-requests-heading">Waiting ({pending.length})</h2>
                                    {pending.length === 0 ? (
                                        <p className="admin-users-loading">Nobody's waiting.</p>
                                    ) : (
                                        <div className="admin-users-grid">
                                            {pending.map((request) => (
                                                <PendingRequest
                                                    key={request.id}
                                                    request={request}
                                                    unlinked={unlinked}
                                                    busy={busyId === request.id}
                                                    onApprove={(approval) =>
                                                        review(request.id, () =>
                                                            squashApi.approveAccessRequest(request.id, approval)
                                                        )
                                                    }
                                                    onDecline={() =>
                                                        review(request.id, () =>
                                                            squashApi.declineAccessRequest(request.id)
                                                        )
                                                    }
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {reviewed.length > 0 && (
                                        <>
                                            <h2 className="squash-requests-heading">Reviewed</h2>
                                            <ul className="squash-requests-reviewed">
                                                {reviewed.map((request) => (
                                                    <li key={request.id}>
                                                        <span>{request.name || request.email || "Unnamed user"}</span>
                                                        <span className={`squash-requests-status ${request.status}`}>
                                                            {request.status}
                                                        </span>
                                                        <span className="squash-requests-date">
                                                            {formatDate(request.reviewed_at ?? request.created_at)}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
