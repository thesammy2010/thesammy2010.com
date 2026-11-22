import React from "react"
import ReactDOM from "react-dom/client"
import "./theme.css"
import "./index.css"
import { applyTheme, storedTheme } from "./theme"
import App from "./App"
import reportWebVitals from "./reportWebVitals"
import { purgeLegacyCaches } from "./cache"
import { filterForeignErrors } from "./devOverlayFilter"

if (process.env.NODE_ENV === "development") {
    filterForeignErrors()
}

// Nothing reads the pre-localStorage entries any more; clear them once on
// start rather than leaving them to occupy quota indefinitely.
purgeLegacyCaches()

// The theme picked on the toggle, as public/index.html set it before the
// page drew, in case that couldn't run.
applyTheme(storedTheme())

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement)
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)

reportWebVitals()
