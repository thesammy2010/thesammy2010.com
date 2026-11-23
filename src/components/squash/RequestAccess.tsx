import React, { useEffect, useState } from "react"

import { AccessRequest, recheckSquashAccess, squashApi } from "./api"

function formatDate(value: string): string {
    return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

// What someone signed in who isn't a player sees instead of squash: a way to
// ask an admin to let them in, and where that's got to. An approved request
// only shows once they check again, since checking on its own would go round
// in circles for someone approved and later taken out of the group.
export default function RequestAccess() {
    // undefined while loading, null when they've not asked
    const [request, setRequest] = useState<AccessRequest | null | undefined>(undefined)
    const [message, setMessage] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const load = () =>
        squashApi.myAccessRequest().then(setRequest, (err) => {
            setRequest(null)
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
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setBusy(false)
        }
    }

    const ask = (e: React.FormEvent) => {
        e.preventDefault()
        void run(async () => {
            const made = await squashApi.requestAccess(message.trim() || null)
            setRequest(made)
            setMessage("")
            // Let in at once, as while the app's with App Review: in to the group
            if (made.status === "approved") {
                recheckSquashAccess()
            }
        })
    }

    const withdraw = () =>
        run(async () => {
            await squashApi.withdrawAccessRequest()
            setRequest(null)
        })

    const checkAgain = () =>
        run(async () => {
            const latest = await squashApi.myAccessRequest()
            setRequest(latest)
            if (latest?.status === "approved") {
                recheckSquashAccess()
            }
        })

    // Someone approved before but no longer in the group asks afresh
    const asking = request === null || request?.status === "approved"

    return (
        <div className="squash-card squash-request-access">
            <h2 className="squash-card-title">Join the squash group</h2>
            {request === undefined && <p className="squash-muted">Loading...</p>}

            {asking && (
                <form className="squash-request-form" onSubmit={ask}>
                    <p className="squash-muted">
                        Squash is for the group's players. Ask to join and an admin will add you.
                    </p>
                    <textarea
                        className="squash-input"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Anything they should know, such as who you play with (optional)"
                        maxLength={500}
                        rows={3}
                        aria-label="Message"
                    />
                    <button type="submit" className="squash-primary-button" disabled={busy}>
                        {busy ? "Sending..." : "Ask to join"}
                    </button>
                </form>
            )}

            {request?.status === "pending" && (
                <>
                    <p className="squash-muted">
                        You asked to join on {formatDate(request.created_at)}. An admin will look at it soon.
                    </p>
                    {request.message && <blockquote className="squash-request-message">{request.message}</blockquote>}
                    <div className="squash-request-actions">
                        <button type="button" className="squash-primary-button" disabled={busy} onClick={checkAgain}>
                            Check again
                        </button>
                        <button type="button" className="squash-secondary-button" disabled={busy} onClick={withdraw}>
                            Withdraw request
                        </button>
                    </div>
                </>
            )}

            {request?.status === "declined" && (
                <>
                    <p className="squash-muted">
                        An admin declined your request
                        {request.reviewed_at ? ` on ${formatDate(request.reviewed_at)}` : ""}. You can clear it and ask
                        again.
                    </p>
                    <div className="squash-request-actions">
                        <button type="button" className="squash-secondary-button" disabled={busy} onClick={withdraw}>
                            Clear and ask again
                        </button>
                    </div>
                </>
            )}

            {error && <p className="error-message">{error}</p>}
        </div>
    )
}
