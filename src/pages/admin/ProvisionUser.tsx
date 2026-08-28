import React, { useState } from "react"

import { API_URL, ApiError } from "../../configs"
import { apiFetch } from "../../auth"
import { canAccess, useIsAdmin, UserRole } from "../../roles"
import AdminNavBar from "../../components/admin/NavBar"
import RoleSelect from "../../components/admin/RoleSelect"
import "./AdminForms.css"

interface UserResult {
    id: string
    role: UserRole
}

export default function ProvisionUser() {
    const isAdmin = useIsAdmin()
    const [googleAccountId, setGoogleAccountId] = useState("")
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
                body: JSON.stringify({ google_account_id: googleAccountId, role })
            })
            if (!response.ok) {
                throw new ApiError(
                    response.status,
                    response.status === 409 ? "A user for that account already exists" : "Failed to create user"
                )
            }
            setResult(await response.json())
            setGoogleAccountId("")
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
                    {!isAdmin ? (
                        <p className="admin-restricted">This page is restricted to admins.</p>
                    ) : !canAccess("POST", "/admin/users") ? null : (
                        <>
                            <div className="admin-form-hero">
                                <h1>➕ Provision a User</h1>
                                <p>Set someone up with a starting role before they've signed in.</p>
                            </div>
                            <form onSubmit={handleSubmit} className="admin-form">
                                <label>
                                    Google Account ID
                                    <input
                                        type="text"
                                        value={googleAccountId}
                                        onChange={(e) => setGoogleAccountId(e.target.value)}
                                        placeholder="Their Google account ID"
                                        required
                                    />
                                </label>
                                <label>
                                    Starting Role
                                    <RoleSelect value={role} onChange={setRole} />
                                </label>
                                {error && <p className="admin-error">{error}</p>}
                                {result && (
                                    <p className="admin-success">
                                        Created <code>{result.id}</code> as <strong>{result.role}</strong>.
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
