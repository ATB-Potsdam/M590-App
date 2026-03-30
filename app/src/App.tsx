import {useEffect, useState} from 'react';
import {Navigate, Route, Routes} from 'react-router';
import "./App.scss";
import {BottomNav} from './components/BottomNav';
import {LogoBar} from './components/LogoBar';
import {Messages} from './components/Messages';
import {SplashScreen} from './components/SplashScreen';
import {refreshClimateData, useFarm} from './hooks/useFarm';
import {loadClimateLayerFromPublic, loadNfkweLayerFromPublic} from './lib/polylookup';
import {createRasterLookup, et0RasterUrl, precipRasterUrl} from './lib/rasterData';
import {AssignmentPage} from './pages/AssignmentPage';
import {FarmPage} from './pages/FarmPage';
import {HomePage} from './pages/HomePage';
import {ProjectDetailPage} from './pages/ProjectDetailPage';
import {ProjectsPage} from './pages/ProjectsPage';
import {useAppStore} from './stores/useAppStore';
import {useLocalStore} from './stores/useLocalStore';

const App = () => {
    const layer = useAppStore((state) => state.climateLayer);
    const precipitationLookup = useAppStore((state) => state.precipitationLookup);
    const et0Lookup = useAppStore((state) => state.et0Lookup);
    const addMessage = useAppStore((state) => state.addMessage);
    const {farm} = useFarm();
    const hasFarm = farm.name.trim().length > 0 || farm.fields.length > 0;

    const [splashState, setSplashState] = useState<"loading" | "done" | "error">("loading");
    const [splashDismissed, setSplashDismissed] = useState(false);
    const [splashError, setSplashError] = useState<string | undefined>();

    useEffect(() => {
        if (!layer) {
            Promise.all([
                loadClimateLayerFromPublic(),
                loadNfkweLayerFromPublic(),
                createRasterLookup(precipRasterUrl),
                createRasterLookup(et0RasterUrl),
            ])
                .then(([climateLayer, nfkweLayer, precipitationLookup, et0Lookup]) => {
                    useAppStore.setState({climateLayer, nfkweLayer, precipitationLookup, et0Lookup});
                    setSplashState("done");
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
                    <Routes>
                        <Route
                            path="/"
                            element={hasFarm ? <HomePage /> : <Navigate to="/farm" replace />}
                        />
                        <Route path="/farm" element={<FarmPage />} />
                        <Route path="/projects" element={<ProjectsPage />} />
                        <Route path="/projects/:id" element={<ProjectDetailPage />} />
                        <Route path="/projects/:id/assignment/:assignmentId" element={<AssignmentPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                    <LogoBar />
                    <BottomNav />
                </>
            )}
            <Messages />
        </>
    );
};

export default App;
