import React, { useState } from "react"
import { Link } from "react-router-dom"

import { RatingExampleSide, RatingMethod, squashApi, useSquashLoad } from "../../components/squash/api"
import Formula from "../../components/squash/Formula"
import SquashPage from "../../components/squash/SquashPage"
import { expectedScore, gameRatingChange, marginMultiplier } from "../../components/squash/elo"
import { signed } from "../../components/squash/format"

// "20 November 2026" from the API's "2026-11-20"
function longDate(day: string): string {
    const [year, month, date] = day.split("-").map(Number)
    return new Date(year, month - 1, date).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric"
    })
}

// "▲ +20.5" for a rise and "▼ −20.5" for a fall, in the colours used for them on the home page
function Change({ value }: { value: number }) {
    const tone = value > 0 ? "up" : value < 0 ? "down" : "level"
    return (
        <span className={`squash-elo-change ${tone}`}>
            <span aria-hidden="true">{value > 0 ? "▲" : value < 0 ? "▼" : "•"}</span> {signed(value)}
        </span>
    )
}

const percent = (share: number) => `${Math.round(share * 100)}%`
const RESULT_LABELS: Record<number, string> = { 1: "Won", 0.5: "Drew", 0: "Lost" }

// One side of a worked example: its players' ratings before and after, and
// what it was expected to take against what it did.
function ExampleSide({ side, label }: { side: RatingExampleSide; label: string }) {
    const doubles = side.ratings_before.length > 1
    return (
        <div className="squash-elo-example-side">
            <span className="squash-elo-eyebrow">
                {label} · {RESULT_LABELS[side.score] ?? `Scored ${side.score}`}
            </span>
            <span className="squash-elo-example-ratings">
                {side.ratings_before.map((before, i) => (
                    <span key={i}>
                        {before} → <strong>{side.ratings_after[i]}</strong>
                    </span>
                ))}
            </span>
            <span className="squash-elo-meta">
                <Change value={side.change} />
                <span className="squash-muted">
                    {doubles && `plays as ${side.rating} · `}expected {percent(side.expected)}
                </span>
            </span>
        </div>
    )
}

// Two ratings and a game's score in; the expected share, how much the margin
// counts and how far each moves out, with the API's own constants.
function TryIt({ method }: { method: RatingMethod }) {
    const [yours, setYours] = useState(String(method.constants.start))
    const [theirs, setTheirs] = useState(String(method.constants.start + 100))
    const [mine, setMine] = useState("11")
    const [others, setOthers] = useState("7")
    const you = Number(yours)
    const them = Number(theirs)
    const points = Number(mine)
    const against = Number(others)
    const valid = [yours, theirs, mine, others].every((value) => value !== "" && Number.isFinite(Number(value)))
    const change = valid ? gameRatingChange(you, them, points, against, method.constants) : null
    const margins = (method.constants.margin_base ?? 0) > 0
    const multiplier = marginMultiplier(
        Math.abs(points - against),
        points > against ? you - them : them - you,
        method.constants
    )

    return (
        <div className="squash-card">
            <h4 className="squash-card-title">Try it</h4>
            <div className="squash-elo-try">
                <label>
                    <span>Your rating</span>
                    <input
                        className="squash-input"
                        type="number"
                        inputMode="numeric"
                        value={yours}
                        onChange={(e) => setYours(e.target.value)}
                    />
                </label>
                <label>
                    <span>Your opponent's</span>
                    <input
                        className="squash-input"
                        type="number"
                        inputMode="numeric"
                        value={theirs}
                        onChange={(e) => setTheirs(e.target.value)}
                    />
                </label>
                <label>
                    <span>Your points</span>
                    <input
                        className="squash-input"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={mine}
                        onChange={(e) => setMine(e.target.value)}
                    />
                </label>
                <label>
                    <span>Their points</span>
                    <input
                        className="squash-input"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={others}
                        onChange={(e) => setOthers(e.target.value)}
                    />
                </label>
            </div>
            {valid && change === null && (
                <p className="squash-elo-try-result" role="status" aria-live="polite">
                    Not a finished game: one side needs 11, two clear.
                </p>
            )}
            {valid && change !== null && (
                <p className="squash-elo-try-result" role="status" aria-live="polite">
                    You were expected to take{" "}
                    <strong>{percent(expectedScore(you, them, method.constants.scale))}</strong> of the games.
                    {margins && (
                        <>
                            {" "}
                            Won by {Math.abs(points - against)}, it counts <strong>{multiplier.toFixed(2)}×</strong> a
                            standard game.
                        </>
                    )}{" "}
                    You'd move <Change value={change} /> to <strong>{Math.round((you + change) * 10) / 10}</strong>, and
                    they'd move <Change value={-change} />.
                </p>
            )}
        </div>
    )
}

// How the Elo ratings are worked out, as the API describes it: the numbers,
// the formulas, a calculator, worked examples, the rules and what's changed.
// The API builds the description from the code that does the rating, so it
// can't drift from what really happens.
export default function HowEloWorks() {
    const { state, refreshing, reload } = useSquashLoad<RatingMethod>(() => squashApi.ratingMethod(), [])

    return (
        <SquashPage state={state} refreshing={refreshing} onRefresh={reload} what="How Elo works">
            {(method) => (
                <div className="squash-elo-page">
                    <div className="squash-header">
                        <Link className="squash-link" to="/squash/stats">
                            ← Stats
                        </Link>
                    </div>
                    <header className="squash-elo-intro">
                        <h2 className="squash-title">How Elo works</h2>
                        <p className="squash-elo-lead">
                            Every player has a rating that rises when they do better than expected and falls when they
                            do worse. Beating someone rated well above you is worth far more than beating someone below.
                        </p>
                        <span className="squash-game-tag">
                            Method v{method.version} · updated {longDate(method.updated)}
                        </span>
                    </header>

                    <div className="stats-grid">
                        {[
                            { value: method.constants.start, label: "Everyone starts on" },
                            {
                                value: method.constants.k,
                                label:
                                    (method.constants.margin_base ?? 0) > 0
                                        ? `A win by ${method.constants.margin_base} moves you up to`
                                        : "Most one game moves you"
                            },
                            { value: method.constants.scale, label: "Points for 10 to 1 odds" },
                            {
                                value: method.constants.provisional_games ?? method.constants.provisional_matches,
                                label: "Games until it's settled"
                            }
                        ].map((tile) => (
                            <div key={tile.label} className="stat-tile">
                                <div className="stat-tile-value">{tile.value}</div>
                                <div className="stat-tile-label">{tile.label}</div>
                            </div>
                        ))}
                    </div>

                    <div className="squash-card">
                        <h4 className="squash-card-title">The maths</h4>
                        <div className="squash-formulas">
                            {method.formulas.map((formula) => (
                                <Formula key={formula.name} formula={formula} />
                            ))}
                        </div>
                    </div>

                    <TryIt method={method} />

                    <div className="squash-card">
                        <h4 className="squash-card-title">Worked examples</h4>
                        <div className="squash-elo-examples">
                            {method.examples.map((example) => (
                                <div key={example.description} className="squash-elo-example">
                                    <p className="squash-elo-example-title">{example.description}</p>
                                    <div className="squash-elo-example-sides">
                                        <ExampleSide side={example.side1} label="Side 1" />
                                        <ExampleSide side={example.side2} label="Side 2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="squash-card">
                        <h4 className="squash-card-title">The rules</h4>
                        <ul className="squash-elo-rules">
                            {method.rules.map((rule) => (
                                <li key={rule}>{rule}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="squash-card">
                        <h4 className="squash-card-title">What's changed</h4>
                        <p className="squash-muted">
                            A change to how ratings are worked out moves everyone's at once, as they're worked out
                            afresh from every game.
                        </p>
                        <ol className="squash-elo-changes">
                            {method.changes.map((change) => (
                                <li key={change.version}>
                                    <span className="squash-elo-change-version">v{change.version}</span>
                                    <span className="squash-muted">{longDate(change.date)}</span>
                                    <span>{change.summary}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            )}
        </SquashPage>
    )
}
