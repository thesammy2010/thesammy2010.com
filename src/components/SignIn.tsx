import { useEffect, useState } from "react"
import { GoogleLogin, CredentialResponse } from "@react-oauth/google"

import { API_URL } from "../configs"
import { apiFetch, decodeProfile, GoogleProfile, setToken, signOut, useAuthToken } from "../auth"
import "./SignIn.css"

// Anchors the One Tap prompt here instead of Google's default fixed
// top-right overlay, which floated on top of the nav bar's own links.
export const ONE_TAP_ANCHOR_ID = "google-one-tap-anchor"

// A signed-in caller defaults to the "guest" role in the API until an admin
// promotes them, so a fresh sign-in can still see 401/403s from protected
// routes - that's expected, not a bug in this component.
async function provisionUser(): Promise<void> {
    try {
        await apiFetch(`${API_URL}/users`, { method: "POST" })
    } catch (error) {
        console.error("Failed to provision user after sign-in", error)
    }
}

export default function SignIn() {
    const token = useAuthToken()
    const [profile, setProfile] = useState<GoogleProfile | null>(null)
    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        setProfile(token ? decodeProfile(token) : null)
    }, [token])

    const handleDeleteAccount = async () => {
        setDeleting(true)
        try {
            const response = await apiFetch(`${API_URL}/users`, { method: "DELETE" })
            if (response.ok) {
                signOut()
            }
        } catch (error) {
            console.error("Failed to delete account", error)
        } finally {
            setDeleting(false)
            setConfirmingDelete(false)
        }
    }

    if (token && profile) {
        return (
            <div className="site-signin">
                <div className="site-signin-profile">
                    <img src={profile.picture} alt={profile.name} referrerPolicy="no-referrer" />
                    <span className="site-signin-name">{profile.name}</span>
                </div>
                {!confirmingDelete ? (
                    <>
                        <button className="site-signin-out" onClick={signOut}>
                            Sign out
                        </button>
                        <button className="site-signin-delete-link" onClick={() => setConfirmingDelete(true)}>
                            Delete account
                        </button>
                    </>
                ) : (
                    <div className="site-signin-confirm">
                        <span>Delete your account?</span>
                        <button onClick={() => setConfirmingDelete(false)}>Cancel</button>
                        <button className="site-signin-delete-confirm" onClick={handleDeleteAccount} disabled={deleting}>
                            {deleting ? "Deleting..." : "Confirm"}
                        </button>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="site-signin">
            <GoogleLogin
                onSuccess={(response: CredentialResponse) => {
                    if (!response.credential) {
                        return
                    }
                    setToken(response.credential)
                    void provisionUser()
                }}
                onError={() => console.error("Google sign-in failed")}
                useOneTap
                prompt_parent_id={ONE_TAP_ANCHOR_ID}
            />
        </div>
    )
}
