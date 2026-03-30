import {Component, type ErrorInfo, type ReactNode} from "react";
import "./ErrorBoundary.scss";

interface Props {
    children: ReactNode;
}

interface State {
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = {error: null};

    static getDerivedStateFromError(error: Error): State {
        return {error};
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("ErrorBoundary caught:", error, info);
    }

    render() {
        if (this.state.error) {
            return (
                <div className="error-boundary">
                    <h2>Etwas ist schiefgelaufen</h2>
                    <p className="error-boundary__message">
                        Ein unerwarteter Fehler ist aufgetreten. Die gespeicherten Daten könnten
                        beschädigt sein.
                    </p>
                    <details className="error-boundary__details">
                        <summary>Details</summary>
                        <pre className="error-boundary__stack">
                            {this.state.error.message}
                        </pre>
                    </details>
                    <div className="error-boundary__actions">
                        <button onClick={() => this.setState({error: null})}>
                            Erneut versuchen
                        </button>
                        <button
                            className="error-boundary__reset-btn"
                            onClick={() => {
                                localStorage.clear();
                                location.reload();
                            }}
                        >
                            Daten zurücksetzen
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
