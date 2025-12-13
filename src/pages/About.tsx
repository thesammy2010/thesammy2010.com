import React from "react"

export default class About extends React.Component {
    render(): React.ReactNode {
        return (
            <div className="center-container-grid">
                <div className="header">
                    <h2>About this site</h2>
                    <p>This site was created for me to learn React</p>
                </div>
            </div>
        )
    }
}
