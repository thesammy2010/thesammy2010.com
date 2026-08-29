import React, { useState } from "react"

import { API_URL, ApiError } from "../../configs"
import { apiFetch } from "../../auth"
import { isSignedIn, useCanAccess, useIsAdmin, UserRole } from "../../roles"
import AdminNavBar from "../../components/admin/NavBar"
import RoleSelect from "../../components/admin/RoleSelect"
import SignInPrompt from "../../components/SignInPrompt"
import "./AdminForms.css"

interface UserResult {
    id: string
    role: UserRole
    name: string | null
    email: string | null
}

export default function ProvisionUser() {
    const isAdmin = useIsAdmin()
    const canProvision = useCanAccess("POST", "/admin/users")
    const [googleAccountId, setGoogleAccountId] = useState("")
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [role, setRole] = useState<UserRole>("guest")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<UserResult | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setResult(null)
        try {
            const response = await apiFetch(`${API_URL}/admin/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    google_account_id: googleAccountId || undefined,
                    role,
                    name: name || undefined,
                    email: email || undefined
                })
            })
            if (!response.ok) {
                throw new ApiError(
                    response.status,
                    response.status === 409 ? "A user for that account already exists" : "Failed to create user"
                )
            }
            setResult(await response.json())
            setGoogleAccountId("")
            setName("")
            setEmail("")
            setRole("guest")
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="center-container-grid">
            <AdminNavBar />
            <div className="page-container">
                <div className="admin-form-page">
                    {!isSignedIn() ? (
                        <SignInPrompt message="Sign in to provision a user." />
                    ) : !isAdmin ? (
                        <p className="admin-restricted">This page is restricted to admins.</p>
                    ) : !canProvision ? null : (
                        <>
                            <div className="admin-form-hero">
                                <h1>➕ Provision a User</h1>
                                <p>
                                    Set someone up with a starting role before they've signed in, by their
                                    email - they're claimed automatically the first time they actually sign
                                    in with Google.
                                </p>
                            </div>
                            <form onSubmit={handleSubmit} className="admin-form">
                                <label>
                                    Email
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Their email"
                                        required={!googleAccountId}
                                    />
                                </label>
                                <label>
                                    Name <span className="admin-form-optional">(optional)</span>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Their name"
                                    />
                                </label>
                                <label>
                                    Starting Role
                                    <RoleSelect value={role} onChange={setRole} />
                                </label>
                                <label>
                                    Google Account ID{" "}
                                    <span className="admin-form-optional">
                                        (optional - only if you already know it)
                                    </span>
                                    <input
                                        type="text"
                                        value={googleAccountId}
                                        onChange={(e) => setGoogleAccountId(e.target.value)}
                                        placeholder="Their Google account ID"
                                        required={!email}
                                    />
                                </label>
                                {error && <p className="admin-error">{error}</p>}
                                {result && (
                                    <p className="admin-success">
                                        Created {result.name || result.email || <code>{result.id}</code>} as{" "}
                                        <strong>{result.role}</strong>.
                                    </p>
                                )}
                                <div className="admin-form-actions">
                                    <button type="submit" disabled={loading}>
                                        {loading ? "Creating..." : "Create User"}
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
