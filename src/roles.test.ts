// roles.ts fires its role/endpoint fetches as a side effect of being
// imported (see the top-level `if (getToken())` block), and keeps its state
// in module-level variables rather than anything a test can reset directly.
// Each test therefore sets up localStorage and a fetch mock first, then
// loads a fresh copy of the module with jest.resetModules() so the two
// don't leak into each other.
export {}

const TOKEN_KEY = "go-heavier-google-id-token"

// auth.ts decodes the token as a JWT and treats anything undecodable (or
// past its exp) as expired, clearing it straight back out of localStorage -
// so a plain placeholder string like "fake-token" silently signs the test
// back out before roles.ts ever sees it. This builds a fake-but-shaped one.
function fakeJwt(): string {
    const base64url = (obj: object) => btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
    const header = base64url({ alg: "none", typ: "JWT" })
    const payload = base64url({ exp: Math.floor(Date.now() / 1000) + 3600 })
    return `${header}.${payload}.signature`
}

interface Setup {
    role?: string | null
    ownUserId?: string
    endpoints?: Record<string, Record<string, string | null>>
    signedIn?: boolean
}

async function loadRoles({ role = "guest", ownUserId = "user-1", endpoints = {}, signedIn = true }: Setup = {}) {
    jest.resetModules()

    if (signedIn) {
        localStorage.setItem(TOKEN_KEY, fakeJwt())
    } else {
        localStorage.removeItem(TOKEN_KEY)
    }

    global.fetch = jest.fn((url: string) => {
        if (url.includes("/endpoints")) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve(endpoints) } as Response)
        }
        if (url.includes("/users")) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: ownUserId, role }) } as Response)
        }
        return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    }) as jest.Mock as typeof fetch

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rolesModule = require("./roles")

    await new Promise<void>((resolve) => {
        if (rolesModule.isAccessReady()) {
            resolve()
        } else {
            rolesModule.subscribeAccessReady(resolve)
        }
    })

    return rolesModule
}

afterEach(() => {
    localStorage.clear()
    jest.restoreAllMocks()
})

describe("canAccess", () => {
    it("allows a role at or above the endpoint's minimum", async () => {
        const roles = await loadRoles({
            role: "editor",
            endpoints: { "/go-heavier/locations": { POST: "editor" } }
        })

        expect(roles.canAccess("POST", "/go-heavier/locations")).toBe(true)
    })

    it("denies a role below the endpoint's minimum", async () => {
        const roles = await loadRoles({
            role: "viewer",
            endpoints: { "/go-heavier/locations": { POST: "editor" } }
        })

        expect(roles.canAccess("POST", "/go-heavier/locations")).toBe(false)
    })

    it("allows a null-role (public) endpoint regardless of the caller's role", async () => {
        const roles = await loadRoles({
            role: "guest",
            endpoints: { "/config": { GET: null } }
        })

        expect(roles.canAccess("GET", "/config")).toBe(true)
    })

    it("fails closed for a method/path the endpoint map doesn't mention", async () => {
        const roles = await loadRoles({
            role: "admin",
            endpoints: { "/go-heavier/locations": { GET: "viewer" } }
        })

        expect(roles.canAccess("DELETE", "/go-heavier/locations")).toBe(false)
        expect(roles.canAccess("GET", "/go-heavier/unknown")).toBe(false)
    })

    it("matches a parameterized path template by segment", async () => {
        const roles = await loadRoles({
            role: "admin",
            endpoints: { "/users/{user_id}/role": { PATCH: "admin" } }
        })

        expect(roles.canAccess("PATCH", "/users/abc-123/role")).toBe(true)
    })

    it("does not match a path with a different segment count", async () => {
        const roles = await loadRoles({
            role: "admin",
            endpoints: { "/users/{user_id}": { DELETE: "admin" } }
        })

        expect(roles.canAccess("DELETE", "/users/abc-123/role")).toBe(false)
    })

    it("does not match a path whose literal segments differ", async () => {
        const roles = await loadRoles({
            role: "admin",
            endpoints: { "/admin/users": { POST: "admin" } }
        })

        expect(roles.canAccess("POST", "/admin/other")).toBe(false)
    })

    it("is method-specific, not path-specific", async () => {
        const roles = await loadRoles({
            role: "viewer",
            endpoints: { "/go-heavier/locations": { GET: "viewer", POST: "editor" } }
        })

        expect(roles.canAccess("GET", "/go-heavier/locations")).toBe(true)
        expect(roles.canAccess("POST", "/go-heavier/locations")).toBe(false)
    })

    // /endpoints itself requires a valid token (see its API docstring), so a
    // signed-out visitor never even fetches the map - everything reads as
    // "no access" via the same fail-closed path as an endpoint it's never
    // heard of, not just the ones that are actually role-gated.
    it("denies everything for a signed-out visitor, including public endpoints", async () => {
        const roles = await loadRoles({
            signedIn: false,
            endpoints: { "/config": { GET: null }, "/go-heavier/locations": { GET: "viewer" } }
        })

        expect(roles.getUserRole()).toBeNull()
        expect(roles.canAccess("GET", "/config")).toBe(false)
        expect(roles.canAccess("GET", "/go-heavier/locations")).toBe(false)
    })
})

describe("getUserRole / getOwnUserId", () => {
    it("exposes the signed-in user's role and id once loaded", async () => {
        const roles = await loadRoles({ role: "admin", ownUserId: "my-id" })

        expect(roles.getUserRole()).toBe("admin")
        expect(roles.getOwnUserId()).toBe("my-id")
    })
})

describe("isAccessReady / subscribeAccessReady", () => {
    it("is ready immediately for a signed-out visitor, with no role or id", async () => {
        const roles = await loadRoles({ signedIn: false })

        expect(roles.isAccessReady()).toBe(true)
        expect(roles.getUserRole()).toBeNull()
        expect(roles.getOwnUserId()).toBeNull()
    })

    it("calls a listener immediately if already ready, rather than losing the event", async () => {
        const roles = await loadRoles({ role: "guest" })

        const listener = jest.fn()
        roles.subscribeAccessReady(listener)

        expect(listener).toHaveBeenCalledTimes(1)
    })
})
