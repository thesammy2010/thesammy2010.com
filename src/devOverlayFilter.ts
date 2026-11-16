// Keeps browser extensions' errors off the development error overlay.
//
// The dev server's overlay shows every uncaught error and unhandled rejection
// on the page, and extensions run their own scripts here: Bitwarden's
// autofill throws one on load ("getUrlAutofillTargetingRules"), covering the
// app. Production builds have no overlay, so this only runs in development.

const EXTENSION_URL = /(chrome|moz|safari|safari-web)-extension:\/\/|webkit-masked-url:\/\//

/**
 * Whether an error came from outside the app. An extension's script runs in
 * its own world, whose errors aren't this page's Error, and its frames are
 * extension URLs, or in Safari masked ones. A plain string or other value
 * isn't judged, so the app's own odd rejections still show.
 */
export function isForeignError(error: unknown, filename = ""): boolean {
    if (EXTENSION_URL.test(filename)) {
        return true
    }
    if (error instanceof Error) {
        return EXTENSION_URL.test(error.stack ?? "")
    }
    // An Error from another JavaScript world: error-shaped, but not ours
    return (
        typeof error === "object" &&
        error !== null &&
        typeof (error as { message?: unknown }).message === "string" &&
        typeof (error as { stack?: unknown }).stack === "string"
    )
}

/**
 * Stops foreign errors before the overlay hears of them. Capturing listeners
 * on window run ahead of the overlay's ordinary ones, and stopping
 * propagation there keeps them from running at all.
 */
export function filterForeignErrors(target: Window = window): void {
    target.addEventListener(
        "error",
        (event) => {
            if (isForeignError(event.error, event.filename)) {
                event.stopImmediatePropagation()
                console.debug("Ignored an error from a browser extension:", event.error ?? event.message)
            }
        },
        true
    )
    target.addEventListener(
        "unhandledrejection",
        (event) => {
            if (isForeignError(event.reason)) {
                event.stopImmediatePropagation()
                console.debug("Ignored a rejection from a browser extension:", event.reason)
            }
        },
        true
    )
}
