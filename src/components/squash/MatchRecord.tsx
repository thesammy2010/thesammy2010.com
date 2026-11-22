// A record the same way everywhere, as the app has it: won, lost, then drawn
// when there are any, each number with its letter and in its colour, wins
// green, losses red and draws grey: "3W 1L 2D".
export default function MatchRecord({ won, lost, drawn = 0 }: { won: number; lost: number; drawn?: number }) {
    const parts: [number, string, string][] = [
        [won, "W", "won"],
        [lost, "L", "lost"],
        ...(drawn > 0 ? [[drawn, "D", "drawn"] as [number, string, string]] : [])
    ]
    return (
        <span className="squash-record" aria-label={parts.map(([n, , word]) => `${n} ${word}`).join(", ")}>
            {parts.map(([n, letter, word], i) => (
                <span key={word} className={`squash-record-${word}`} aria-hidden="true">
                    {i > 0 && " "}
                    {n}
                    <small>{letter}</small>
                </span>
            ))}
        </span>
    )
}
