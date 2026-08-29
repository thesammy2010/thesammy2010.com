import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import "./NavBar.css"

const LINKS = [
    { to: "/admin", label: "🏠 Dashboard" },
    { to: "/admin/provision", label: "➕ Provision" },
    { to: "/admin/users", label: "👥 Users" }
]

export default function AdminNavBar() {
    const location = useLocation()
    const [menuOpen, setMenuOpen] = useState(false)
    const isActive = (to: string) => location.pathname === to

    // A link tap should close the mobile menu rather than leave it open over
    // the page it just navigated to.
    useEffect(() => {
        setMenuOpen(false)
    }, [location.pathname])

    return (
        <div className="admin-navbar">
            <div className="admin-navbar-content">
                <h1 className="admin-navbar-brand">🔧 Admin</h1>
                <button
                    type="button"
                    className="admin-navbar-menu-toggle"
                    aria-label={menuOpen ? "Close menu" : "Open menu"}
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((open) => !open)}
                >
                    {menuOpen ? "✕" : "☰"}
                </button>
                <nav className={`admin-navbar-links ${menuOpen ? "open" : ""}`}>
                    {LINKS.map((link) => (
                        <Link key={link.to} to={link.to} className={isActive(link.to) ? "active" : ""}>
                            {link.label}
                        </Link>
                    ))}
                </nav>
            </div>
        </div>
    )
}
