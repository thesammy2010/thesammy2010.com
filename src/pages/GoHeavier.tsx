import React from "react"

import { API_URL } from "../configs"
import Config from "../components/Config"

interface State {
    configLoaded?: boolean | null
    config?: string
}

export default class GoHeavier extends React.Component<{}, State> {
    constructor(props: {}) {
        super(props)
        this.state = {
            configLoaded: null
        }
    }

    fetchConfig = async () => {
        try {
            const response = await fetch(`${API_URL}/config`)
            const result = await response.json()
            this.setState({ config: JSON.stringify(result), configLoaded: true })
        } catch (error) {
            console.error("Error fetching config:", error)
            this.setState({ configLoaded: false })
        }
    }

    componentDidMount() {
        this.fetchConfig()
    }

    showLoading() {
        switch (this.state.configLoaded) {
            case true:
                return <p>config loaded successfully</p>
            case false:
                return <p>failed to load config</p>
            default:
                return <p>loading...</p>
        }
    }

    render(): React.ReactNode {
        return (
            <div className="center-container-grid">
                <div className="header">
                    <h2>Go Heavier</h2>
                    <p>This is the newly created page using React Router.</p>
                </div>
                <br />

                <div className="header">
                    {this.showLoading()}
                    {!this.state.configLoaded && <button onClick={this.fetchConfig}>Load Config</button>}
                    {this.state.configLoaded && this.state.config != null && <Config config={this.state.config} />}
                </div>
            </div>
        )
    }
}
