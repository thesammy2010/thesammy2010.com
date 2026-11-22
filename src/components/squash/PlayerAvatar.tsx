import { useState } from "react"

import { API_URL } from "../../configs"
import type { Player } from "./api"

// The colours initials go on, as the app has them: each player the next in
// the order they joined, so no two share one until there are more players
// than colours. Green and red are left out, as they mean won and lost.
const COLORS = [
    "#4c51bf",
    "#dd6b20",
    "#d53f8c",
    "#319795",
    "#805ad5",
    "#3182ce",
    "#975a16",
    "#0bc5ea",
    "#38b2ac",
    "#d69e2e"
]

export function avatarColor(id: string, players: Player[] = []): string {
    const order = [...players]
        .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? "") || a.id.localeCompare(b.id))
        .findIndex((p) => p.id === id)
    if (order >= 0) {
        return COLORS[order % COLORS.length]
    }
    // FNV-1a, for a player not in the list, the same every visit
    let hash = 2166136261
    for (const char of id) {
        hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
    }
    return COLORS[(hash >>> 0) % COLORS.length]
}

// A picture's address: one uploaded is a path on the API, a Google one is
// already in full.
export function pictureSrc(picture: string | null | undefined): string | null {
    if (!picture) {
        return null
    }
    return /^https?:\/\//.test(picture) ? picture : `${API_URL}${picture}`
}

export function initials(name: string, letters = 2): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, letters)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
}

// A player's picture in a circle: theirs, else their initials in a colour of
// their own.
export default function PlayerAvatar({
    player,
    players,
    size = 24
}: {
    player: Pick<Player, "id" | "name" | "picture_url">
    players?: Player[]
    size?: number
}) {
    const src = pictureSrc(player.picture_url)
    const [failed, setFailed] = useState<string | null>(null)
    const style = { width: size, height: size, fontSize: size * 0.4 }
    if (src && failed !== src) {
        return (
            <img
                className="squash-avatar"
                src={src}
                alt=""
                style={style}
                referrerPolicy="no-referrer"
                onError={() => setFailed(src)}
            />
        )
    }
    return (
        <span
            className="squash-avatar squash-avatar-initials"
            style={{ ...style, background: avatarColor(player.id, players) }}
            aria-hidden="true"
        >
            {initials(player.name, size < 32 ? 1 : 2)}
        </span>
    )
}
