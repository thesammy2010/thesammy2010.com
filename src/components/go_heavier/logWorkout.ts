// The logic behind the log-a-workout popup, kept apart from the markup.

export interface SetRow {
    // Stable across reorders and duplication, so React keys stay put.
    key: string
    exerciseId: string
    repetitions: string
    weightKg: string
    barWeightKg: string
    supplementaryWeightKg: string
    notes: string
}

export interface WorkoutPayload {
    session_id: string
    exercise_id: string
    index: number
    repetitions: number
    weight_kg: number
    bar_weight_kg: number | null
    supplementary_weight_kg: number | null
    notes: string | null
}

// The API takes at most ten sets per request.
export const MAX_WORKOUTS_PER_REQUEST = 10

export function emptyRow(key: string, exerciseId: string = ""): SetRow {
    return {
        key,
        exerciseId,
        repetitions: "10",
        weightKg: "",
        barWeightKg: "",
        supplementaryWeightKg: "",
        notes: ""
    }
}

// How many sets a session already holds of each exercise, so added sets carry
// on the numbering rather than restarting at one.
export function countByExercise(sets: Array<{ exercise_id: string }>): Record<string, number> {
    const counts: Record<string, number> = {}
    sets.forEach(set => {
        counts[set.exercise_id] = (counts[set.exercise_id] ?? 0) + 1
    })
    return counts
}

// A set's index counts within its own exercise, not across the session, so the
// third row of bench press is index 3 even with other exercises interleaved.
export function setIndexes(rows: SetRow[], alreadyLogged: Record<string, number> = {}): number[] {
    const seen: Record<string, number> = { ...alreadyLogged }

    return rows.map(row => {
        const next = (seen[row.exerciseId] ?? 0) + 1
        seen[row.exerciseId] = next
        return next
    })
}

export function chunk<T>(items: T[], size: number): T[][] {
    if (size < 1) {
        return [items]
    }

    const chunks: T[][] = []
    for (let start = 0; start < items.length; start += size) {
        chunks.push(items.slice(start, start + size))
    }
    return chunks
}

// Matches on every word typed, in any order, so "press over" finds
// "Overhead Press".
export function filterExercises<T extends { name: string }>(exercises: T[], query: string): T[] {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    if (terms.length === 0) {
        return exercises
    }

    return exercises.filter(exercise => {
        const name = exercise.name.toLowerCase()
        return terms.every(term => name.includes(term))
    })
}

// Bounds mirror the API's, so a mistake reads as a message rather than a 422.
export function validateRow(row: SetRow, position: number): string | null {
    const label = `Set ${position + 1}`

    if (!row.exerciseId) {
        return `${label}: pick an exercise`
    }

    const repetitions = Number(row.repetitions)
    if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 99) {
        return `${label}: repetitions must be a whole number between 1 and 99`
    }

    const weight = Number(row.weightKg)
    if (row.weightKg.trim() === "" || Number.isNaN(weight) || weight <= -1000 || weight >= 1000) {
        return `${label}: weight must be between -999 and 999 kg`
    }

    if (row.barWeightKg.trim() !== "") {
        const bar = Number(row.barWeightKg)
        // The API rejects a bar weight of zero outright; leave it blank instead.
        if (Number.isNaN(bar) || bar <= 0 || bar >= 100) {
            return `${label}: bar weight must be between 0 and 99 kg, or blank`
        }
    }

    if (row.supplementaryWeightKg.trim() !== "") {
        const supplementary = Number(row.supplementaryWeightKg)
        if (Number.isNaN(supplementary) || supplementary <= -100 || supplementary >= 100) {
            return `${label}: supplementary weight must be between -99 and 99 kg, or blank`
        }
    }

    if (row.notes.length > 512) {
        return `${label}: notes must be 512 characters or fewer`
    }

    return null
}

export function validateRows(rows: SetRow[]): string | null {
    if (rows.length === 0) {
        return "Add at least one set"
    }

    for (let position = 0; position < rows.length; position++) {
        const problem = validateRow(rows[position], position)
        if (problem) {
            return problem
        }
    }

    return null
}

// Blank optional weights go as null: the API takes null for "no bar", but
// rejects a zero.
function optionalNumber(value: string): number | null {
    return value.trim() === "" ? null : Number(value)
}

export function buildPayloads(
    rows: SetRow[],
    sessionId: string,
    alreadyLogged: Record<string, number> = {}
): WorkoutPayload[] {
    const indexes = setIndexes(rows, alreadyLogged)

    return rows.map((row, position) => ({
        session_id: sessionId,
        exercise_id: row.exerciseId,
        index: indexes[position],
        repetitions: Number(row.repetitions),
        weight_kg: Number(row.weightKg),
        bar_weight_kg: optionalNumber(row.barWeightKg),
        supplementary_weight_kg: optionalNumber(row.supplementaryWeightKg),
        notes: row.notes.trim() ? row.notes.trim() : null
    }))
}

// datetime-local hands back local wall-clock time with no zone; send the
// instant it actually means.
export function toInstant(localDateTime: string): string {
    return new Date(localDateTime).toISOString()
}

export function nowForInput(now: Date): string {
    const pad = (value: number) => String(value).padStart(2, "0")
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
        + `T${pad(now.getHours())}:${pad(now.getMinutes())}`
}
