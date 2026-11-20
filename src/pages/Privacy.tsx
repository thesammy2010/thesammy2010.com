import React from "react"

import "./Privacy.css"

const CONTACT = "contact@mail.thesammy2010.com"
const UPDATED = "20 November 2026"

// What's kept about someone who signs in, here or in How2Squash, and how to
// have it removed. Linked from the footer, and from TestFlight and the App
// Store as How2Squash's privacy policy, so it's open to anyone.
export default function Privacy() {
    return (
        <div className="privacy-page">
            <header className="privacy-hero">
                <h1>Privacy policy</h1>
                <p className="privacy-lead">For thesammy2010.com and the How2Squash app. Last updated {UPDATED}.</p>
            </header>

            <section className="privacy-section">
                <h2>What's kept</h2>
                <p>
                    You sign in with Google. From that, only your email address is kept, along with the name and account
                    ID Google shares with it, so you're recognised next time. Nothing's kept about you if you only look
                    around without signing in.
                </p>
                <p>
                    If you play squash with the group, the matches you're in are kept too: who played, the scores, and
                    when and where. Everyone in the group can see them, as they can see their own.
                </p>
                <p>
                    How2Squash's Apple Watch workouts go to Apple Health on your own phone. Heart rate, calories and
                    other health data never leave your devices.
                </p>
                <p>Nothing's sold, shared with anyone else, or used for advertising.</p>
            </section>

            <section className="privacy-section">
                <h2>Deleting your account</h2>
                <p>
                    You can delete your account yourself once signed in, from the Delete account option on this site.
                </p>
                <p>
                    Matches you played in aren't deleted with it. They're part of other players' records and ratings
                    too, so removing them would change someone else's history.
                </p>
            </section>

            <section className="privacy-section">
                <h2>Anything else</h2>
                <p>
                    To have your email address and name erased completely, to see what's kept about you, or for anything
                    else about your data, email <a href={`mailto:${CONTACT}?subject=Privacy`}>{CONTACT}</a>.
                </p>
            </section>
        </div>
    )
}
