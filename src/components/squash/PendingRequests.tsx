import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { useCanAccess } from "../../roles"
import { squashApi } from "./api"

// For admins on the squash pages: how many people are waiting to join,
// linking to the admin page that reviews them. Nothing when no one is, or
// for anyone else.
export default function PendingRequests() {
    // Only admins review requests to join
    const isAdmin = useCanAccess("POST", "/squash/players")
    const [waiting, setWaiting] = useState(0)

    useEffect(() => {
        if (!isAdmin) {
            return
        }
        let cancelled = false
        squashApi.accessRequests("pending").then(
            (requests) => !cancelled && setWaiting(requests.length),
            // A banner that fails to load is no worse than none
            () => undefined
        )
        return () => {
            cancelled = true
        }
    }, [isAdmin])

    if (!isAdmin || waiting === 0) {
        return null
    }
    return (
        <Link className="squash-card squash-asking" to="/admin/squash-requests">
            🙋 {waiting} {waiting === 1 ? "person is" : "people are"} asking to join. Review{" "}
            {waiting === 1 ? "it" : "them"} →
        </Link>
    )
}
