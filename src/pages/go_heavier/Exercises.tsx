import React from "react"
import GoHeavierNavBar from "../../components/go_heavier/NavBar"
import "./Exercises.css"

export default class Exercises extends React.Component {
    render(): React.ReactNode {
        return (
            <div className="center-container-grid">
                <GoHeavierNavBar />
                <div className="page-container">
                    <br />
                    <div className="header">
                        <h2>Exercises Page</h2>
                        <p>This is the Exercises page.</p>
                    </div>
                </div>
            </div>
        )
    }
}
