import React from "react"

import "./BarChart.css"

export interface BarChartPoint {
    label: string
    value: number
}

interface Props {
    title: string
    subtitle?: string
    data: BarChartPoint[]
    formatValue: (value: number) => string
    // Column axis labels collide once there are many; show every nth.
    labelEvery?: number
}

interface State {
    hovered: number | null
    showTable: boolean
}

const TICK_COUNT = 4

export default class BarChart extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {
            hovered: null,
            showTable: false
        }
    }

    // A round number at or above the tallest bar, so the ticks read cleanly.
    niceMax = (max: number): number => {
        if (max <= 0) {
            return 1
        }

        const magnitude = Math.pow(10, Math.floor(Math.log10(max)))
        const steps = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]
        const step = steps.find(candidate => max <= candidate * magnitude) ?? 10

        return step * magnitude
    }

    render(): React.ReactNode {
        const { title, subtitle, data, formatValue, labelEvery = 1 } = this.props
        const max = this.niceMax(Math.max(...data.map(point => point.value), 0))
        const peak = data.reduce(
            (best, point, index) => (point.value > data[best].value ? index : best),
            0
        )

        const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => (max / TICK_COUNT) * i)

        return (
            <figure className="chart">
                <figcaption className="chart-caption">
                    <div>
                        <h4 className="chart-title">{title}</h4>
                        {subtitle && <p className="chart-subtitle">{subtitle}</p>}
                    </div>
                    <button
                        type="button"
                        className="chart-toggle"
                        onClick={() => this.setState({ showTable: !this.state.showTable })}
                    >
                        {this.state.showTable ? "Chart" : "Table"}
                    </button>
                </figcaption>

                {this.state.showTable ? (
                    <div className="chart-table-wrapper">
                        <table className="chart-table">
                            <thead>
                                <tr>
                                    <th>Period</th>
                                    <th>{title}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map(point => (
                                    <tr key={point.label}>
                                        <td>{point.label}</td>
                                        <td>{formatValue(point.value)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <>
                        <div className="chart-plot">
                            <div className="chart-scale">
                                {ticks.slice().reverse().map(tick => (
                                    <span key={tick} className="chart-tick">{formatValue(tick)}</span>
                                ))}
                            </div>

                            <div className="chart-area">
                                {ticks.map(tick => (
                                    <div
                                        key={tick}
                                        className="chart-gridline"
                                        style={{ bottom: `${(tick / max) * 100}%` }}
                                    />
                                ))}

                                <div className="chart-bars">
                                    {data.map((point, index) => (
                                        <div
                                            key={point.label}
                                            className="chart-band"
                                            onMouseEnter={() => this.setState({ hovered: index })}
                                            onMouseLeave={() => this.setState({ hovered: null })}
                                        >
                                            <div
                                                className="chart-bar"
                                                style={{ height: `${(point.value / max) * 100}%` }}
                                            >
                                                {index === peak && point.value > 0 && (
                                                    <span className="chart-peak-label">
                                                        {formatValue(point.value)}
                                                    </span>
                                                )}
                                                {this.state.hovered === index && (
                                                    <div className={
                                                        // A tall bar has no room above it, so the
                                                        // tooltip drops inside instead of overflowing.
                                                        point.value / max > 0.7
                                                            ? "chart-tooltip chart-tooltip-inside"
                                                            : "chart-tooltip"
                                                    }>
                                                        <strong>{point.label}</strong>
                                                        <span>{formatValue(point.value)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="chart-axis">
                            {data.map((point, index) => (
                                <span key={point.label} className="chart-axis-label">
                                    {index % labelEvery === 0 ? point.label : ""}
                                </span>
                            ))}
                        </div>
                    </>
                )}
            </figure>
        )
    }
}
