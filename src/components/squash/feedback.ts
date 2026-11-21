// Small helpers for squash feedback.
import type { FeedbackKind } from "./api"

export const FEEDBACK_KINDS: { value: FeedbackKind; label: string; icon: string }[] = [
    { value: "bug", label: "Bug", icon: "🐞" },
    { value: "idea", label: "Idea", icon: "💡" },
    { value: "other", label: "Other", icon: "💬" }
]

// The API's limit on a message
export const FEEDBACK_MAX = 2000

/**
 * Where feedback was sent from, for whoever reads it: the site and the
 * browser, such as "thesammy2010.com (Safari on iPhone)". Edge and Chrome
 * both say Safari too, and Edge says Chrome, so they're checked first.
 */
export function clientLabel(userAgent: string): string {
    const browser = /Edg\//.test(userAgent)
        ? "Edge"
        : /Firefox\/|FxiOS/.test(userAgent)
        ? "Firefox"
        : /Chrome\/|CriOS/.test(userAgent)
        ? "Chrome"
        : /Safari\//.test(userAgent)
        ? "Safari"
        : null
    const device = /iPhone/.test(userAgent)
        ? "iPhone"
        : /iPad/.test(userAgent)
        ? "iPad"
        : /Android/.test(userAgent)
        ? "Android"
        : /Mac OS X/.test(userAgent)
        ? "Mac"
        : /Windows/.test(userAgent)
        ? "Windows"
        : null
    const detail = [browser, device].filter(Boolean).join(" on ")
    return detail ? `thesammy2010.com (${detail})` : "thesammy2010.com"
}
