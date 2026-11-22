import React from "react"
import { Link } from "react-router-dom"

import SquashNavBar from "../../components/squash/NavBar"
import "../GoHeavier.css"
import "../../components/squash/Squash.css"

const SECTIONS: { title: string; tips: { icon: string; text: React.ReactNode }[] }[] = [
    {
        title: "Arranging a match",
        tips: [
            { icon: "➕", text: "Tap New match on Home or Matches and pick the players. You're filled in already." },
            {
                icon: "♾️",
                text: "New matches are open-ended, played until you stop. Pick best of 3 or 5 for a fixed length."
            },
            { icon: "📍", text: "Pick where it's played. An admin can add a venue straight from the form." }
        ]
    },
    {
        title: "Scoring it live",
        tips: [
            { icon: "👆", text: "Open the match and tap the side that won each rally. Undo takes back the last one." },
            {
                icon: "🎾",
                text: "The sides take turns to serve first in each game, starting from a spin of the racket. Tap Change before a game's first point if the other side serves first. The serving side shows which box to serve from: their usual box to start each hand, then across after each point won. Tap Switch box if the server chose the other one."
            },
            {
                icon: "✋",
                text: "For an appeal, use Let, Stroke or No let under the side that appealed: a let replays the rally, a stroke is their point, a no let their opponent's."
            },
            { icon: "🔢", text: "Played a game without tapping each rally? Enter its score instead, below the games." },
            {
                icon: "🏁",
                text: "End a match where it stands once a game's been won. A best-of match ended early becomes open-ended."
            },
            { icon: "📱", text: "Several phones can score the same match. Anyone else sees it update as it's played." }
        ]
    },
    {
        title: "Afterwards",
        tips: [
            {
                icon: "🔒",
                text: "Finished matches are locked so a stray tap can't change a result. Tap Edit to change one."
            },
            { icon: "📈", text: "Tap a game's number for its point by point, stats and every rally." },
            { icon: "🔗", text: "Share a result, with a link to its page, from the finished match." },
            {
                icon: "🏅",
                text: (
                    <>
                        Everyone starts on 1000 Elo, singles and doubles apart, and every game you win or lose moves it.
                        Beating someone rated higher moves you further. See the ladder on{" "}
                        <Link to="/squash/stats">Stats</Link>, and <Link to="/squash/elo">how Elo works</Link>.
                    </>
                )
            },
            { icon: "🔔", text: "Home shows your matches added, finished or changed since you last looked." }
        ]
    }
]

// How the squash pages are meant to be used, from arranging a match to
// what's kept after it. Open to anyone, signed in or not.
export default function SquashHowItWorks() {
    return (
        <div className="center-container-grid">
            <SquashNavBar />
            <div className="page-container">
                <div className="squash-header">
                    <Link className="squash-link" to="/squash">
                        ← Home
                    </Link>
                </div>
                <h2 className="squash-title">How it works</h2>
                {SECTIONS.map((section) => (
                    <div key={section.title} className="squash-card">
                        <h4 className="squash-card-title">{section.title}</h4>
                        <ul className="squash-howto">
                            {section.tips.map((tip, i) => (
                                <li key={i}>
                                    <span className="squash-howto-icon" aria-hidden="true">
                                        {tip.icon}
                                    </span>
                                    <span>{tip.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    )
}
