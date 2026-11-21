import React from "react"
import { Link } from "react-router-dom"

import { useCanAccess } from "../roles"
import { useSquashAccess } from "../components/squash/api"
import "./About.css"

const WEBSITE_STACK = ["React", "TypeScript", "React Router", "Google Sign-In", "GitHub Pages"]
const API_STACK = ["Python", "FastAPI", "SQLModel", "PostgreSQL", "Alembic", "Fly.io"]

export default function About() {
    // Finance is personal data behind an admin-only API, so it's only
    // mentioned to someone who can open it, the same rule as the nav link.
    const canSeeFinance = useCanAccess("GET", "/finance/transactions")
    // Go Heavier is admin-only for now too.
    const canSeeGoHeavier = useCanAccess("GET", "/go-heavier/sessions")
    // Squash is for the group's players, so it's shown to them alone too.
    const canSeeSquash = useSquashAccess().status === "member"

    return (
        <div className="about-page">
            <header className="about-hero">
                <h1>About this site</h1>
                <p className="about-lead">
                    This site was created for me to learn React. It has since grown into the place I keep track of
                    things, backed by an API of its own.
                </p>
            </header>

            <section className="about-section">
                <h2>What's here</h2>
                {!canSeeGoHeavier && !canSeeSquash && !canSeeFinance && (
                    <p className="about-note">
                        Each section here is private to the people it's for. Sign in to see the ones you can use.
                    </p>
                )}
                <div className="about-cards">
                    {canSeeGoHeavier && (
                        <Link to="/go-heavier" className="about-card">
                            <span className="about-card-icon">💪</span>
                            <span className="about-card-body">
                                <span className="about-card-title">Go Heavier</span>
                                <span className="about-card-text">
                                    A training log for the gym: the places I train, the exercises I do, and every set I
                                    lift, charted over time.
                                </span>
                            </span>
                        </Link>
                    )}
                    {canSeeSquash && (
                        <Link to="/squash" className="about-card">
                            <span className="about-card-icon">🎾</span>
                            <span className="about-card-body">
                                <span className="about-card-title">Squash</span>
                                <span className="about-card-text">
                                    Matches with friends, scored point by point from a phone at the court, with
                                    everyone's record and head-to-heads.
                                </span>
                            </span>
                        </Link>
                    )}
                    {canSeeFinance && (
                        <Link to="/finance" className="about-card">
                            <span className="about-card-icon">💷</span>
                            <span className="about-card-body">
                                <span className="about-card-title">Finance</span>
                                <span className="about-card-text">
                                    Where the money goes: every spend, each month against its budget, and a forecast for
                                    the month in progress.
                                </span>
                            </span>
                        </Link>
                    )}
                </div>
            </section>

            <section className="about-section">
                <h2>Built with</h2>
                <h3 className="about-subheading">Website</h3>
                <ul className="about-tags">
                    {WEBSITE_STACK.map((tag) => (
                        <li key={tag}>{tag}</li>
                    ))}
                </ul>
                <h3 className="about-subheading">API</h3>
                <ul className="about-tags">
                    {API_STACK.map((tag) => (
                        <li key={tag}>{tag}</li>
                    ))}
                </ul>
                <p className="about-note">
                    The source for both is on GitHub:{" "}
                    <a href="https://github.com/thesammy2010/thesammy2010.com" target="_blank" rel="noreferrer">
                        the website
                    </a>{" "}
                    and{" "}
                    <a href="https://github.com/thesammy2010/api.thesammy2010.com" target="_blank" rel="noreferrer">
                        the API
                    </a>
                    .
                </p>
            </section>

            <section className="about-section">
                <h2>Privacy and contact</h2>
                <p className="about-note">
                    What's kept about you when you sign in, here or in How2Squash, and how to have it removed, is in the{" "}
                    <Link to="/privacy">privacy policy</Link>. For anything else, email{" "}
                    <a href="mailto:contact@mail.thesammy2010.com?subject=Hey, I saw your website">
                        contact@mail.thesammy2010.com
                    </a>
                    .
                </p>
            </section>
        </div>
    )
}
