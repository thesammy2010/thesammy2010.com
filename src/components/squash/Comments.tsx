import React, { FormEvent, useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { ApiError } from "../../configs"
import { useIsAdmin, useOwnUserId } from "../../roles"
import { Comment, COMMENT_MAX, Match, squashApi } from "./api"
import { formatWhen } from "./format"

interface Props {
    match: Match
    // On a game's page, only what's said about it, and new comments are about
    // it too. Left out, the whole match's, each game's marked and linked.
    game?: number
}

// One comment: who said it and when, and for whoever said it, Edit and
// Delete. An admin can delete anyone's.
function CommentItem({
    comment,
    match,
    showGame,
    onChange,
    onDelete
}: {
    comment: Comment
    match: Match
    showGame: boolean
    onChange: (comment: Comment) => void
    onDelete: () => void
}) {
    const ownUserId = useOwnUserId()
    const isAdmin = useIsAdmin()
    const [editing, setEditing] = useState<string | null>(null)
    const [confirming, setConfirming] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const mine = ownUserId !== null && comment.user_id === ownUserId

    const run = async (action: () => Promise<void>) => {
        setBusy(true)
        setError(null)
        try {
            await action()
        } catch (e) {
            setError((e as Error).message)
        } finally {
            setBusy(false)
        }
    }

    const save = (e: FormEvent) => {
        e.preventDefault()
        void run(async () => {
            onChange(await squashApi.editComment(match.id, comment.id, (editing ?? "").trim()))
            setEditing(null)
        })
    }

    return (
        <li className="squash-comment">
            <div className="squash-comment-head">
                <strong>{comment.author ?? "Someone"}</strong>
                <span className="squash-muted">
                    {formatWhen(comment.created_at)}
                    {comment.edited_at && " · edited"}
                </span>
                {showGame && comment.game !== null && (
                    <Link className="squash-game-tag" to={`/squash/matches/${match.id}/games/${comment.game}`}>
                        Game {comment.game}
                    </Link>
                )}
            </div>
            {editing !== null ? (
                <form className="squash-comment-form" onSubmit={save}>
                    <textarea
                        className="squash-input"
                        value={editing}
                        onChange={(e) => setEditing(e.target.value)}
                        maxLength={COMMENT_MAX}
                        rows={3}
                        aria-label="Edit your comment"
                        autoFocus
                    />
                    <div className="squash-comment-actions">
                        <button type="submit" className="squash-primary-button" disabled={busy || !editing.trim()}>
                            Save
                        </button>
                        <button type="button" className="squash-text-button" onClick={() => setEditing(null)}>
                            Cancel
                        </button>
                    </div>
                </form>
            ) : (
                <p className="squash-comment-body">{comment.body}</p>
            )}
            {editing === null && (mine || isAdmin) && (
                <div className="squash-comment-actions">
                    {mine && (
                        <button type="button" className="squash-text-button" onClick={() => setEditing(comment.body)}>
                            Edit
                        </button>
                    )}
                    {confirming ? (
                        <span className="squash-confirm">
                            Delete {mine ? "your" : "this"} comment?
                            <button
                                type="button"
                                className="squash-secondary-button"
                                onClick={() => setConfirming(false)}
                            >
                                No
                            </button>
                            <button
                                type="button"
                                className="squash-primary-button"
                                disabled={busy}
                                onClick={() =>
                                    void run(async () => {
                                        await squashApi.deleteComment(match.id, comment.id)
                                        onDelete()
                                    })
                                }
                            >
                                Delete
                            </button>
                        </span>
                    ) : (
                        <button type="button" className="squash-text-button" onClick={() => setConfirming(true)}>
                            Delete
                        </button>
                    )}
                </div>
            )}
            {error && <p className="error-message">{error}</p>}
        </li>
    )
}

// What people have said about a match or one of its games, oldest first,
// and a box to add to it. Loaded apart from the page, so it never holds it
// up; from an API without comments yet, nothing shows.
export default function Comments({ match, game }: Props) {
    const [comments, setComments] = useState<Comment[] | null>(null)
    const [unavailable, setUnavailable] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [body, setBody] = useState("")
    // On the match's page, which game a new comment is about, if any
    const [about, setAbout] = useState<number | null>(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        squashApi.comments(match.id).then(
            (found) => !cancelled && setComments(found),
            (e) => {
                if (cancelled) {
                    return
                }
                if (e instanceof ApiError && e.status === 404) {
                    setUnavailable(true)
                } else {
                    setLoadError((e as Error).message)
                }
            }
        )
        return () => {
            cancelled = true
        }
    }, [match.id])

    if (unavailable) {
        return null
    }

    const shown = (comments ?? []).filter((c) => game === undefined || c.game === game)
    const target = game ?? about

    const send = async (e: FormEvent) => {
        e.preventDefault()
        setBusy(true)
        setError(null)
        try {
            const added = await squashApi.addComment(match.id, body.trim(), target)
            setComments([...(comments ?? []), added])
            setBody("")
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setBusy(false)
        }
    }

    return (
        <section className="squash-card" aria-label="Comments">
            <h4 className="squash-card-title">
                Comments{shown.length > 0 && <span className="squash-muted"> · {shown.length}</span>}
            </h4>
            {comments === null && !loadError && <p className="squash-muted">Loading comments...</p>}
            {loadError && <p className="error-message">{loadError}</p>}
            {comments !== null && shown.length === 0 && (
                <p className="squash-muted">Nothing said about this {game === undefined ? "match" : "game"} yet.</p>
            )}
            {shown.length > 0 && (
                <ul className="squash-comments">
                    {shown.map((comment) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            match={match}
                            showGame={game === undefined}
                            onChange={(next) => setComments((comments ?? []).map((c) => (c.id === next.id ? next : c)))}
                            onDelete={() => setComments((comments ?? []).filter((c) => c.id !== comment.id))}
                        />
                    ))}
                </ul>
            )}
            {comments !== null && (
                <form className="squash-comment-form" onSubmit={send}>
                    <textarea
                        className="squash-input"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        maxLength={COMMENT_MAX}
                        rows={3}
                        placeholder={
                            game === undefined ? "Say something about the match" : `Say something about game ${game}`
                        }
                        aria-label="Your comment"
                    />
                    <div className="squash-comment-actions">
                        {game === undefined && match.games.length > 0 && (
                            <select
                                className={`squash-pill ${about !== null ? "squash-pill-set" : ""}`}
                                value={about ?? ""}
                                onChange={(e) => setAbout(e.target.value ? Number(e.target.value) : null)}
                                aria-label="About"
                            >
                                <option value="">The whole match</option>
                                {match.games.map((g) => (
                                    <option key={g.number} value={g.number}>
                                        Game {g.number}
                                    </option>
                                ))}
                            </select>
                        )}
                        <button type="submit" className="squash-primary-button" disabled={busy || !body.trim()}>
                            {busy ? "Posting..." : "Post"}
                        </button>
                        {body.length > COMMENT_MAX - 200 && (
                            <span className="squash-muted">{COMMENT_MAX - body.length} characters left</span>
                        )}
                    </div>
                    {error && <p className="error-message">{error}</p>}
                </form>
            )}
        </section>
    )
}
