import { UserRole } from "../../roles"
import "./RoleSelect.css"

// Squash access comes from being added as a player, not a role, so the old
// squash role is only shown for a user who still has it
const ROLE_OPTIONS: UserRole[] = ["guest", "viewer", "editor", "admin"]

interface Props {
    value: UserRole
    onChange: (role: UserRole) => void
}

export default function RoleSelect({ value, onChange }: Props) {
    const options: UserRole[] = value === "squash" ? ["guest", "squash", ...ROLE_OPTIONS.slice(1)] : ROLE_OPTIONS
    return (
        <div className="role-select" role="radiogroup">
            {options.map((role) => (
                <button
                    key={role}
                    type="button"
                    role="radio"
                    aria-checked={value === role}
                    className={`role-pill role-pill-${role} ${value === role ? "selected" : ""}`}
                    onClick={() => onChange(role)}
                >
                    {role}
                </button>
            ))}
        </div>
    )
}
