// The simple view, for whoever wants less: the scores, results and records,
// without the charts, rally tables and point by point figures. Off to begin
// with, kept in this browser, and offered once after someone's first
// finished match, as the app does.
import { useSyncExternalStore } from "react"

const KEY = "squash.simpleView"
const OFFERED_KEY = "squash.simpleView.offered"
const listeners = new Set<() => void>()

function read(key: string): boolean {
    try {
        return localStorage.getItem(key) === "true"
    } catch {
        // Storage can be blocked, such as in a private window.
        return false
    }
}

function write(key: string, value: boolean): void {
    try {
        localStorage.setItem(key, String(value))
    } catch {
        // Kept for this visit only.
    }
    listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export function useSimpleView(): boolean {
    return useSyncExternalStore(
        subscribe,
        () => read(KEY),
        () => false
    )
}

export function setSimpleView(on: boolean): void {
    write(KEY, on)
}

export function useSimpleViewOffered(): boolean {
    return useSyncExternalStore(
        subscribe,
        () => read(OFFERED_KEY),
        () => true
    )
}

export function markSimpleViewOffered(): void {
    write(OFFERED_KEY, true)
}
