import { filterForeignErrors, isForeignError } from "./devOverlayFilter"

describe("isForeignError", () => {
    it("lets the app's own errors through", () => {
        expect(isForeignError(new Error("Failed to load the match"))).toBe(false)
        expect(isForeignError("a plain string")).toBe(false)
        expect(isForeignError(undefined, "http://localhost:3000/static/js/bundle.js")).toBe(false)
    })

    it("catches errors from an extension's file or frames", () => {
        expect(isForeignError(undefined, "chrome-extension://abc/content.js")).toBe(true)
        const masked = new Error("boom")
        masked.stack = "sendExtensionMessage@webkit-masked-url://hidden/:2:1"
        expect(isForeignError(masked)).toBe(true)
    })

    it("catches an error from another JavaScript world", () => {
        const fromElsewhere = { message: "undefined is not an object", stack: "" }
        expect(isForeignError(fromElsewhere)).toBe(true)
    })
})

describe("filterForeignErrors", () => {
    it("stops a foreign rejection before the overlay hears it, and leaves the app's alone", () => {
        // The overlay's listener is added first, as the dev server's client
        // loads before the app does.
        const heard: unknown[] = []
        const overlay = (event: Event) => heard.push((event as PromiseRejectionEvent).reason)
        window.addEventListener("unhandledrejection", overlay)
        filterForeignErrors(window)
        const debug = jest.spyOn(console, "debug").mockImplementation(() => undefined)

        const reject = (reason: unknown) => {
            const event = new Event("unhandledrejection") as PromiseRejectionEvent
            Object.defineProperty(event, "reason", { value: reason })
            window.dispatchEvent(event)
        }
        const own = new Error("ours")
        reject({ message: "Bitwarden", stack: "" })
        reject(own)

        expect(heard).toEqual([own])
        window.removeEventListener("unhandledrejection", overlay)
        debug.mockRestore()
    })
})
