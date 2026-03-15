import {useEffect} from 'react';
import {Navigate, Route, Routes} from 'react-router';
import "./App.scss";
import {BottomNav} from './components/BottomNav';
import {Messages} from './components/Messages';
import {refreshClimateData, useFarm} from './hooks/useFarm';
import {loadLayerFromPublic} from './lib/polylookup';
import {createRasterLookup, et0RasterUrl, precipRasterUrl} from './lib/rasterData';
import {AssignmentPage} from './pages/AssignmentPage';
import {FarmPage} from './pages/FarmPage';
import {HomePage} from './pages/HomePage';
import {ProjectDetailPage} from './pages/ProjectDetailPage';
import {ProjectsPage} from './pages/ProjectsPage';
import {useAppStore} from './stores/useAppStore';
import {useLocalStore} from './stores/useLocalStore';

const App = () => {
    const layer = useAppStore((state) => state.layer);
    const precipitationLookup = useAppStore((state) => state.precipitationLookup);
    const et0Lookup = useAppStore((state) => state.et0Lookup);
    const addMessage = useAppStore((state) => state.addMessage);
    const delMessage = useAppStore((state) => state.delMessage);
    const {farm} = useFarm();
    const hasFarm = farm.name.trim().length > 0 || farm.fields.length > 0;

    useEffect(() => {
        if (!layer) {
            console.log("Loading data...");
            const message = addMessage({
                type: 'info',
                message: ['Loading data…'],
            });
            Promise.all([
                loadLayerFromPublic(),
                createRasterLookup(precipRasterUrl),
                createRasterLookup(et0RasterUrl),
            ])
                .finally(() => delMessage(message))
                .then(([layer, precipitationLookup, et0Lookup

                ]) => {
                    useAppStore.setState({layer, precipitationLookup, et0Lookup});
                    addMessage({type: "info", message: ['Data loaded ✅']});
                })
                .catch((e) => {
                    addMessage({type: "error", message: ['Loading data failed: ' + (e?.message ?? String(e))]});
                });
        }
    }, [addMessage, delMessage, layer]);

    useEffect(() => {
        if (!precipitationLookup || !et0Lookup) return;
        const [farm, setFarm] = useLocalStore.getState().dwa_farm;
        refreshClimateData(precipitationLookup, et0Lookup, setFarm, farm.fields);
    }, [precipitationLookup, et0Lookup]);

    if (!layer || !precipitationLookup || !et0Lookup) {
        return <Messages />;
    }

    return (
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
            <BottomNav />
        </>
    );
};

export default App;;;