import SignIn from "./SignIn"
import "./SignInPrompt.css"

interface Props {
    message?: string
}

export default function SignInPrompt({ message }: Props) {
    return (
        <div className="signin-prompt">
            <h2>Sign in to continue</h2>
            <p>{message ?? "You need to be signed in to view this page."}</p>
            <div className="signin-prompt-action">
                <SignIn />
            </div>
        </div>
    )
}
