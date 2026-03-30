import "./SplashScreen.scss";

const base = import.meta.env.BASE_URL;

interface Props {
    state: "loading" | "done" | "error";
    errorMessage?: string;
    onDismissed: () => void;
}

export const SplashScreen = ({state, errorMessage, onDismissed}: Props) => (
    <div className={`splash${state === "done" ? " splash--flying" : ""}`}>
        <div
            className="splash__logos"
            onAnimationEnd={state === "done" ? onDismissed : undefined}
        >
            <a href="https://www.atb-potsdam.de" target="_blank" rel="noopener noreferrer">
                <img src={`${base}atb_logo.svg`} alt="ATB" className="splash__logo" />
            </a>
            <a href="https://www.dwa.de" target="_blank" rel="noopener noreferrer">
                <img src={`${base}dwa-logo.svg`} alt="DWA" className="splash__logo" />
            </a>
        </div>
        {state === "loading" && (
            <p className="splash__hint">Daten werden geladen…</p>
        )}
        {state === "error" && errorMessage && (
            <p className="splash__error">{errorMessage}</p>
        )}
    </div>
);
