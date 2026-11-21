import { decodeProfile, getToken, isSessionToken, refreshSessionIfDue, setAppleSession, setToken } from "./auth"
import { appleName } from "./components/AppleSignIn"

// An unsigned JWT with these claims: only the payload is ever read here
function jwt(claims: Record<string, unknown>): string {
    const encode = (part: object) =>
        btoa(JSON.stringify(part)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
    return `${encode({ alg: "none" })}.${encode(claims)}.`
}

const inDays = (days: number) => Math.floor(Date.now() / 1000) + days * 24 * 60 * 60

afterEach(() => {
    setToken(null)
    localStorage.clear()
    jest.restoreAllMocks()
})

describe("signing in with Apple", () => {
    it("keeps Apple's name beside the session token, which has none", () => {
        const session = jwt({ iss: "api.thesammy2010.com", provider: "apple", sub: "a", exp: inDays(90) })
        setAppleSession(session, { name: "Leo Parkes", email: "leo@example.com" })

        expect(getToken()).toBe(session)
        expect(isSessionToken(session)).toBe(true)
        expect(decodeProfile(session)).toMatchObject({ name: "Leo Parkes", email: "leo@example.com", picture: "" })
    })

    it("keeps the first name when a later sign-in has none", () => {
        const session = jwt({ provider: "apple", exp: inDays(90) })
        setAppleSession(session, { name: "Leo Parkes", email: null })
        setAppleSession(session, { name: null, email: null })

        expect(decodeProfile(session)?.name).toBe("Leo Parkes")
    })

    it("tells a Google token from a session token", () => {
        expect(isSessionToken(jwt({ iss: "https://accounts.google.com", name: "Leo" }))).toBe(false)
        expect(isSessionToken("not a token")).toBe(false)
    })

    it("puts a name together from what Apple shares", () => {
        expect(appleName({ name: { firstName: "Leo", lastName: "Parkes" } })).toBe("Leo Parkes")
        expect(appleName({ name: { firstName: "Leo" } })).toBe("Leo")
        expect(appleName(undefined)).toBeNull()
    })
})

describe("refreshSessionIfDue", () => {
    function respond(status: number, body: object = {}) {
        return jest
            .spyOn(global, "fetch")
            .mockResolvedValue({ ok: status < 400, status, json: async () => body } as Response)
    }

    it("renews a session token in its last month", async () => {
        setToken(jwt({ provider: "apple", exp: inDays(10) }))
        const renewed = jwt({ provider: "apple", exp: inDays(90) })
        const fetchMock = respond(200, { token: renewed })

        await refreshSessionIfDue("https://api")

        expect(fetchMock).toHaveBeenCalledWith("https://api/auth/refresh", expect.objectContaining({ method: "POST" }))
        expect(getToken()).toBe(renewed)
    })

    it("leaves a fresh session token, and Google's, alone", async () => {
        const fetchMock = respond(200)
        setToken(jwt({ provider: "apple", exp: inDays(80) }))
        await refreshSessionIfDue("https://api")
        setToken(jwt({ iss: "https://accounts.google.com", exp: inDays(0.01) }))
        await refreshSessionIfDue("https://api")

        expect(fetchMock).not.toHaveBeenCalled()
    })

    it("signs out once the account's gone", async () => {
        setToken(jwt({ provider: "apple", exp: inDays(5) }))
        respond(401)

        await refreshSessionIfDue("https://api")

        expect(getToken()).toBeNull()
    })
})
