import { applyTheme, nextTheme, setTheme, storedTheme } from "./theme"

describe("theme", () => {
    afterEach(() => setTheme("system"))

    it("goes round system, light and dark", () => {
        expect(nextTheme("system")).toBe("light")
        expect(nextTheme("light")).toBe("dark")
        expect(nextTheme("dark")).toBe("system")
    })

    it("keeps a pick and sets it on the page, and system follows the device", () => {
        setTheme("dark")
        expect(storedTheme()).toBe("dark")
        expect(document.documentElement.dataset.theme).toBe("dark")

        setTheme("system")
        expect(storedTheme()).toBe("system")
        expect(document.documentElement.dataset.theme).toBeUndefined()
    })

    it("ignores anything else stored", () => {
        localStorage.setItem("theme", "sepia")
        expect(storedTheme()).toBe("system")
        applyTheme(storedTheme())
        expect(document.documentElement.dataset.theme).toBeUndefined()
    })
})
