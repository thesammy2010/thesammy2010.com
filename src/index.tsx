import React from "react"
import ReactDOM from "react-dom/client"
import "./index.css"
import App from "./App"
import reportWebVitals from "./reportWebVitals"
import { purgeLegacyCaches } from "./cache"

// Nothing reads the pre-localStorage entries any more; clear them once on
// start rather than leaving them to occupy quota indefinitely.
purgeLegacyCaches()

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement)
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)

reportWebVitals()
