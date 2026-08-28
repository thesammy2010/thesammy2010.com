import React, { useState } from "react"

import { API_URL, ApiError } from "../configs"
import { apiFetch } from "../auth"
import { canAccess, useIsAdmin, UserRole } from "../roles"
import "./Admin.css"

const ROLE_OPTIONS: UserRole[] = ["guest", "viewer", "editor", "admin"]

interface UserResult {
    id: string
    role: UserRole
    deleted_at: string | null
}

function RoleSelect({ value, onChange }: { value: UserRole; onChange: (role: UserRole) => void }) {
    return (
        <select value={value} onChange={(e) => onChange(e.target.value as UserRole)}>
            {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                    {role}
                </option>
            ))}
        </select>
    )
}

function ProvisionUserForm() {
    const [googleAccountId, setGoogleAccountId] = useState("")
    const [role, setRole] = useState<UserRole>("guest")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<UserResult | null>(null)

    if (!canAccess("POST", "/admin/users")) {
        return null
    }

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
                    response.status === 409
                        ? "A user for that Google account already exists"
                        : "Failed to create user"
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
        <section className="admin-section">
            <h2>Provision a User</h2>
            <p className="admin-section-hint">
                Registers a Google account with a starting role before that person has ever signed in.
            </p>
            <form onSubmit={handleSubmit} className="admin-form">
                <label>
                    Google Account ID
                    <input
                        type="text"
                        value={googleAccountId}
                        onChange={(e) => setGoogleAccountId(e.target.value)}
                        placeholder="Google 'sub' claim"
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
                        Created user <code>{result.id}</code> as <strong>{result.role}</strong>.
                    </p>
                )}
                <button type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Create User"}
                </button>
            </form>
        </section>
    )
}

function UpdateRoleForm() {
    const [userId, setUserId] = useState("")
    const [role, setRole] = useState<UserRole>("guest")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<UserResult | null>(null)

    if (!canAccess("PATCH", "/users/x/role")) {
        return null
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setResult(null)
        try {
            const response = await apiFetch(`${API_URL}/users/${userId}/role`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role })
            })
            if (!response.ok) {
                throw new ApiError(
                    response.status,
                    response.status === 404 ? "User not found" : "Failed to update user's role"
                )
            }
            setResult(await response.json())
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="admin-section">
            <h2>Change a User's Role</h2>
            <p className="admin-section-hint">
                Needs the user's account ID - they can find it on their own <code>/users</code> response.
            </p>
            <form onSubmit={handleSubmit} className="admin-form">
                <label>
                    User ID
                    <input
                        type="text"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="00000000-0000-0000-0000-000000000000"
                        required
                    />
                </label>
                <label>
                    New Role
                    <RoleSelect value={role} onChange={setRole} />
                </label>
                {error && <p className="admin-error">{error}</p>}
                {result && (
                    <p className="admin-success">
                        <code>{result.id}</code> is now <strong>{result.role}</strong>.
                    </p>
                )}
                <button type="submit" disabled={loading}>
                    {loading ? "Updating..." : "Update Role"}
                </button>
            </form>
        </section>
    )
}

function DeleteUserForm() {
    const [userId, setUserId] = useState("")
    const [confirming, setConfirming] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<UserResult | null>(null)

    if (!canAccess("DELETE", "/users/x")) {
        return null
    }

    const handleDelete = async () => {
        setLoading(true)
        setError(null)
        setResult(null)
        try {
            const response = await apiFetch(`${API_URL}/users/${userId}`, {
                method: "DELETE"
            })
            if (!response.ok) {
                throw new ApiError(
                    response.status,
                    response.status === 404 ? "User not found, or already deleted" : "Failed to delete user"
                )
            }
            setResult(await response.json())
            setConfirming(false)
            setUserId("")
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="admin-section">
            <h2>Delete a User</h2>
            <p className="admin-section-hint">
                Soft-deletes the account - their audit trail stays, but they'll need to be re-provisioned to sign
                back in.
            </p>
            <form
                className="admin-form"
                onSubmit={(e) => {
                    e.preventDefault()
                    setConfirming(true)
                }}
            >
                <label>
                    User ID
                    <input
                        type="text"
                        value={userId}
                        onChange={(e) => {
                            setUserId(e.target.value)
                            setConfirming(false)
                        }}
                        placeholder="00000000-0000-0000-0000-000000000000"
                        required
                    />
                </label>
                {error && <p className="admin-error">{error}</p>}
                {result && <p className="admin-success">Deleted user <code>{result.id}</code>.</p>}
                {!confirming && (
                    <button type="submit" className="admin-danger-button">
                        Delete User
                    </button>
                )}
                {confirming && (
                    <div className="admin-confirm">
                        <p className="admin-warning">
                            Delete <code>{userId}</code>? This can't be undone from here.
                        </p>
                        <div className="admin-confirm-actions">
                            <button type="button" onClick={() => setConfirming(false)}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="admin-danger-button"
                                onClick={handleDelete}
                                disabled={loading}
                            >
                                {loading ? "Deleting..." : "Confirm Delete"}
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </section>
    )
}

// Root-level, not under /go-heavier: admin tools here are expected to reach
// across the whole site, not just the go-heavier resources.
export default function Admin() {
    const isAdmin = useIsAdmin()

    return (
        <div className="admin-page">
            <header className="admin-hero">
                <h1>🔧 Admin</h1>
            </header>

            {isAdmin ? (
                <div className="admin-tools">
                    <ProvisionUserForm />
                    <UpdateRoleForm />
                    <DeleteUserForm />
                </div>
            ) : (
                <p className="admin-restricted">This page is restricted to admins.</p>
            )}
        </div>
    )
}
