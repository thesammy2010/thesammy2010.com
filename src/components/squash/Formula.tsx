import { useMemo } from "react"
import katex from "katex"
import "katex/dist/katex.min.css"

import type { RatingFormula } from "./api"

// One of the ratings' formulas, typeset from its LaTeX. KaTeX leaves out
// anything that could run or link (its trust option is off), and should it
// fail, the plain version the API also gives is shown instead.
export default function Formula({ formula }: { formula: RatingFormula }) {
    const html = useMemo(() => {
        try {
            return katex.renderToString(formula.latex, { displayMode: true, throwOnError: true })
        } catch {
            return null
        }
    }, [formula.latex])

    return (
        <figure className="squash-formula">
            <figcaption className="squash-formula-name">{formula.name}</figcaption>
            {html ? (
                <div
                    className="squash-formula-math"
                    aria-label={formula.plain}
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            ) : (
                <div className="squash-formula-math squash-formula-plain">{formula.plain}</div>
            )}
            <p className="squash-formula-explanation">{formula.explanation}</p>
        </figure>
    )
}
