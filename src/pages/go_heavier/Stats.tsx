import React from "react"
import { useNavigate } from "react-router-dom"

import GoHeavierNavBar from "../../components/go_heavier/NavBar"
import BarChart, { BarChartPoint } from "../../components/go_heavier/BarChart"
import { API_URL } from "../../configs"
import {
    SessionStats,
    SessionSummary,
    fetchAllSessions,
    fetchSessionStats
} from "../../components/go_heavier/sessions"
import "../GoHeavier.css"
import "../../components/go_heavier/Stats.css"
import "./Sessions.css"
import "./StatsPage.css"

interface RankedItem {
    name: string
    sessions: number
    sets: number
    repetitions: number
    volume_kg: number
}

interface WorkoutTotals {
    total_sets: number
    total_repetitions: number
    total_volume_kg: number
    heaviest_weight_kg: number | null
    distinct_exercises: number
    distinct_locations: number
    top_exercises?: RankedItem[]
    top_locations?: RankedItem[]
}

interface MonthPoint {
    label: string
    visits: number
    sets: number
    repetitions: number
    volume_kg: number
}

interface Props {
    navigate: (path: string) => void
}

interface State {
    sessions: SessionSummary[] | null
    stats: SessionStats | null
    totals: WorkoutTotals | null
    loaded: boolean | null
    isRefreshing: boolean
}

export class Stats extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {
            sessions: null,
            stats: null,
            totals: null,
            loaded: null,
            isRefreshing: false
        }
    }

    componentDidMount() {
        this.fetchEverything()
    }

    fetchEverything = async (minDuration: number = 300) => {
        const startedAt = Date.now()
        const waitOut = () => new Promise<void>(resolve =>
            setTimeout(resolve, Math.max(0, minDuration - (Date.now() - startedAt)))
        )

        this.setState({ isRefreshing: true })
        try {
            const [sessions, stats, totalsRes] = await Promise.all([
                fetchAllSessions(),
                fetchSessionStats(),
                fetch(`${API_URL}/go-heavier/workouts/stats`)
            ])

            if (!totalsRes.ok) {
                throw new Error("Failed to load totals")
            }
            const totals = await totalsRes.json()

            await waitOut()
            this.setState({ sessions, stats, totals, loaded: true, isRefreshing: false })
        } catch (error) {
            console.error("Error fetching stats:", error)
            await waitOut()
            this.setState({ loaded: false, isRefreshing: false })
        }
    }

    handleRefresh = () => {
        this.fetchEverything()
    }

    handleRetry = () => {
        // Keep the loading state on screen long enough to be visible
        this.fetchEverything(1000)
    }

    formatCount = (value: number): string => Math.round(value).toLocaleString()

    formatWeight = (value: number | null): string =>
        value === null || value === undefined ? "—" : `${Math.round(value).toLocaleString()} kg`

    // Tonnes keep the volume axis readable; kilogram totals run to six figures.
    formatTonnes = (value: number): string => `${(value / 1000).toFixed(1)}t`

    formatDays = (value: number | null): string =>
        value === null || value === undefined ? "—" : `${value.toFixed(1)} days`

    // Every month between the first and last session, including the empty ones —
    // dropping a quiet month would flatter the trend.
    getMonths = (): MonthPoint[] => {
        const sessions = this.state.sessions ?? []
        if (sessions.length === 0) {
            return []
        }

        const times = sessions.map(session => new Date(session.workout_time))
        const first = new Date(Math.min(...times.map(time => time.getTime())))
        const last = new Date(Math.max(...times.map(time => time.getTime())))

        const months: MonthPoint[] = []
        const cursor = new Date(first.getFullYear(), first.getMonth(), 1)
        const end = new Date(last.getFullYear(), last.getMonth(), 1)

        while (cursor <= end) {
            const year = cursor.getFullYear()
            const month = cursor.getMonth()

            const inMonth = sessions.filter(session => {
                const when = new Date(session.workout_time)
                return when.getFullYear() === year && when.getMonth() === month
            })

            months.push({
                label: cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
                visits: inMonth.length,
                sets: inMonth.reduce((total, session) => total + session.sets, 0),
                repetitions: inMonth.reduce((total, session) => total + session.repetitions, 0),
                volume_kg: inMonth.reduce((total, session) => total + session.volume_kg, 0)
            })

            cursor.setMonth(cursor.getMonth() + 1)
        }

        return months
    }

    toPoints = (months: MonthPoint[], key: keyof Omit<MonthPoint, "label">): BarChartPoint[] =>
        months.map(month => ({ label: month.label, value: month[key] }))

    renderRanked = (title: string, items: RankedItem[]) => {
        const most = Math.max(...items.map(item => item.sessions), 1)

        return (
            <div className="detail-card">
                <h4 className="top-list-title">{title}</h4>
                <ol className="top-list">
                    {items.map(item => (
                        <li key={item.name} className="top-list-item">
                            <div className="top-list-head">
                                <span className="top-list-name">{item.name}</span>
                                <span className="top-list-metric">
                                    {this.formatCount(item.sessions)} sessions
                                </span>
                            </div>
                            <div className="top-list-bar-track">
                                <div
                                    className="top-list-bar"
                                    style={{ width: `${(item.sessions / most) * 100}%` }}
                                />
                            </div>
                            <div className="top-list-meta">
                                {this.formatCount(item.sets)} sets · {this.formatCount(item.repetitions)} reps ·{" "}
                                {this.formatWeight(item.volume_kg)}
                            </div>
                        </li>
                    ))}
                </ol>
            </div>
        )
    }

    render(): React.ReactNode {
        const { stats, totals } = this.state
        const months = this.getMonths()
        // 13 months of labels collide on a narrow screen; thin them out.
        const labelEvery = months.length > 12 ? 2 : 1
        const weekdays = stats?.by_weekday ?? []

        return (
            <div className="center-container-grid">
                <GoHeavierNavBar />
                <div className="page-container">
                    {this.state.loaded && !this.state.isRefreshing && (
                        <button
                            onClick={this.handleRefresh}
                            className="refresh-arrow-button"
                            title="Refresh"
                        >
                            ↻
                        </button>
                    )}

                    {this.state.loaded === null && (
                        <div className="loading-spinner">
                            <div className="spinner"></div>
                        </div>
                    )}

                    {this.state.loaded === false && (
                        <div className={`error-container ${this.state.isRefreshing ? 'retrying' : ''}`}>
                            <h2>Failed to Load Stats</h2>
                            <p className="error-message">Unable to fetch stats from server</p>
                            <button onClick={this.handleRetry} disabled={this.state.isRefreshing}>
                                {this.state.isRefreshing ? (
                                    <>
                                        <span className="button-spinner"></span>
                                        Retrying...
                                    </>
                                ) : 'Retry'}
                            </button>
                        </div>
                    )}

                    {this.state.loaded && stats && (
                        <div className={`stats-page ${this.state.isRefreshing ? 'refreshing' : ''}`}>
                            <div className="dashboard-hero">
                                <h1>📈 Training Stats</h1>
                                <p className="dashboard-tagline">
                                    Every session logged, from {this.formatMonth(stats.first_session)} to{" "}
                                    {this.formatMonth(stats.last_session)}.
                                </p>
                            </div>

                            <div className="stats-grid">
                                <div className="stat-tile">
                                    <div className="stat-tile-value">{this.formatCount(stats.sessions)}</div>
                                    <div className="stat-tile-label">Sessions</div>
                                </div>
                                <div className="stat-tile">
                                    <div className="stat-tile-value">{this.formatCount(totals?.total_sets ?? 0)}</div>
                                    <div className="stat-tile-label">Sets</div>
                                </div>
                                <div className="stat-tile">
                                    <div className="stat-tile-value">{this.formatCount(totals?.total_repetitions ?? 0)}</div>
                                    <div className="stat-tile-label">Reps</div>
                                </div>
                                <div className="stat-tile">
                                    <div className="stat-tile-value">{this.formatTonnes(totals?.total_volume_kg ?? 0)}</div>
                                    <div className="stat-tile-label">Total volume</div>
                                </div>
                                <div className="stat-tile">
                                    <div className="stat-tile-value">{this.formatWeight(totals?.heaviest_weight_kg ?? null)}</div>
                                    <div className="stat-tile-label">Heaviest lift</div>
                                </div>
                                <div className="stat-tile">
                                    <div className="stat-tile-value">{this.formatDays(stats.average_days_between_sessions)}</div>
                                    <div className="stat-tile-label">Typical gap</div>
                                </div>
                            </div>

                            <div className="charts-grid">
                                <BarChart
                                    title="Visits per month"
                                    subtitle="Sessions logged in each month"
                                    data={this.toPoints(months, "visits")}
                                    formatValue={this.formatCount}
                                    labelEvery={labelEvery}
                                />
                                <BarChart
                                    title="Sets per month"
                                    subtitle="Every set logged in each month"
                                    data={this.toPoints(months, "sets")}
                                    formatValue={this.formatCount}
                                    labelEvery={labelEvery}
                                />
                                <BarChart
                                    title="Volume per month"
                                    subtitle="Weight moved, reps multiplied by weight"
                                    data={this.toPoints(months, "volume_kg")}
                                    formatValue={this.formatTonnes}
                                    labelEvery={labelEvery}
                                />
                                {weekdays.length > 0 && (
                                    <BarChart
                                        title="Visits by day of the week"
                                        subtitle="Which days you train on"
                                        data={weekdays.map(day => ({
                                            label: day.weekday.slice(0, 3),
                                            value: day.sessions
                                        }))}
                                        formatValue={this.formatCount}
                                    />
                                )}
                            </div>

                            <div className="stats-detail">
                                {(totals?.top_exercises ?? []).length > 0 &&
                                    this.renderRanked("Most trained exercises", totals!.top_exercises!)}
                                {(totals?.top_locations ?? []).length > 0 &&
                                    this.renderRanked("Most visited gyms", totals!.top_locations!)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    formatMonth = (value: string | null): string =>
        !value ? "—" : new Date(value).toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

// Wrapper component to use React Router hooks
export default function StatsWithNavigate() {
    const navigate = useNavigate()
    return <Stats navigate={navigate} />
}
