import {useEffect} from 'react';
import {Navigate, Route, Routes} from 'react-router';
import "./App.scss";
import {BottomNav} from './components/BottomNav';
import {Messages} from './components/Messages';
import {useFarm} from './hooks/useFarm';
import {loadLayerFromPublic} from './lib/polylookup';
import {AssignmentPage} from './pages/AssignmentPage';
import {FarmPage} from './pages/FarmPage';
import {HomePage} from './pages/HomePage';
import {ProjectDetailPage} from './pages/ProjectDetailPage';
import {ProjectsPage} from './pages/ProjectsPage';
import {useAppStore} from './stores/useAppStore';

const App = () => {
    const layer = useAppStore((state) => state.layer);
    const addMessage = useAppStore((state) => state.addMessage);
    const delMessage = useAppStore((state) => state.delMessage);
    const {farm} = useFarm();
    const hasFarm = farm.name.trim().length > 0 || farm.fields.length > 0;

    useEffect(() => {
        if (!layer) {
            console.log("Loading layer...");
            const message = addMessage({
                type: 'info',
                message: ['Loading layer…'],
            });
            loadLayerFromPublic()
                .finally(() => delMessage(message))
                .then((layer) => {
                    useAppStore.setState({layer});
                    addMessage({type: "info", message: ['Layer loaded ✅']});
                })
                .catch((e) => {
                    addMessage({type: "error", message: ['Layer loaded failed: ' + (e?.message ?? String(e))]});
                });
        }
    }, [addMessage, delMessage, layer]);

    if (!layer) {
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