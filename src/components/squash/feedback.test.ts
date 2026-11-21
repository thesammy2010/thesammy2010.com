import { clientLabel } from "./feedback"

describe("clientLabel", () => {
    it("names the browser and device", () => {
        expect(
            clientLabel(
                "Mozilla/5.0 (iPhone; CPU iPhone OS 19_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.1 Mobile/15E148 Safari/604.1"
            )
        ).toBe("thesammy2010.com (Safari on iPhone)")
        expect(
            clientLabel(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
            )
        ).toBe("thesammy2010.com (Chrome on Mac)")
    })

    it("tells Edge from the Chrome and Safari it also claims to be", () => {
        expect(
            clientLabel(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0"
            )
        ).toBe("thesammy2010.com (Edge on Windows)")
    })

    it("falls back to the site alone", () => {
        expect(clientLabel("")).toBe("thesammy2010.com")
    })
})
