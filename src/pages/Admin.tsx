import { Link } from "react-router-dom"

import { isSignedIn, useCanAccess, useIsAdmin } from "../roles"
import AdminNavBar from "../components/admin/NavBar"
import SignInPrompt from "../components/SignInPrompt"
import "./admin/AdminForms.css"
import "./Admin.css"

// Root-level, not under /go-heavier: admin tools here are expected to reach
// across the whole site, not just the go-heavier resources.
export default function Admin() {
    const isAdmin = useIsAdmin()
    const canProvision = useCanAccess("POST", "/admin/users")
    const canListUsers = useCanAccess("GET", "/admin/users")
    const canChangeRole = useCanAccess("PATCH", "/users/x/role")
    const canDelete = useCanAccess("DELETE", "/users/x")

    return (
        <div className="center-container-grid">
            <AdminNavBar />
            <div className="page-container">
                {isAdmin ? (
                    <div className="admin-dashboard">
                        <div className="admin-dashboard-hero">
                            <h1>🔧 Admin</h1>
                            <p>Manage who can use the site, and what they can do.</p>
                        </div>
                        <div className="admin-cards">
                            {canProvision && (
                                <Link to="/admin/provision" className="admin-card">
                                    <div className="admin-card-icon">➕</div>
                                    <div className="admin-card-content">
                                        <div className="admin-card-title">Provision a User</div>
                                        <p className="admin-card-caption">Set someone up before they've signed in</p>
                                    </div>
                                </Link>
                            )}
                            {(canListUsers || canChangeRole || canDelete) && (
                                <Link to="/admin/users" className="admin-card">
                                    <div className="admin-card-icon">👥</div>
                                    <div className="admin-card-content">
                                        <div className="admin-card-title">Users</div>
                                        <p className="admin-card-caption">Change a role, or remove someone's access</p>
                                    </div>
                                </Link>
                            )}
                        </div>
                    </div>
                ) : !isSignedIn() ? (
                    <SignInPrompt message="Sign in to view admin tools." />
                ) : (
                    <p className="admin-restricted">This page is restricted to admins.</p>
                )}
            </div>
        </div>
    )
}
