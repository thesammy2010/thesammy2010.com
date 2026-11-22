// Finding players by what's typed: any part of their name, ignoring case and
// accents, so "zoe" finds Zoë, and their email too where it's shown.
import type { Player } from "./api"

// Lower case with accents taken off, for comparing what's typed with names
export function folded(text: string): string {
    return text
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim()
}

/** Whether the player matches the search, which matches everyone when blank. */
export function matchesSearch(player: Pick<Player, "name" | "email">, search: string, withEmail = false): boolean {
    const query = folded(search)
    if (!query) {
        return true
    }
    return folded(player.name).includes(query) || (withEmail && folded(player.email ?? "").includes(query))
}
