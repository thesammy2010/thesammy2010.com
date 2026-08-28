import React, { useEffect, useState } from "react"

import { API_URL, ApiError, PERMISSION_DENIED_MESSAGE } from "../../configs"
import { apiFetch } from "../../auth"
import { useCanAccess, useIsAdmin, useOwnUserId, UserRole } from "../../roles"
import AdminNavBar from "../../components/admin/NavBar"
import RoleSelect from "../../components/admin/RoleSelect"
import "./AdminForms.css"
import "./Users.css"

interface UserRow {
    id: string
    role: UserRole
    email: string | null
    name: string | null
    created_at: string
    last_signed_in_at: string | null
}

function formatDate(value: string): string {
    return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

export default function Users() {
    const isAdmin = useIsAdmin()
    const ownUserId = useOwnUserId()
    const [users, setUsers] = useState<UserRow[] | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
    const [rowLoading, setRowLoading] = useState<Record<string, boolean>>({})
    const [confirmingId, setConfirmingId] = useState<string | null>(null)

    const canList = useCanAccess("GET", "/admin/users")
    const canChangeRole = useCanAccess("PATCH", "/users/x/role")
    const canDelete = useCanAccess("DELETE", "/users/x")

    const loadUsers = async () => {
        setLoadError(null)
        try {
            const response = await apiFetch(`${API_URL}/admin/users`)
            if (!response.ok) {
                throw new ApiError(response.status, "Failed to load users")
            }
            const data: UserRow[] = await response.json()
            setUsers(data)
        } catch (err) {
            setLoadError((err as Error).message)
        }
    }

    useEffect(() => {
        if (canList) {
            loadUsers()
        } else {
            setLoadError(PERMISSION_DENIED_MESSAGE)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canList])

    const handleRoleChange = async (userId: string, role: UserRole) => {
        setRowLoading((prev) => ({ ...prev, [userId]: true }))
        setRowErrors((prev) => ({ ...prev, [userId]: "" }))
        try {
            const response = await apiFetch(`${API_URL}/users/${userId}/role`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role })
            })
            if (!response.ok) {
                throw new ApiError(response.status, "Failed to update role")
            }
            const updated: UserRow = await response.json()
            setUsers((prev) => prev?.map((user) => (user.id === userId ? updated : user)) ?? null)
        } catch (err) {
            setRowErrors((prev) => ({ ...prev, [userId]: (err as Error).message }))
        } finally {
            setRowLoading((prev) => ({ ...prev, [userId]: false }))
        }
    }

    const handleDelete = async (userId: string) => {
        setRowLoading((prev) => ({ ...prev, [userId]: true }))
        setRowErrors((prev) => ({ ...prev, [userId]: "" }))
        try {
            const response = await apiFetch(`${API_URL}/users/${userId}`, {
                method: "DELETE"
            })
            if (!response.ok) {
                throw new ApiError(response.status, "Failed to delete user")
            }
            setUsers((prev) => prev?.filter((user) => user.id !== userId) ?? null)
            setConfirmingId(null)
        } catch (err) {
            setRowErrors((prev) => ({ ...prev, [userId]: (err as Error).message }))
        } finally {
            setRowLoading((prev) => ({ ...prev, [userId]: false }))
        }
    }

    return (
        <div className="center-container-grid">
            <AdminNavBar />
            <div className="page-container">
                <div className="admin-form-page admin-users-page">
                    {!isAdmin ? (
                        <p className="admin-restricted">This page is restricted to admins.</p>
                    ) : (
                        <>
                            <div className="admin-form-hero">
                                <h1>👥 Users</h1>
                                <p>Change a role, or remove someone's access.</p>
                            </div>
                            {loadError && <p className="admin-error">{loadError}</p>}
                            {!loadError && users === null && <p className="admin-users-loading">Loading...</p>}
                            {!loadError && users !== null && (
                                <div className="admin-users-grid">
                                    {users.map((user) => (
                                        <div key={user.id} className={`admin-user-card ${user.id === ownUserId ? "admin-user-card-self" : ""}`}>
                                            <div className="admin-user-card-row admin-user-card-id-row">
                                                <div className="admin-user-identity">
                                                    <span className="admin-user-name">{user.name || "Unnamed user"}</span>
                                                    {user.email && <span className="admin-user-email">{user.email}</span>}
                                                    <code className="admin-user-id" title={user.id}>
                                                        {user.id}
                                                    </code>
                                                </div>
                                                {user.id === ownUserId && <span className="admin-user-you-badge">You</span>}
                                            </div>
                                            {canChangeRole && (
                                                <div className="admin-user-card-row">
                                                    <RoleSelect
                                                        value={user.role}
                                                        onChange={(role) => handleRoleChange(user.id, role)}
                                                    />
                                                </div>
                                            )}
                                            <div className="admin-user-card-row admin-user-card-activity-row">
                                                <span>Joined {formatDate(user.created_at)}</span>
                                                <span>
                                                    {user.last_signed_in_at
                                                        ? `Last seen ${formatDate(user.last_signed_in_at)}`
                                                        : "Never signed in"}
                                                </span>
                                            </div>
                                            {rowErrors[user.id] && (
                                                <p className="admin-error">{rowErrors[user.id]}</p>
                                            )}
                                            <div className="admin-user-card-row admin-user-card-actions-row">
                                                {canDelete && confirmingId !== user.id && (
                                                    <button
                                                        type="button"
                                                        className="admin-danger-button admin-user-delete-button"
                                                        onClick={() => setConfirmingId(user.id)}
                                                        disabled={rowLoading[user.id]}
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                                {canDelete && confirmingId === user.id && (
                                                    <div className="admin-confirm admin-user-confirm">
                                                        <p className="admin-warning">Delete this user?</p>
                                                        <div className="admin-confirm-actions">
                                                            <button type="button" onClick={() => setConfirmingId(null)}>
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="admin-danger-button"
                                                                onClick={() => handleDelete(user.id)}
                                                                disabled={rowLoading[user.id]}
                                                            >
                                                                {rowLoading[user.id] ? "Deleting..." : "Confirm"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {users.length === 0 && <p className="admin-users-loading">No users found.</p>}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
