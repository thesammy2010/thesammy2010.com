import React, { useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"

import { useCanAccess, useIsAdmin } from "../roles"
import { useSquashAccess } from "./squash/api"
import SignIn from "./SignIn"
import "./NavBar.css"


export default function NavBar() {
    const location = useLocation()
    const isAdmin = useIsAdmin()
    // Go Heavier is admin-only for now, so like Finance it's only offered to
    // someone who can open it rather than to everyone who'd then be refused.
    const canSeeGoHeavier = useCanAccess("GET", "/go-heavier/sessions")
    // Finance is personal data and every /finance route is admin-only, so the
    // link only shows for someone who can open it.
    const canSeeFinance = useCanAccess("GET", "/finance/transactions")
    // Squash is for the group's players whatever their role, so it's shown
    // from membership rather than from the access map, and to anyone signed
    // in who isn't a player, since that's where they ask to join.
    const squashAccess = useSquashAccess().status
    const canSeeSquash = squashAccess === "member" || squashAccess === "denied"
    const [menuOpen, setMenuOpen] = useState(false)

    // A link tap should close the mobile menu rather than leave it open over
    // the page it just navigated to.
    useEffect(() => {
        setMenuOpen(false)
    }, [location.pathname])

    const isActive = (to: string) =>
        location.pathname === to || location.pathname.startsWith(`${to}/`)

    const links = [
        ...(canSeeGoHeavier ? [{ to: "/go-heavier", label: "Go Heavier" }] : []),
        ...(canSeeSquash ? [{ to: "/squash", label: "Squash" }] : []),
        ...(canSeeFinance ? [{ to: "/finance", label: "Finance" }] : []),
        { to: "/about", label: "About" },
        ...(isAdmin ? [{ to: "/admin", label: "🔧 Admin" }] : [])
    ]

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

                <SignIn />
            </div>
        </nav>
    )
}
