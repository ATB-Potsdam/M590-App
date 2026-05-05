import "./SplashScreen.scss";

const base = import.meta.env.BASE_URL;

interface Props {
    state: "loading" | "ready" | "done" | "error";
    errorMessage?: string;
    loadProgress: number;
    onDismissed: () => void;
}

export const SplashScreen = ({state, errorMessage, loadProgress, onDismissed}: Props) => (
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
        <div className={`splash__progress${state !== "loading" ? " splash__progress--hidden" : ""}`}>
            <div className="splash__progress-bar" style={{width: `${loadProgress}%`}} />
        </div>
        {state === "error" && errorMessage && (
            <p className="splash__error">{errorMessage}</p>
        )}
    </div>
);
