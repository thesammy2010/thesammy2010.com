import { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import "../go_heavier/NavBar.css"
import "./Finance.css"

const LINKS = [
    { to: "/finance", label: "🏠 Overview", exact: true },
    { to: "/finance/transactions", label: "🧾 Transactions", exact: false },
    { to: "/finance/insights", label: "📈 Insights", exact: true },
    { to: "/finance/budgets", label: "🎯 Budgets", exact: true },
    { to: "/finance/manage", label: "⚙️ Manage", exact: true }
]

// The Go Heavier nav bar's layout under its own colours, so the two sections
// read as siblings rather than the same place.
export default function FinanceNavBar() {
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
        <div className="go-heavier-navbar finance-navbar">
            <div className="navbar-content">
                <h1 className="navbar-brand">💷 Finance</h1>
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
