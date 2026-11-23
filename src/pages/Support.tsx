import React from "react"
import { Link } from "react-router-dom"

import "./Privacy.css"

export const SUPPORT_EMAIL = "how2squash@mail.thesammy2010.com"

// How2Squash's support page, given to the App Store as its support URL: how
// to get help, how the app works, keeping safe, and your account and data.
// Open to anyone, signed in or not, as Apple asks.
export default function Support() {
    const mail = (subject: string) => `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`
    return (
        <div className="privacy-page">
            <header className="privacy-hero">
                <h1>How2Squash support</h1>
                <p className="privacy-lead">
                    How2Squash is an iPhone and Apple Watch app for a group of friends who play squash: arranging
                    matches, scoring them point by point, and keeping everyone's results, ratings and head-to-heads.
                </p>
            </header>

            <section className="privacy-section">
                <h2>Getting help</h2>
                <p>
                    Email <a href={mail("How2Squash help")}>{SUPPORT_EMAIL}</a> with anything: a question, a problem, or
                    an idea. You'll usually hear back within a couple of days. Once you're in the group you can also
                    send feedback from the app, under Account.
                </p>
            </section>

            <section className="privacy-section">
                <h2>Getting started</h2>
                <ol>
                    <li>Sign in with Apple or Google.</li>
                    <li>
                        If you aren't in the group yet, tap <strong>Ask to join</strong>, with a message saying who you
                        play with. An admin lets you in.
                    </li>
                    <li>
                        Arrange a match, or start one, with the <strong>+</strong> on the Squash tab, or from your
                        watch: New match, then Singles or Doubles.
                    </li>
                </ol>
            </section>

            <section className="privacy-section">
                <h2>Questions</h2>
                <h3>How do I score a match?</h3>
                <p>
                    Open the match and tap <strong>Score it live</strong>, then tap the side that won each rally. On the
                    watch, tap a side, or double tap with your watch hand for your own point. For an appeal, use{" "}
                    <strong>Let or stroke</strong> on the phone, or hold a side on the watch. Points scored on several
                    phones or watches at once all add to the same match.
                </p>
                <h3>Why does a result say "Awaiting confirmation"?</h3>
                <p>
                    So no one can give a score alone, a result only counts towards ratings and records once both sides
                    have confirmed it. If both sides scored points during the match, that happens as it ends. Otherwise
                    the other side confirms it on the match page, or disputes it if it's wrong. A result no one confirms
                    counts anyway after three days, unless it's disputed.
                </p>
                <h3>Which service box do I serve from?</h3>
                <p>
                    The scorer shows it, and every phone and watch scoring the match shows the same one. Each hand
                    starts in the box you prefer, which you set on your own player page, and <strong>Switch box</strong>{" "}
                    changes it before you've won a point in the hand. A match can be set not to track the boxes.
                </p>
                <h3>Can I follow a match from my Lock Screen?</h3>
                <p>
                    Yes. Opening a match being played, or scoring it, puts the score on your Lock Screen and in the
                    Dynamic Island. It stays out of the way while you're scoring from your watch.
                </p>
                <h3>How do I change my name or picture?</h3>
                <p>
                    In the app, under Account. Your picture is your Google one until you choose another, and others in
                    the group see both.
                </p>
            </section>

            <section className="privacy-section">
                <h2>Keeping it friendly</h2>
                <p>
                    If a comment, picture or name is offensive, report it: hold the comment, or use the menu on the
                    player's page, and choose <strong>Report</strong>. The group's admins see what's reported, and can
                    remove it. You can also <strong>Block</strong> someone, which hides their comments and picture from
                    you. To raise anything else, email <a href={mail("How2Squash report")}>{SUPPORT_EMAIL}</a>.
                </p>
            </section>

            <section className="privacy-section">
                <h2>Your account and data</h2>
                <p>
                    You can delete your account from the app, under Account, then Delete account, or on this site. That
                    removes your sign-in details, your pictures, comments, feedback, reports and blocks. The matches you
                    played in stay in the other players' records, under "Deleted user". What's kept and why is in the{" "}
                    <Link to="/privacy">privacy policy</Link>.
                </p>
            </section>

            <section className="privacy-section">
                <h2>What you need</h2>
                <p>An iPhone with iOS 17 or later. The watch app needs an Apple Watch with watchOS 10 or later.</p>
            </section>
        </div>
    )
}
