import React from "react"
import { Link } from "react-router-dom"

import "./About.css"

export default class About extends React.Component {
    render(): React.ReactNode {
        return (
            <div className="about-page">
                <header className="about-hero">
                    <h1>About this site</h1>
                    <p className="about-lead">
                        This site was created for me to learn React.
                    </p>
                </header>

                <section className="about-section">
                    <h2>What's here</h2>
                    <Link to="/go-heavier" className="about-card">
                        <span className="about-card-icon">💪</span>
                        <span className="about-card-body">
                            <span className="about-card-title">Go Heavier</span>
                            <span className="about-card-text">
                                A training log for the gym: the places I train, the exercises I
                                do, and every set I lift, charted over time.
                            </span>
                        </span>
                    </Link>
                </section>

                <section className="about-section">
                    <h2>Built with</h2>
                    <ul className="about-tags">
                        <li>React</li>
                        <li>TypeScript</li>
                        <li>React Router</li>
                    </ul>
                    <p className="about-note">
                        The source is on{" "}
                        <a
                            href="https://github.com/thesammy2010/thesammy2010.com"
                            target="_blank"
                            rel="noreferrer"
                        >
                            GitHub
                        </a>
                        .
                    </p>
                </section>
            </div>
        )
    }
}
