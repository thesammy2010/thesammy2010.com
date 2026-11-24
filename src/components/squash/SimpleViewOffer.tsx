import React from "react"

import { Match, Player } from "./api"
import { markSimpleViewOffered, setSimpleView, useSimpleView, useSimpleViewOffered } from "./simple"

/**
 * Asks once, on a finished match the person played in, whether they'd like
 * the simple view: after their first, or the first they open since this
 * came in. Either answer is kept, and it's changed any time from the menu.
 */
export default function SimpleViewOffer({ match, me }: { match: Match; me: Player | null }) {
    const simple = useSimpleView()
    const offered = useSimpleViewOffered()
    const played = match.status === "completed" && me !== null && match.players.some((p) => p.player_id === me.id)
    if (!played || offered || simple) {
        return null
    }
    return (
        <div className="squash-card squash-simple-offer" role="region" aria-label="Keep it simple?">
            <h4 className="squash-card-title">Keep it simple?</h4>
            <p className="squash-muted">
                There's a lot of detail after a match: graphs, rally by rally tables and point by point figures. The
                simple view shows just the scores, results and records. You can change it any time from the menu.
            </p>
            <div className="squash-simple-offer-actions">
                <button
                    type="button"
                    className="squash-primary-button"
                    onClick={() => {
                        setSimpleView(true)
                        markSimpleViewOffered()
                    }}
                >
                    Simple view
                </button>
                <button type="button" className="squash-secondary-button" onClick={markSimpleViewOffered}>
                    Show everything
                </button>
            </div>
        </div>
    )
}
