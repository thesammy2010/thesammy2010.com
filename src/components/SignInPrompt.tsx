import "./SignInPrompt.css"

interface Props {
    message?: string
}

// Says what signing in is for. The buttons themselves are in the nav bar,
// at the top of every page, so they aren't repeated here.
export default function SignInPrompt({ message }: Props) {
    return (
        <div className="signin-prompt">
            <h2>Sign in to continue</h2>
            <p>{message ?? "You need to be signed in to view this page."}</p>
            <p className="signin-prompt-where">
                <span aria-hidden="true">↑ </span>Sign in with Google or Apple at the top of the page.
            </p>
        </div>
    )
}
