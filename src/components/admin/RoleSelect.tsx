import { UserRole } from "../../roles"
import "./RoleSelect.css"

const ROLE_OPTIONS: UserRole[] = ["guest", "viewer", "editor", "admin"]

interface Props {
    value: UserRole
    onChange: (role: UserRole) => void
}

export default function RoleSelect({ value, onChange }: Props) {
    return (
        <div className="role-select" role="radiogroup">
            {ROLE_OPTIONS.map((role) => (
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
