import { useIsAdmin } from "../roles"
import "./Admin.css"

// Root-level, not under /go-heavier: admin tools here are expected to reach
// across the whole site, not just the go-heavier resources.
export default function Admin() {
    const isAdmin = useIsAdmin()

    return (
        <div className="admin-page">
            <header className="admin-hero">
                <h1>🔧 Admin</h1>
            </header>

            {isAdmin ? (
                <p className="admin-lead">Admin tools live here. Nothing built yet.</p>
            ) : (
                <p className="admin-restricted">This page is restricted to admins.</p>
            )}
        </div>
    )
}
