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
            <div className="splash__error">
                <p>{errorMessage}</p>
                {/* The usual cause is a stale service worker still serving the
                    previous release's file list, which no reload of the page
                    alone can fix — the worker has to go first. */}
                <button
                    type="button"
                    className="splash__error-button"
                    onClick={() => {
                        const done = () => window.location.reload();
                        if (!("serviceWorker" in navigator)) return done();
                        navigator.serviceWorker.getRegistrations()
                            .then((rs) => Promise.all(rs.map((r) => r.unregister())))
                            .then(() => "caches" in window
                                ? caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k))))
                                : undefined)
                            .then(done, done);
                    }}
                >
                    Neu laden
                </button>
            </div>
        )}
    </div>
);
