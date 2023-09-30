import React from "react"
import "./Home.css"
import Footer from "../components/Footer"

interface Props {}

interface State {
    active: boolean
}

export default class HomePage extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = {
            active: false
        }
    }

    toggle = () => {
        this.setState({ active: !this.state.active })
    }

    render(): React.ReactNode {
        return (
            <div>
                <div className="header">
                    <h1>TheSammy2010</h1>
                </div>
                <div id="image">
                    <img
                        src={process.env.PUBLIC_URL + "/icons/logo.svg"}
                        className="wrapper-logo"
                        alt="TheSammy2010 Logo"
                        onClick={this.toggle}
                        style={{
                            animationPlayState: this.state.active ? "paused" : "running"
                        }}
                    ></img>
                </div>
                <Footer />
            </div>
        )
    }
}
