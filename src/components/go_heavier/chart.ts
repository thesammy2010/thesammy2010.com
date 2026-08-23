// Chart maths kept apart from the markup so it can be reasoned about on its own.

const NICE_STEPS = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]

// The smallest "round" number at or above a value.
function niceStep(value: number): number {
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
    const step = NICE_STEPS.find(candidate => value <= candidate * magnitude) ?? 10
    return step * magnitude
}

// The top of the axis: a round step multiplied by the tick count, so every tick
// lands on a clean number AND the tallest column still fills most of the plot.
// Sizing the maximum directly would give an axis like 12.5 across four ticks.
export function niceMax(max: number, tickCount: number = 4): number {
    if (!Number.isFinite(max) || max <= 0) {
        return 1
    }

    const ticks = Math.max(1, tickCount)
    return niceStep(max / ticks) * ticks
}

// Evenly spaced tick values from zero up to and including the maximum.
export function axisTicks(max: number, count: number): number[] {
    if (count < 1) {
        return [0, max]
    }
    return Array.from({ length: count + 1 }, (_, index) => (max / count) * index)
}

// The index of the tallest point, which is the only one that gets a direct label.
export function peakIndex(values: number[]): number {
    if (values.length === 0) {
        return -1
    }
    return values.reduce((best, value, index) => (value > values[best] ? index : best), 0)
}
