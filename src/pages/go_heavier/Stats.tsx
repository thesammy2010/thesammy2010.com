import React from "react"
import { useNavigate } from "react-router-dom"

import GoHeavierNavBar from "../../components/go_heavier/NavBar"
import BarChart, { BarChartPoint } from "../../components/go_heavier/BarChart"
import { API_URL } from "../../configs"
import {
    MonthlyTotals,
    SessionStats,
    SessionSummary,
    buildMonthlyTotals,
    fetchAllSessions,
    fetchSessionStats
} from "../../components/go_heavier/sessions"
import {
    formatCount,
    formatDays,
    formatMonthYear,
    formatTonnes,
    formatWeight
} from "../../components/go_heavier/format"
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

    toPoints = (months: MonthlyTotals[], key: keyof Omit<MonthlyTotals, "label">): BarChartPoint[] =>
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
                                    {formatCount(item.sessions)} sessions
                                </span>
                            </div>
                            <div className="top-list-bar-track">
                                <div
                                    className="top-list-bar"
                                    style={{ width: `${(item.sessions / most) * 100}%` }}
                                />
                            </div>
                            <div className="top-list-meta">
                                {formatCount(item.sets)} sets · {formatCount(item.repetitions)} reps ·{" "}
                                {formatWeight(item.volume_kg)}
                            </div>
                        </li>
                    ))}
                </ol>
            </div>
        )
    }

    render(): React.ReactNode {
        const { stats, totals } = this.state
        const months = buildMonthlyTotals(this.state.sessions ?? [])
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
                                    Every session logged, from {formatMonthYear(stats.first_session)} to{" "}
                                    {formatMonthYear(stats.last_session)}.
                                </p>
                            </div>

                            <div className="stats-grid">
                                <div className="stat-tile">
                                    <div className="stat-tile-value">{formatCount(stats.sessions)}</div>
                                    <div className="stat-tile-label">Sessions</div>
                                </div>
                                <div className="stat-tile">
                                    <div className="stat-tile-value">{formatCount(totals?.total_sets ?? 0)}</div>
                                    <div className="stat-tile-label">Sets</div>
                                </div>
                                <div className="stat-tile">
                                    <div className="stat-tile-value">{formatCount(totals?.total_repetitions ?? 0)}</div>
                                    <div className="stat-tile-label">Reps</div>
                                </div>
                                <div className="stat-tile">
                                    <div className="stat-tile-value">{formatTonnes(totals?.total_volume_kg ?? 0)}</div>
                                    <div className="stat-tile-label">Total volume</div>
                                </div>
                                <div className="stat-tile">
                                    <div className="stat-tile-value">{formatWeight(totals?.heaviest_weight_kg ?? null)}</div>
                                    <div className="stat-tile-label">Heaviest lift</div>
                                </div>
                                <div className="stat-tile">
                                    <div className="stat-tile-value">{formatDays(stats.average_days_between_sessions)}</div>
                                    <div className="stat-tile-label">Typical gap</div>
                                </div>
                            </div>

                            <div className="charts-grid">
                                <BarChart
                                    title="Visits per month"
                                    subtitle="Sessions logged in each month"
                                    data={this.toPoints(months, "visits")}
                                    formatValue={formatCount}
                                    labelEvery={labelEvery}
                                />
                                <BarChart
                                    title="Sets per month"
                                    subtitle="Every set logged in each month"
                                    data={this.toPoints(months, "sets")}
                                    formatValue={formatCount}
                                    labelEvery={labelEvery}
                                />
                                <BarChart
                                    title="Volume per month"
                                    subtitle="Weight moved, reps multiplied by weight"
                                    data={this.toPoints(months, "volume_kg")}
                                    formatValue={formatTonnes}
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
                                        formatValue={formatCount}
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
}

// Wrapper component to use React Router hooks
export default function StatsWithNavigate() {
    const navigate = useNavigate()
    return <Stats navigate={navigate} />
}
