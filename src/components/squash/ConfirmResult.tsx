import { useState } from "react"

import { Match, Player, squashApi, StaleMatchError } from "./api"
import { formatWhen, sideNames } from "./format"

// A result waiting on a side to confirm it, so one side can't give a rogue
// score alone: who it's waiting on, and for someone on that side, or an
// admin, Confirm or Dispute.
export default function ConfirmResult({
    match,
    players,
    onMatch
}: {
    match: Match
    players: Player[]
    onMatch: (match: Match) => void
}) {
    const [busy, setBusy] = useState(false)
    const [disputing, setDisputing] = useState(false)
    const [reason, setReason] = useState("")
    const [notice, setNotice] = useState<string | null>(null)

    if (match.confirmation !== "pending" && match.confirmation !== "disputed") {
        return null
    }
    const waitingOn = (match.awaiting_sides ?? []).map((side) => sideNames(match, side, players)).join(" and ")

    const run = async (action: () => Promise<Match>) => {
        setBusy(true)
        setNotice(null)
        try {
            onMatch(await action())
            setDisputing(false)
        } catch (error) {
            if (error instanceof StaleMatchError) {
                onMatch(error.match)
                setNotice("The result changed just now. Check it and try again.")
            } else {
                setNotice((error as Error).message)
            }
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className={`squash-card squash-confirm ${match.confirmation === "disputed" ? "disputed" : ""}`}>
            <h4 className="squash-card-title">
                {match.confirmation === "disputed" ? "⚠️ Result disputed" : "⏳ Waiting to be confirmed"}
            </h4>
            <p className="squash-muted">
                {match.confirmation === "disputed"
                    ? `It won't count until it's corrected or ${waitingOn} confirm it.`
                    : `It counts once ${waitingOn} confirm it` +
                      (match.confirms_at ? `, or anyway from ${formatWhen(match.confirms_at)}.` : ".")}
            </p>
            {match.can_confirm && !disputing && (
                <div className="squash-confirm-actions">
                    <button
                        type="button"
                        className="squash-primary-button"
                        disabled={busy}
                        onClick={() => void run(() => squashApi.confirmResult(match.id, match.version))}
                    >
                        ✓ Confirm the result
                    </button>
                    {match.confirmation === "pending" && (
                        <button
                            type="button"
                            className="squash-secondary-button"
                            disabled={busy}
                            onClick={() => setDisputing(true)}
                        >
                            Dispute it
                        </button>
                    )}
                </div>
            )}
            {disputing && (
                <form
                    className="squash-confirm-dispute"
                    onSubmit={(event) => {
                        event.preventDefault()
                        void run(() => squashApi.disputeResult(match.id, match.version, reason.trim() || null))
                    }}
                >
                    <label htmlFor="squash-dispute-reason">What's wrong with it?</label>
                    <textarea
                        id="squash-dispute-reason"
                        className="squash-input"
                        value={reason}
                        maxLength={1000}
                        rows={3}
                        placeholder="Such as: game 2 was 11-9 to us"
                        onChange={(event) => setReason(event.target.value)}
                    />
                    <div className="squash-confirm-actions">
                        <button type="submit" className="squash-danger-button" disabled={busy}>
                            Dispute the result
                        </button>
                        <button
                            type="button"
                            className="squash-secondary-button"
                            disabled={busy}
                            onClick={() => setDisputing(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}
            {notice && <p className="squash-inline-error">{notice}</p>}
        </div>
    )
}
