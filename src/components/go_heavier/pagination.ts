// Shared by every page that walks an offset-paged list endpoint
// (/go-heavier/sessions, /go-heavier/workouts, ...) to fetch "all of it".
//
// Offset-based pagination assumes the underlying list doesn't change shape
// mid-walk. It does: a row inserted (or deleted) between two page requests
// shifts everything after it by one, so a page fetched after the shift can
// repeat a row the previous page already returned (or skip one it hasn't
// reached yet). Deleting is rare enough to accept the miss, but duplicates
// are a one-line fix - merge on id rather than trusting pages not to
// overlap.
export function dedupeById<T extends { id: string }>(items: T[]): T[] {
    const seen = new Set<string>()
    return items.filter((item) => {
        if (seen.has(item.id)) {
            return false
        }
        seen.add(item.id)
        return true
    })
}
