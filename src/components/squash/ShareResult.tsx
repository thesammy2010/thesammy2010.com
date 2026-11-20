import { useState } from "react"

import { Match, Player } from "./api"
import { resultSummary } from "./format"

/**
 * Shares a finished match's result and a link to its page: the phone's share
 * sheet where there is one, otherwise copied to the clipboard.
 */
export default function ShareResult({ match, players }: { match: Match; players: Player[] }) {
    const [notice, setNotice] = useState<string | null>(null)

    const share = async () => {
        const text = resultSummary(match, players)
        const url = `${window.location.origin}/squash/matches/${match.id}`
        setNotice(null)
        if (typeof navigator.share === "function") {
            try {
                await navigator.share({ title: "Squash result", text, url })
                return
            } catch (error) {
                // Closing the share sheet isn't a failure
                if ((error as Error).name === "AbortError") {
                    return
                }
            }
        }
        try {
            await navigator.clipboard.writeText(`${text}\n${url}`)
            setNotice("Copied the result and its link")
        } catch {
            setNotice("Couldn't share it here. Copy the page's address instead.")
        }
    }

    return (
        <span className="squash-share">
            <button type="button" className="squash-secondary-button" onClick={share}>
                🔗 Share result
            </button>
            {notice && (
                <span className="squash-muted" role="status">
                    {notice}
                </span>
            )}
        </span>
    )
}
