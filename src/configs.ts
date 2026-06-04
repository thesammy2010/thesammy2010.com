export const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"

export function countryCodeToEmoji(countryCode: string): string {
    const codePoints = countryCode
        .toUpperCase()
        .split("")
        .map((char) => 127397 + char.charCodeAt(0))
    return String.fromCodePoint(...codePoints)
}
