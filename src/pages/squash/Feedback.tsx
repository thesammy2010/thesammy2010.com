import React, { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"

import {
    AdminFeedback,
    Feedback as FeedbackItem,
    FeedbackKind,
    FeedbackStatus,
    squashApi,
    useSquashLoad
} from "../../components/squash/api"
import SquashPage from "../../components/squash/SquashPage"
import { formatWhen } from "../../components/squash/format"
import { clientLabel, FEEDBACK_KINDS, FEEDBACK_MAX } from "../../components/squash/feedback"
import { useCanAccess } from "../../roles"

const kindOf = (kind: FeedbackKind) => FEEDBACK_KINDS.find((k) => k.value === kind) ?? FEEDBACK_KINDS[2]

// One piece of feedback: what kind, when, its words and whether it's dealt
// with, plus who sent it and a way to resolve it for an admin.
function FeedbackRow({ item, onResolve }: { item: FeedbackItem | AdminFeedback; onResolve?: () => Promise<void> }) {
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const kind = kindOf(item.kind)
    const sender = "user_id" in item ? item.name || item.email || "Someone" : null

    const resolve = async () => {
        if (!onResolve) {
            return
        }
        setBusy(true)
        setError(null)
        try {
            await onResolve()
        } catch (err) {
            setError((err as Error).message)
            setBusy(false)
        }
    }

    return (
        <li className={`squash-feedback-item ${item.status}`}>
            <div className="squash-feedback-head">
                <span className="squash-game-tag">
                    {kind.icon} {kind.label}
                </span>
                <span className="squash-muted">
                    {sender && (
                        <>
                            <strong className="squash-feedback-sender">{sender}</strong> ·{" "}
                        </>
                    )}
                    {formatWhen(item.created_at)}
                </span>
                <span className={`squash-feedback-status ${item.status}`}>
                    {item.status === "resolved" ? "✓ Resolved" : "New"}
                </span>
            </div>
            <p className="squash-feedback-message">{item.message}</p>
            {(item.client || ("email" in item && item.email && item.name)) && (
                <p className="squash-muted squash-feedback-meta">
                    {"email" in item && item.email && item.name && <>{item.email} · </>}
                    {item.client}
                </p>
            )}
            {onResolve && item.status === "new" && (
                <button type="button" className="squash-secondary-button" onClick={resolve} disabled={busy}>
                    {busy ? "Resolving..." : "Mark resolved"}
                </button>
            )}
            {error && <p className="error-message">{error}</p>}
        </li>
    )
}

// Sending feedback: what kind, and what about it.
function SendFeedback({ onSent }: { onSent: (sent: FeedbackItem) => void }) {
    const [kind, setKind] = useState<FeedbackKind>("bug")
    const [message, setMessage] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [sent, setSent] = useState(false)

    const send = async (e: React.FormEvent) => {
        e.preventDefault()
        setBusy(true)
        setError(null)
        setSent(false)
        try {
            onSent(
                await squashApi.sendFeedback({
                    kind,
                    message: message.trim(),
                    client: clientLabel(navigator.userAgent)
                })
            )
            setMessage("")
            setSent(true)
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setBusy(false)
        }
    }

    return (
        <form className="squash-card squash-feedback-form" onSubmit={send}>
            <div className="squash-segmented" role="radiogroup" aria-label="Kind of feedback">
                {FEEDBACK_KINDS.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={kind === option.value}
                        className={kind === option.value ? "active" : ""}
                        onClick={() => setKind(option.value)}
                    >
                        {option.icon} {option.label}
                    </button>
                ))}
            </div>
            <label>
                <span>
                    {kind === "bug"
                        ? "What went wrong, and what were you doing?"
                        : kind === "idea"
                        ? "What would make it better?"
                        : "What's on your mind?"}
                </span>
                <textarea
                    className="squash-input"
                    value={message}
                    onChange={(e) => {
                        setMessage(e.target.value)
                        setSent(false)
                    }}
                    maxLength={FEEDBACK_MAX}
                    rows={5}
                    required
                />
            </label>
            <div className="squash-feedback-actions">
                <button type="submit" className="squash-primary-button" disabled={busy || !message.trim()}>
                    {busy ? "Sending..." : "Send to the admins"}
                </button>
                <span className="squash-muted">
                    {message.length > FEEDBACK_MAX - 200 && `${FEEDBACK_MAX - message.length} characters left`}
                </span>
                {sent && (
                    <span className="squash-feedback-sent" role="status">
                        Thanks, it's been sent.
                    </span>
                )}
            </div>
            {error && <p className="error-message">{error}</p>}
        </form>
    )
}

// Everyone's feedback, for an admin, by status and kind.
function AllFeedback() {
    const [status, setStatus] = useState<FeedbackStatus | "">("new")
    const [kind, setKind] = useState<FeedbackKind | "">("")
    const [items, setItems] = useState<AdminFeedback[] | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        setItems(null)
        setError(null)
        squashApi.allFeedback({ status: status || undefined, kind: kind || undefined }).then(
            (found) => !cancelled && setItems(found),
            (err) => !cancelled && setError((err as Error).message)
        )
        return () => {
            cancelled = true
        }
    }, [status, kind])

    return (
        <>
            <div className="squash-filters">
                <select
                    className="squash-input"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as FeedbackStatus | "")}
                    aria-label="Status"
                >
                    <option value="new">New</option>
                    <option value="resolved">Resolved</option>
                    <option value="">Any status</option>
                </select>
                <select
                    className="squash-input"
                    value={kind}
                    onChange={(e) => setKind(e.target.value as FeedbackKind | "")}
                    aria-label="Kind"
                >
                    <option value="">Any kind</option>
                    {FEEDBACK_KINDS.map((k) => (
                        <option key={k.value} value={k.value}>
                            {k.label}
                        </option>
                    ))}
                </select>
            </div>
            {error && <p className="error-message">{error}</p>}
            {items === null && !error && <p className="squash-muted">Loading feedback...</p>}
            {items?.length === 0 && (
                <div className="squash-card squash-empty">
                    <p>{status === "new" ? "Nothing new. All caught up." : "No feedback matches."}</p>
                </div>
            )}
            {items && items.length > 0 && (
                <ul className="squash-feedback-list">
                    {items.map((item) => (
                        <FeedbackRow
                            key={item.id}
                            item={item}
                            onResolve={async () => {
                                const resolved = await squashApi.resolveFeedback(item.id)
                                setItems((prev) =>
                                    (prev ?? [])
                                        .map((i) => (i.id === resolved.id ? resolved : i))
                                        // Out of a list of new ones once it's dealt with
                                        .filter((i) => !status || i.status === status)
                                )
                            }}
                        />
                    ))}
                </ul>
            )}
        </>
    )
}

// Feedback for the admins: a bug, an idea or anything else, and what you've
// sent before with whether it's been dealt with. Admins also get everyone's,
// to resolve.
export default function Feedback() {
    const isAdmin = useCanAccess("POST", "/squash/players")
    const [searchParams, setSearchParams] = useSearchParams()
    const view = isAdmin && searchParams.get("view") === "all" ? "all" : "mine"

    const { state, setState, refreshing, reload } = useSquashLoad<FeedbackItem[]>(() => squashApi.myFeedback(), [])

    const setView = (next: "mine" | "all") => {
        const params = new URLSearchParams(searchParams)
        if (next === "all") {
            params.set("view", "all")
        } else {
            params.delete("view")
        }
        setSearchParams(params, { replace: true })
    }

    return (
        <SquashPage state={state} refreshing={refreshing} onRefresh={reload} what="Feedback">
            {(mine) => (
                <>
                    <div className="squash-header">
                        <h2 className="squash-title">Feedback</h2>
                    </div>
                    <p className="squash-muted">
                        Found a bug, or got an idea? It goes straight to the admins, and you can see here when it's been
                        dealt with.
                    </p>

                    {isAdmin && (
                        <div className="squash-segmented" role="radiogroup" aria-label="Whose feedback">
                            {(["mine", "all"] as const).map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    role="radio"
                                    aria-checked={view === option}
                                    className={view === option ? "active" : ""}
                                    onClick={() => setView(option)}
                                >
                                    {option === "mine" ? "Send" : "Everyone's"}
                                </button>
                            ))}
                        </div>
                    )}

                    {view === "all" ? (
                        <AllFeedback />
                    ) : (
                        <>
                            <SendFeedback
                                onSent={(sent) =>
                                    setState((prev) =>
                                        prev.status === "ready" ? { ...prev, data: [sent, ...prev.data] } : prev
                                    )
                                }
                            />
                            {mine.length > 0 && (
                                <section className="squash-home-section">
                                    <h3 className="squash-section-title">What you've sent</h3>
                                    <ul className="squash-feedback-list">
                                        {mine.map((item) => (
                                            <FeedbackRow key={item.id} item={item} />
                                        ))}
                                    </ul>
                                </section>
                            )}
                        </>
                    )}
                </>
            )}
        </SquashPage>
    )
}
