// Tracks the signed-in user's role and the API's endpoint -> minimum-role
// map, so the UI can decide what to render without guessing what the
// backend will accept. Mirrors the token-outside-React-state pattern in
// auth.ts: plain functions (canAccess) work in class components, hooks are
// a thin subscription over the same values for function components.
import { useEffect, useState } from "react"
import { API_URL } from "./configs"
import { apiFetch, getToken, subscribeToken } from "./auth"

export type UserRole = "guest" | "viewer" | "editor" | "admin"

const ROLE_RANK: Record<UserRole, number> = {
    guest: 0,
    viewer: 1,
    editor: 2,
    admin: 3
}

// Keyed by path template as FastAPI declares it (e.g.
// "/go-heavier/exercises/{exercise_id}") then HTTP method. A null role
// means the endpoint needs no auth at all; a missing method/path means we
// don't know about it yet (fail closed, see requiredRole below).
type EndpointRoles = Record<string, Record<string, UserRole | null>>

let role: UserRole | null = null
let ownUserId: string | null = null
let endpointRoles: EndpointRoles | null = null
const changeListeners = new Set<() => void>()

// Flips true once the first role + endpoint-map fetch (or the decision that
// there's no token to fetch with) has settled. Callers that want to skip
// fetching a resource the caller can't access need to wait for this first -
// otherwise every page load would race the /users and /endpoints requests
// and wrongly treat a fully-authorized user as having no access yet.
let accessReady = false
const readyListeners = new Set<() => void>()

function notify(): void {
    changeListeners.forEach(listener => listener())
}

function markAccessReady(): void {
    if (!accessReady) {
        accessReady = true
        readyListeners.forEach(listener => listener())
    }
}

function setRole(next: UserRole | null): void {
    role = next
    notify()
}

function setOwnUserId(next: string | null): void {
    ownUserId = next
    notify()
}

function setEndpointRoles(next: EndpointRoles | null): void {
    endpointRoles = next
    notify()
}

async function fetchRole(): Promise<void> {
    try {
        const response = await apiFetch(`${API_URL}/users`)
        if (!response.ok) {
            setRole(null)
            setOwnUserId(null)
            return
        }
        const data = await response.json()
        setRole(data.role ?? null)
        setOwnUserId(data.id ?? null)
    } catch (error) {
        console.error("Failed to fetch user role", error)
        setRole(null)
    }
}

async function fetchEndpointRoles(): Promise<void> {
    try {
        const response = await apiFetch(`${API_URL}/endpoints`)
        if (!response.ok) {
            return
        }
        setEndpointRoles(await response.json())
    } catch (error) {
        console.error("Failed to fetch endpoint roles", error)
    }
}

// A signed-out visitor has no role and /endpoints requires a valid token
// (see its API docstring), so both reset together on sign-out.
subscribeToken(token => {
    if (token) {
        Promise.all([fetchRole(), fetchEndpointRoles()]).finally(markAccessReady)
    } else {
        setRole(null)
        setOwnUserId(null)
        setEndpointRoles(null)
        markAccessReady()
    }
})

if (getToken()) {
    Promise.all([fetchRole(), fetchEndpointRoles()]).finally(markAccessReady)
} else {
    markAccessReady()
}

function pathSegments(path: string): string[] {
    return path
        .replace(API_URL, "")
        .split("?")[0]
        .split("/")
        .filter(Boolean)
}

function matchesTemplate(actual: string[], template: string[]): boolean {
    return (
        actual.length === template.length &&
        template.every((segment, i) => segment.startsWith("{") || segment === actual[i])
    )
}

// undefined = endpoint not found in the map (map may still be loading).
function requiredRole(method: string, path: string): UserRole | null | undefined {
    if (!endpointRoles) {
        return undefined
    }
    const actual = pathSegments(path)
    for (const [template, methods] of Object.entries(endpointRoles)) {
        if (matchesTemplate(actual, template.split("/").filter(Boolean))) {
            const forMethod = methods[method.toUpperCase()]
            if (forMethod !== undefined) {
                return forMethod
            }
        }
    }
    return undefined
}

// Whether the signed-in user can call `method path` on the API, per the
// role the backend itself reports for that endpoint. Fails closed: unknown
// endpoints and an unloaded /endpoints map both read as "no access" rather
// than showing an affordance that would 401/403 when used.
export function canAccess(method: string, path: string): boolean {
    const min = requiredRole(method, path)
    if (min === undefined) {
        return false
    }
    if (min === null) {
        return true
    }
    if (!role) {
        return false
    }
    return ROLE_RANK[role] >= ROLE_RANK[min]
}

export function getUserRole(): UserRole | null {
    return role
}

export function getOwnUserId(): string | null {
    return ownUserId
}

// Distinguishes "not signed in at all" from "signed in but lacking a role" -
// a real account always has at least guest, so canAccess() reading false
// can't tell those apart on its own, and a permission-denied message is the
// wrong thing to show someone who hasn't signed in yet.
export function isSignedIn(): boolean {
    return getToken() !== null
}

// Whether canAccess has enough information to give a real answer yet. A
// caller that wants to skip fetching something it might not have access to
// should wait for this before trusting a `false` from canAccess - before
// it's ready, `false` just means "still loading", not "denied".
export function isAccessReady(): boolean {
    return accessReady
}

// Fires once, the moment isAccessReady() becomes true (never again after).
export function subscribeAccessReady(listener: () => void): () => void {
    if (accessReady) {
        listener()
        return () => {}
    }
    readyListeners.add(listener)
    return () => {
        readyListeners.delete(listener)
    }
}

// For class components: re-render whenever role or the endpoint map
// changes, e.g. `componentDidMount() { this.unsubscribe = subscribeAccess(() => this.forceUpdate()) }`.
export function subscribeAccess(listener: () => void): () => void {
    changeListeners.add(listener)
    return () => {
        changeListeners.delete(listener)
    }
}

export function useCanAccess(method: string, path: string): boolean {
    const [, forceRender] = useState(0)
    useEffect(() => subscribeAccess(() => forceRender(n => n + 1)), [])
    return canAccess(method, path)
}

export function useUserRole(): UserRole | null {
    const [current, setCurrent] = useState(role)
    useEffect(() => subscribeAccess(() => setCurrent(role)), [])
    return current
}

export function useOwnUserId(): string | null {
    const [current, setCurrent] = useState(ownUserId)
    useEffect(() => subscribeAccess(() => setCurrent(ownUserId)), [])
    return current
}

export function useIsAdmin(): boolean {
    return useUserRole() === "admin"
}
