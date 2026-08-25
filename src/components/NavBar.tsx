import React from "react"
import { Link, useLocation } from "react-router-dom"

import { useIsAdmin } from "../roles"
import "./NavBar.css"

const LINKS = [
    { to: "/go-heavier", label: "Go Heavier" },
    { to: "/about", label: "About" }
]

export default function NavBar() {
    const location = useLocation()
    const isAdmin = useIsAdmin()

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

                <div className="site-navbar-links">
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
            </div>
        </nav>
    )
}
