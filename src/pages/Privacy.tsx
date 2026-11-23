import React from "react"
import { Link } from "react-router-dom"

import "./Privacy.css"

const CONTACT = "contact@mail.thesammy2010.com"
const UPDATED = "23 November 2026"

// What's kept about someone who signs in, here or in How2Squash, and how to
// have it removed. Given to TestFlight and the App Store as How2Squash's
// privacy policy, at /privacy, so it's open to anyone.
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
                    You sign in with Google or with Apple. From Google, your email address is kept, along with the name
                    and account ID Google shares with it, so you're recognised next time. From Apple, the account ID
                    Apple gives this site is kept, with your email address and name if you choose to share them. If you
                    choose Hide My Email, only Apple's private relay address is kept, never your real one.
                </p>
                <p>Nothing's kept about you if you only look around without signing in.</p>
                <p>
                    If you play squash with the group, the matches you're in are kept too: who played, the scores, and
                    when and where. Everyone in the group can see them, as they can see their own, apart from private
                    matches, whose scores only their players and the group's admins see. If you ask to join the group,
                    your request and any message with it are kept for the admins to answer.
                </p>
                <p>
                    Others in the group also see your profile picture: the one from your Google account, or one you
                    choose in the app, which is kept as a small JPEG without the photo's location or other details. They
                    see what you write on matches too, and the admins see feedback you send and anything you report as
                    offensive. Who you've blocked is kept so their comments and picture stay hidden from you.
                </p>
                <p>
                    How2Squash's Apple Watch workouts go to Apple Health on your own phone. Heart rate, calories and
                    other health data never leave your devices.
                </p>
                <p>
                    Your browser keeps you signed in, along with copies of some lists so pages open quickly. Signing out
                    clears them. There's no analytics or tracking.
                </p>
                <p>Nothing's sold, shared with anyone else, or used for advertising.</p>
            </section>

            <section className="privacy-section">
                <h2>Deleting your account</h2>
                <p>
                    You can delete your account yourself once signed in, from Delete account on this site, or in
                    How2Squash under Account. That removes your sign-in details, your pictures, what you've written on
                    matches, feedback you've sent, anything you've reported, who you've blocked, and any request to
                    join. If you signed in with Apple, you can also stop this site using your Apple ID in your Apple
                    Account settings, under Sign in with Apple.
                </p>
                <p>
                    Matches you played in aren't deleted with it. They're part of other players' records and ratings
                    too, so removing them would change someone else's history. They stay under "Deleted user".
                </p>
            </section>

            <section className="privacy-section">
                <h2>Anything else</h2>
                <p>
                    To have your email address and name erased completely, to see what's kept about you, or for anything
                    else about your data, email <a href={`mailto:${CONTACT}?subject=Privacy`}>{CONTACT}</a>. For help
                    with How2Squash, see <Link to="/support">How2Squash support</Link>.
                </p>
            </section>
        </div>
    )
}
