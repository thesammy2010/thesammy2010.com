import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import "./NavBar.css"

const LINKS = [
    { to: "/go-heavier", label: "🏠 Dashboard", exact: true },
    { to: "/go-heavier/locations", label: "📍 Locations", exact: false },
    { to: "/go-heavier/exercises", label: "🏋️ Exercises", exact: false },
    { to: "/go-heavier/sessions", label: "🗓️ Sessions", exact: false },
    { to: "/go-heavier/stats", label: "📈 Stats", exact: true },
    { to: "/go-heavier/workouts", label: "📋 Workouts", exact: true }
]

export default function GoHeavierNavBar() {
    const location = useLocation()
    const [menuOpen, setMenuOpen] = useState(false)

    // A link tap should close the mobile menu rather than leave it open over
    // the page it just navigated to.
    useEffect(() => {
        setMenuOpen(false)
    }, [location.pathname])

    const isActive = (to: string, exact: boolean) =>
        exact ? location.pathname === to : location.pathname === to || location.pathname.startsWith(`${to}/`)

    return (
        <div className="go-heavier-navbar">
            <div className="navbar-content">
                <h1 className="navbar-brand">💪 Go Heavier</h1>
                <button
                    type="button"
                    className="navbar-menu-toggle"
                    aria-label={menuOpen ? "Close menu" : "Open menu"}
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((open) => !open)}
                >
                    {menuOpen ? "✕" : "☰"}
                </button>
                <nav className={`navbar-links ${menuOpen ? "open" : ""}`}>
                    {LINKS.map((link) => (
                        <Link key={link.to} to={link.to} className={isActive(link.to, link.exact) ? "active" : ""}>
                            {link.label}
                        </Link>
                    ))}
                </nav>
            </div>
        </div>
    )
}
