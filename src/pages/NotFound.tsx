import { Link } from "react-router-dom"
import "./NotFound.css"

export default function NotFound() {
    return (
        <div className="not-found">
            <h1>Page Not Found</h1>
            <h2>Sorry, nothing was found on this page. You can go back to the home page by clicking below.</h2>
            <p>
                <Link to="/">click here</Link>
            </p>
        </div>
    )
}
