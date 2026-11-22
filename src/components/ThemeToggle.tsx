import { nextTheme, setTheme, ThemeChoice, useTheme } from "../theme"

const LABELS: Record<ThemeChoice, { icon: string; name: string }> = {
    system: { icon: "🖥️", name: "System" },
    light: { icon: "☀️", name: "Light" },
    dark: { icon: "🌙", name: "Dark" }
}

// Light, dark, or as the device has it, round in turn.
export default function ThemeToggle() {
    const { choice } = useTheme()
    const { icon, name } = LABELS[choice]
    return (
        <button
            type="button"
            className="site-theme-toggle"
            onClick={() => setTheme(nextTheme(choice))}
            aria-label={`Theme: ${name}. Switch to ${LABELS[nextTheme(choice)].name.toLowerCase()}`}
            title={`Theme: ${name}`}
        >
            <span aria-hidden="true">{icon}</span>
            <span className="site-theme-toggle-name">{name}</span>
        </button>
    )
}
