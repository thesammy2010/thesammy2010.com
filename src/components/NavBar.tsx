import React, { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"

import { useIsAdmin } from "../roles"
import SignIn, { ONE_TAP_ANCHOR_ID } from "./SignIn"
import "./NavBar.css"

const LINKS = [
    { to: "/go-heavier", label: "Go Heavier" },
    { to: "/about", label: "About" }
]

export default function NavBar() {
    const location = useLocation()
    const isAdmin = useIsAdmin()
    const [menuOpen, setMenuOpen] = useState(false)

    // A link tap should close the mobile menu rather than leave it open over
    // the page it just navigated to.
    useEffect(() => {
        setMenuOpen(false)
    }, [location.pathname])

    const isActive = (to: string) =>
        location.pathname === to || location.pathname.startsWith(`${to}/`)

    const links = isAdmin ? [...LINKS, { to: "/admin", label: "🔧 Admin" }] : LINKS

    return (
        <nav className="site-navbar">
            <div className="site-navbar-content">
                <Link to="/" className="site-brand">
                    <img
                        src={process.env.PUBLIC_URL + "/icons/logo.svg"}
                        alt="TheSammy2010 Logo"
                    />
                    <span className="site-brand-name">TheSammy2010</span>
                </Link>

                <button
                    type="button"
                    className="site-navbar-menu-toggle"
                    aria-label={menuOpen ? "Close menu" : "Open menu"}
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((open) => !open)}
                >
                    {menuOpen ? "✕" : "☰"}
                </button>

                <div className={`site-navbar-links ${menuOpen ? "open" : ""}`}>
                    {links.map(link => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={isActive(link.to) ? "active" : ""}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                <div id={ONE_TAP_ANCHOR_ID} className="one-tap-anchor">
                    <SignIn />
                </div>
            </div>
        </nav>
    )
}
