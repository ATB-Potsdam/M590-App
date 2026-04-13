import {useEffect, useRef, useState} from 'react';
import {Navigate, Route, Routes} from 'react-router';
import "./App.scss";
import {BottomNav} from './components/BottomNav';
import {ErrorBoundary} from './components/ErrorBoundary';
import {LogoBar} from './components/LogoBar';
import {Messages} from './components/Messages';
import {OnboardingOverlay} from './components/OnboardingOverlay';
import {SplashScreen} from './components/SplashScreen';
import {refreshClimateData, useFarm} from './hooks/useFarm';
import {useIsScrolledToBottom} from './hooks/useIsScrolledToBottom';
import {loadClimateLayerFromPublic, loadNfkweLayerFromPublic} from './lib/polylookup';
import {createRasterLookup, et0RasterUrl, precipRasterUrl} from './lib/rasterData';
import {AssignmentPage} from './pages/AssignmentPage';
import {FarmPage} from './pages/FarmPage';
import {ProjectDetailPage} from './pages/ProjectDetailPage';
import {ProjectsPage} from './pages/ProjectsPage';
import {useAppStore} from './stores/useAppStore';
import {useLocalStore} from './stores/useLocalStore';

const SPLASH_MIN_DURATION_MS = 2000;

const App = () => {
    const layer = useAppStore((state) => state.climateLayer);
    const precipitationLookup = useAppStore((state) => state.precipitationLookup);
    const et0Lookup = useAppStore((state) => state.et0Lookup);
    const addMessage = useAppStore((state) => state.addMessage);
    const {farm} = useFarm();
    const hasFarm = farm.name.trim().length > 0 && farm.fields.length > 0;

    const [onboardingDismissed, setOnboardingDismissed] = useLocalStore((s) => s.dwa_onboarding_dismissed);
    const [overlayForcedOpen, setOverlayForcedOpen] = useState(false);

    const [splashState, setSplashState] = useState<"loading" | "ready" | "done" | "error">("loading");
    const [splashDismissed, setSplashDismissed] = useState(false);
    const [splashError, setSplashError] = useState<string | undefined>();
    const splashReadyRef = useRef(false);
    const timerDoneRef = useRef(false);

    const tryFinishSplash = () => {
        if (splashReadyRef.current && timerDoneRef.current) {
            setSplashState("done");
        }
    };

    useEffect(() => {
        if (!layer) {
            setTimeout(() => {
                timerDoneRef.current = true;
                tryFinishSplash();
            }, SPLASH_MIN_DURATION_MS);

            Promise.all([
                loadClimateLayerFromPublic(),
                loadNfkweLayerFromPublic(),
                createRasterLookup(precipRasterUrl),
                createRasterLookup(et0RasterUrl),
            ])
                .then(([climateLayer, nfkweLayer, precipitationLookup, et0Lookup]) => {
                    useAppStore.setState({climateLayer, nfkweLayer, precipitationLookup, et0Lookup});
                    splashReadyRef.current = true;
                    setSplashState((s) => s === "loading" ? "ready" : s);
                    tryFinishSplash();
                })
                .catch((e) => {
                    setSplashError("Laden fehlgeschlagen: " + (e?.message ?? String(e)));
                    setSplashState("error");
                    addMessage({type: "error", message: ["Laden fehlgeschlagen: " + (e?.message ?? String(e))]});
                });
        }
    }, [addMessage, layer]);

    useEffect(() => {
        if (!precipitationLookup || !et0Lookup) return;
        const [farm, setFarm] = useLocalStore.getState().dwa_farm;
        refreshClimateData(precipitationLookup, et0Lookup, setFarm, farm.fields);
    }, [precipitationLookup, et0Lookup]);

    const atBottom = useIsScrolledToBottom();
    const showOverlay = splashDismissed && (!onboardingDismissed || overlayForcedOpen);

    const handleCloseOverlay = () => {
        setOverlayForcedOpen(false);
        setOnboardingDismissed(true);
    };

    const isLoaded = !!(layer && precipitationLookup && et0Lookup);

    return (
        <>
            {!splashDismissed && (
                <SplashScreen
                    state={splashState}
                    errorMessage={splashError}
                    onDismissed={() => setSplashDismissed(true)}
                />
            )}
            {isLoaded && (
                <>
                    <ErrorBoundary>
                        <Routes>
                            <Route
                                path="/"
                                element={hasFarm ? <ProjectsPage /> : <Navigate to="/farm" replace />}
                            />
                            <Route path="/farm" element={<FarmPage />} />
                            <Route path="/projects/:id" element={<ProjectDetailPage />} />
                            <Route path="/projects/:id/assignment/:assignmentId" element={<AssignmentPage />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </ErrorBoundary>
                    {hasFarm && (
                        <div className="bottom-bar-wrapper">
                            <div className={`bottom-bar-wrapper__shadow${atBottom ? " bottom-bar-wrapper__shadow--hidden" : ""}`} />
                            <LogoBar />
                            <BottomNav onShowHelp={() => setOverlayForcedOpen(true)} />
                        </div>
                    )}
                </>
            )}
            {showOverlay && <OnboardingOverlay onClose={handleCloseOverlay} />}
            <Messages />
        </>
    );
};

export default App;
