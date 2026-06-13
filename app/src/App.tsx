import {useEffect, useRef, useState} from 'react';
import {Navigate, Route, Routes, useLocation} from 'react-router';
import "./App.scss";
import {BottomNav} from './components/BottomNav';
import {ErrorBoundary} from './components/ErrorBoundary';
import {InstallPrompt} from './components/InstallPrompt';
import {LogoBar} from './components/LogoBar';
import {Messages} from './components/Messages';
import {UpdateBanner} from './components/UpdateBanner';
import {OnboardingOverlay} from './components/OnboardingOverlay';
import {SplashScreen} from './components/SplashScreen';
import {refreshClimateClass, refreshClimateData, useFarm} from './hooks/useFarm';
import {useIsScrolledToBottom} from './hooks/useIsScrolledToBottom';
import {loadClimateLayerFromPublic, loadNfkweLayerFromPublic} from './lib/polylookup';
import {createRasterLookup, et0RasterUrl, precipRasterUrl} from './lib/rasterData';
import {AboutPage} from './pages/AboutPage';
import {AssignmentPage} from './pages/AssignmentPage';
import {FarmPage} from './pages/FarmPage';
import {PrivacyPage} from './pages/PrivacyPage';
import {ProjectDetailPage} from './pages/ProjectDetailPage';
import {ProjectsPage} from './pages/ProjectsPage';
import {useAppStore} from './stores/useAppStore';
import {useLocalStore} from './stores/useLocalStore';

const SPLASH_MIN_DURATION_MS = 2000;

const ScrollToTop = () => {
    const {pathname} = useLocation();
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
};

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
    const [loadProgress, setLoadProgress] = useState(0);
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

            // Weighted by file size: Klimaraeume(2.8MB)=6%, nfkwe(28.7MB)=58%, precip(9.1MB)=18%, et0(9.1MB)=18%
            const weights = [6, 58, 18, 18];
            let accumulated = 0;
            const track = <T,>(promise: Promise<T>, index: number): Promise<T> =>
                promise.then((result) => {
                    accumulated += weights[index];
                    setLoadProgress(accumulated);
                    return result;
                });

            Promise.all([
                track(loadClimateLayerFromPublic(), 0),
                track(loadNfkweLayerFromPublic(), 1),
                track(createRasterLookup(precipRasterUrl), 2),
                track(createRasterLookup(et0RasterUrl), 3),
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

    // Klimazone (KWBv-Klasse) selbstheilend nachladen sobald WASM-Layer bereit ist.
    // Verhindert „Klimazone fehlt“-Fehlermeldungen direkt nach App-Start.
    useEffect(() => {
        if (!layer) return;
        const [farm, setFarm] = useLocalStore.getState().dwa_farm;
        refreshClimateClass(setFarm, farm.fields);
    }, [layer]);

    const location = useLocation();
    const atBottom = useIsScrolledToBottom(location.pathname, splashDismissed);
    const showOverlay = splashDismissed && (!onboardingDismissed || overlayForcedOpen);

    // Pushing a dummy history entry while the onboarding overlay is open
    // makes Android's back gesture (and browser back) close the overlay
    // instead of navigating away from the page underneath. A ref tracks
    // whether the back was already triggered by popstate, so the close
    // handler knows whether it still needs to pop our entry off the stack.
    const onboardingPushedRef = useRef(false);

    const handleCloseOverlay = () => {
        setOverlayForcedOpen(false);
        setOnboardingDismissed(true);
        if (onboardingPushedRef.current) {
            onboardingPushedRef.current = false;
            window.history.back();
        }
    };

    useEffect(() => {
        if (!showOverlay) return;
        window.history.pushState({onboarding: true}, "");
        onboardingPushedRef.current = true;
        const onPop = () => {
            onboardingPushedRef.current = false;
            setOverlayForcedOpen(false);
            setOnboardingDismissed(true);
        };
        window.addEventListener("popstate", onPop);
        return () => window.removeEventListener("popstate", onPop);
    }, [showOverlay, setOnboardingDismissed]);

    const isLoaded = !!(layer && precipitationLookup && et0Lookup);

    return (
        <>
            {!splashDismissed && (
                <SplashScreen
                    state={splashState}
                    errorMessage={splashError}
                    loadProgress={loadProgress}
                    onDismissed={() => setSplashDismissed(true)}
                />
            )}
            {isLoaded && (
                <>
                    <ScrollToTop />
                    <ErrorBoundary>
                        <Routes>
                            <Route
                                path="/"
                                element={hasFarm ? <ProjectsPage /> : <Navigate to="/farm" replace />}
                            />
                            <Route path="/farm" element={<FarmPage />} />
                            <Route path="/projects/:id" element={<ProjectDetailPage />} />
                            <Route path="/projects/:id/assignment/:assignmentId" element={<AssignmentPage />} />
                            <Route path="/about" element={<AboutPage />} />
                            <Route path="/privacy" element={<PrivacyPage />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </ErrorBoundary>
                    <div className="bottom-bar-wrapper">
                        <div className={`bottom-bar-wrapper__shadow${atBottom ? " bottom-bar-wrapper__shadow--hidden" : ""}`} />
                        <LogoBar />
                        {hasFarm && <BottomNav onShowHelp={() => setOverlayForcedOpen(true)} />}
                    </div>
                </>
            )}
            {showOverlay && <OnboardingOverlay onClose={handleCloseOverlay} />}
            <UpdateBanner />
            <InstallPrompt />
            <Messages />
        </>
    );
};

export default App;
