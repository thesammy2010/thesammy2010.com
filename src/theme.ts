// Light or dark, as the device has it unless picked on the site's toggle.
// The pick is kept in this browser and set on <html> as data-theme, which
// theme.css reads; "system" leaves it off to follow the device.
import { useEffect, useState } from "react"

export type ThemeChoice = "system" | "light" | "dark"

const KEY = "theme"
const CHOICES: ThemeChoice[] = ["system", "light", "dark"]
const listeners = new Set<() => void>()

export function storedTheme(): ThemeChoice {
    try {
        const value = localStorage.getItem(KEY)
        return CHOICES.includes(value as ThemeChoice) ? (value as ThemeChoice) : "system"
    } catch {
        // Storage can be blocked, such as in a private window.
        return "system"
    }
}

export function applyTheme(choice: ThemeChoice): void {
    if (choice === "system") {
        delete document.documentElement.dataset.theme
    } else {
        document.documentElement.dataset.theme = choice
    }
}

export function setTheme(choice: ThemeChoice): void {
    try {
        if (choice === "system") {
            localStorage.removeItem(KEY)
        } else {
            localStorage.setItem(KEY, choice)
        }
    } catch {
        // Kept for this visit only.
    }
    applyTheme(choice)
    listeners.forEach((listener) => listener())
}

// The next choice round the toggle: system, then light, then dark.
export function nextTheme(choice: ThemeChoice): ThemeChoice {
    return CHOICES[(CHOICES.indexOf(choice) + 1) % CHOICES.length]
}

function deviceIsDark(): boolean {
    return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches
}

// The theme picked, and the one in effect, following the device as it
// changes while it's left to it.
export function useTheme(): { choice: ThemeChoice; dark: boolean } {
    const [choice, setChoice] = useState(storedTheme)
    const [deviceDark, setDeviceDark] = useState(deviceIsDark)
    useEffect(() => {
        const listener = () => setChoice(storedTheme())
        listeners.add(listener)
        const media = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null
        const onDevice = () => setDeviceDark(deviceIsDark())
        media?.addEventListener("change", onDevice)
        return () => {
            listeners.delete(listener)
            media?.removeEventListener("change", onDevice)
        }
    }, [])
    return { choice, dark: choice === "dark" || (choice === "system" && deviceDark) }
}
