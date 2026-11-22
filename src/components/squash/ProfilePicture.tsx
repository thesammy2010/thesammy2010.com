import { ChangeEvent, useRef, useState } from "react"

import { Player, recheckSquashAccess, squashApi } from "./api"

// The longest side a photo's sent at. The API keeps it at most 1MB either way.
const SENT_SIDE = 512

// A photo made small before it's sent, as a JPEG, so one straight off a
// phone's camera doesn't take long.
async function shrunk(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, SENT_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return new Promise((resolve, reject) =>
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("That picture couldn't be read"))),
            "image/jpeg",
            0.85
        )
    )
}

// Your own picture, from your player page: one you choose, or back to your
// Google one.
export default function ProfilePicture({ player, onSaved }: { player: Player; onSaved: (player: Player) => void }) {
    const input = useRef<HTMLInputElement>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const uploaded = player.picture_url?.startsWith("/") ?? false

    const save = async (change: () => Promise<Player>) => {
        setSaving(true)
        setError(null)
        try {
            const saved = await change()
            // The signed-in player is kept with the access check
            recheckSquashAccess()
            onSaved(saved)
        } catch (e) {
            setError((e as Error).message)
        } finally {
            setSaving(false)
        }
    }

    const picked = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        event.target.value = ""
        if (file) {
            void save(async () => squashApi.setPicture(await shrunk(file)))
        }
    }

    return (
        <div className="squash-picture-actions">
            <input ref={input} type="file" accept="image/*" hidden onChange={picked} />
            <button
                type="button"
                className="squash-text-button"
                disabled={saving}
                onClick={() => input.current?.click()}
            >
                {saving ? "Saving…" : player.picture_url ? "Change picture" : "Add a picture"}
            </button>
            {uploaded && (
                <button
                    type="button"
                    className="squash-text-button squash-picture-remove"
                    disabled={saving}
                    onClick={() => void save(() => squashApi.removePicture())}
                >
                    Remove picture
                </button>
            )}
            {error && <p className="squash-inline-error">{error}</p>}
        </div>
    )
}
