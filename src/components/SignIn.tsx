import { useEffect, useState } from "react"
import { GoogleLogin, CredentialResponse } from "@react-oauth/google"

import { API_URL } from "../configs"
import { apiFetch, decodeProfile, GoogleProfile, setToken, signOut, useAuthToken } from "../auth"
import "./SignIn.css"

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

    useEffect(() => {
        setProfile(token ? decodeProfile(token) : null)
    }, [token])

    if (token && profile) {
        return (
            <div className="site-signin">
                <div className="site-signin-profile">
                    <img src={profile.picture} alt={profile.name} referrerPolicy="no-referrer" />
                    <span className="site-signin-name">{profile.name}</span>
                </div>
                <button className="site-signin-out" onClick={signOut}>
                    Sign out
                </button>
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
            />
        </div>
    )
}
