import { Link, useLocation } from "react-router-dom"
import "./NavBar.css"

export default function AdminNavBar() {
    const location = useLocation()
    const isActive = (to: string) => location.pathname === to

    return (
        <div className="admin-navbar">
            <div className="admin-navbar-content">
                <h1 className="admin-navbar-brand">🔧 Admin</h1>
                <nav className="admin-navbar-links">
                    <Link to="/admin" className={isActive("/admin") ? "active" : ""}>
                        🏠 Dashboard
                    </Link>
                    <Link to="/admin/provision" className={isActive("/admin/provision") ? "active" : ""}>
                        ➕ Provision
                    </Link>
                    <Link to="/admin/users" className={isActive("/admin/users") ? "active" : ""}>
                        👥 Users
                    </Link>
                </nav>
            </div>
        </div>
    )
}
