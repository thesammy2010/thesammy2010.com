import React, { useState } from "react"

import { API_URL, ApiError, PERMISSION_DENIED_MESSAGE } from "../../configs"
import { apiFetch } from "../../auth"
import { useCanAccess } from "../../roles"
import GoHeavierNavBar from "../../components/go_heavier/NavBar"
import "../GoHeavier.css"
import "./Import.css"

type MigrationTable = "locations" | "exercises" | "sessions" | "workouts"

const TABLES: { value: MigrationTable; label: string }[] = [
    { value: "locations", label: "📍 Locations" },
    { value: "exercises", label: "🏋️ Exercises" },
    { value: "sessions", label: "🗓️ Sessions" },
    { value: "workouts", label: "📋 Workouts" }
]

interface TableMigrationResult {
    table: MigrationTable
    rows: number
    written: number
}

interface RunMigrationResponse {
    dry_run: boolean
    results: TableMigrationResult[]
}

// Sent as a plain <input type="datetime-local"> value (local time, no
// timezone); the backend wants an aware ISO datetime, so this attaches the
// browser's own offset rather than silently treating it as UTC.
function toAwareIso(localValue: string): string | undefined {
    if (!localValue) {
        return undefined
    }
    return new Date(localValue).toISOString()
}

export default function Import() {
    const canImport = useCanAccess("POST", "/go-heavier/migrations")
    const [selectedTables, setSelectedTables] = useState<Set<MigrationTable>>(
        new Set(TABLES.map((table) => table.value))
    )
    const [dryRun, setDryRun] = useState(true)
    const [workoutsAfter, setWorkoutsAfter] = useState("")
    const [workoutsBefore, setWorkoutsBefore] = useState("")
    const [workoutsRowStart, setWorkoutsRowStart] = useState("")
    const [workoutsRowEnd, setWorkoutsRowEnd] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [result, setResult] = useState<RunMigrationResponse | null>(null)

    const toggleTable = (table: MigrationTable) => {
        setSelectedTables((prev) => {
            const next = new Set(prev)
            if (next.has(table)) {
                next.delete(table)
            } else {
                next.add(table)
            }
            return next
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setResult(null)
        try {
            const response = await apiFetch(`${API_URL}/go-heavier/migrations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tables: Array.from(selectedTables),
                    dry_run: dryRun,
                    workouts_after: toAwareIso(workoutsAfter),
                    workouts_before: toAwareIso(workoutsBefore),
                    workouts_row_start: workoutsRowStart ? Number(workoutsRowStart) : undefined,
                    workouts_row_end: workoutsRowEnd ? Number(workoutsRowEnd) : undefined
                })
            })
            if (!response.ok) {
                throw new ApiError(
                    response.status,
                    response.status === 503
                        ? "The Google Sheet isn't configured on the server"
                        : "Failed to run the import"
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
        <div className="center-container-grid">
            <GoHeavierNavBar />
            <div className="page-container">
                <div className="import-page">
                    {!canImport ? (
                        <div className="error-container">
                            <h2>Restricted</h2>
                            <p className="error-message">{PERMISSION_DENIED_MESSAGE}</p>
                        </div>
                    ) : (
                        <>
                            <div className="import-hero">
                                <h1>📥 Import from Google Sheet</h1>
                                <p>
                                    Loads locations, exercises, sessions and workouts from the Go
                                    Heavier Google Sheet. Existing rows are updated in place.
                                </p>
                            </div>
                            <form onSubmit={handleSubmit} className="import-form">
                                <fieldset className="import-tables">
                                    <legend>Tables to import</legend>
                                    {TABLES.map((table) => (
                                        <label key={table.value} className="import-table-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={selectedTables.has(table.value)}
                                                onChange={() => toggleTable(table.value)}
                                            />
                                            <span>{table.label}</span>
                                        </label>
                                    ))}
                                </fieldset>

                                <label className="import-dry-run">
                                    <input
                                        type="checkbox"
                                        checked={dryRun}
                                        onChange={(e) => setDryRun(e.target.checked)}
                                    />
                                    <span>Dry run - read the sheet but don't write anything</span>
                                </label>

                                {selectedTables.has("workouts") && (
                                    <fieldset className="import-workout-range">
                                        <legend>Workouts range (optional)</legend>
                                        <label>
                                            Performed at or after
                                            <input
                                                type="datetime-local"
                                                value={workoutsAfter}
                                                onChange={(e) => setWorkoutsAfter(e.target.value)}
                                            />
                                        </label>
                                        <label>
                                            Performed at or before
                                            <input
                                                type="datetime-local"
                                                value={workoutsBefore}
                                                onChange={(e) => setWorkoutsBefore(e.target.value)}
                                            />
                                        </label>
                                        <label>
                                            First sheet row
                                            <input
                                                type="number"
                                                min={0}
                                                value={workoutsRowStart}
                                                onChange={(e) => setWorkoutsRowStart(e.target.value)}
                                                placeholder="e.g. 0"
                                            />
                                        </label>
                                        <label>
                                            Last sheet row
                                            <input
                                                type="number"
                                                min={1}
                                                value={workoutsRowEnd}
                                                onChange={(e) => setWorkoutsRowEnd(e.target.value)}
                                                placeholder="Defaults to the end of the sheet"
                                            />
                                        </label>
                                    </fieldset>
                                )}

                                {error && <p className="error-message">{error}</p>}

                                {result && (
                                    <div className="import-results">
                                        <h3>{result.dry_run ? "Dry run results" : "Import complete"}</h3>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Table</th>
                                                    <th>Rows read</th>
                                                    <th>Rows written</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.results.map((tableResult) => (
                                                    <tr key={tableResult.table}>
                                                        <td>{tableResult.table}</td>
                                                        <td>{tableResult.rows}</td>
                                                        <td>{tableResult.written}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <button type="submit" disabled={loading || selectedTables.size === 0}>
                                    {loading ? "Running..." : dryRun ? "Preview Import" : "Run Import"}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
