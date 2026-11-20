import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import "../go_heavier/NavBar.css"
import "./Squash.css"

const LINKS = [
    { to: "/squash", label: "🏠 Home" },
    { to: "/squash/matches", label: "🏆 Matches" },
    { to: "/squash/players", label: "👥 Players" },
    { to: "/squash/stats", label: "📊 Stats" }
]

// The Go Heavier nav bar's layout under its own colours.
export default function SquashNavBar() {
    const location = useLocation()
    const [menuOpen, setMenuOpen] = useState(false)

    // A link tap should close the mobile menu rather than leave it open over
    // the page it just navigated to.
    useEffect(() => {
        setMenuOpen(false)
    }, [location.pathname])

    const path = location.pathname
    // Home is only itself; the rest include the pages under them
    const isActive = (link: (typeof LINKS)[number]) =>
        link.to === "/squash" ? path === "/squash" : path === link.to || path.startsWith(`${link.to}/`)

    return (
        <div className="go-heavier-navbar squash-navbar">
            <div className="navbar-content">
                <h1 className="navbar-brand">🎾 Squash</h1>
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
                        <Link key={link.to} to={link.to} className={isActive(link) ? "active" : ""}>
                            {link.label}
                        </Link>
                    ))}
                </nav>
            </div>
        </div>
    )
}
