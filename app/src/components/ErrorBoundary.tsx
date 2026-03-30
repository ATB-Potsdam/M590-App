import {Component, type ErrorInfo, type ReactNode} from "react";

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
                <div style={{padding: "24px 16px", maxWidth: 480, margin: "0 auto"}}>
                    <h2>Etwas ist schiefgelaufen</h2>
                    <p style={{color: "#555", fontSize: 14}}>
                        Ein unerwarteter Fehler ist aufgetreten. Die gespeicherten Daten könnten
                        beschädigt sein.
                    </p>
                    <details style={{marginTop: 12, fontSize: 12, color: "#888"}}>
                        <summary>Details</summary>
                        <pre style={{whiteSpace: "pre-wrap", wordBreak: "break-all"}}>
                            {this.state.error.message}
                        </pre>
                    </details>
                    <div style={{display: "flex", gap: 8, marginTop: 20}}>
                        <button onClick={() => this.setState({error: null})}>
                            Erneut versuchen
                        </button>
                        <button
                            style={{background: "#c62828", color: "#fff", border: "none", borderRadius: 4, padding: "6px 12px", cursor: "pointer"}}
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
