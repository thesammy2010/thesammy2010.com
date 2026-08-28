import React, { useEffect, useState } from "react"

import { API_URL, ApiError, PERMISSION_DENIED_MESSAGE } from "../../configs"
import { apiFetch } from "../../auth"
import { canAccess, useIsAdmin, UserRole } from "../../roles"
import AdminNavBar from "../../components/admin/NavBar"
import RoleSelect from "../../components/admin/RoleSelect"
import "./AdminForms.css"
import "./Users.css"

interface UserRow {
    id: string
    role: UserRole
}

export default function Users() {
    const isAdmin = useIsAdmin()
    const [users, setUsers] = useState<UserRow[] | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
    const [rowLoading, setRowLoading] = useState<Record<string, boolean>>({})
    const [confirmingId, setConfirmingId] = useState<string | null>(null)

    const canList = canAccess("GET", "/admin/users")
    const canChangeRole = canAccess("PATCH", "/users/x/role")
    const canDelete = canAccess("DELETE", "/users/x")

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
                                <div className="admin-users-list">
                                    {users.map((user) => (
                                        <div key={user.id} className="admin-user-row">
                                            <code className="admin-user-id" title={user.id}>
                                                {user.id}
                                            </code>
                                            {canChangeRole && (
                                                <RoleSelect
                                                    value={user.role}
                                                    onChange={(role) => handleRoleChange(user.id, role)}
                                                />
                                            )}
                                            {rowErrors[user.id] && (
                                                <p className="admin-error">{rowErrors[user.id]}</p>
                                            )}
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
