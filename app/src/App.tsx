import { useEffect, useState } from 'react';
import { Messages } from './components/Messages';
import { getCurrentLatLon } from './lib/location';
import { loadLayerFromPublic } from './lib/polylookup';
import { latLonToClimateClass } from './lib/tools';
import { useAppStore } from './stores/useAppStore';
import type { ClimateClassType } from './types';

const App = () => {
    const layer = useAppStore((state) => state.layer);
    const addMessage = useAppStore((state) => state.addMessage);
    const delMessage = useAppStore((state) => state.delMessage);

    const [coord, setCoord] = useState<{ lat: number; lon: number } | null>(null);
    const [climateClass, setClimateClass] = useState<ClimateClassType | null>(null);

    useEffect(() => {
        if (!layer) {
            const message = addMessage({
                type: 'info',
                message: ['Loading layer…'],
            });
            loadLayerFromPublic()
                .finally(() => delMessage(message))
                .then((layer) => {
                    useAppStore.setState({ layer });
                    addMessage({ type: "info", message: ['Layer loaded ✅'] });
                })
                .catch((e: any) => {
                    addMessage({ type: "error", message: ['Layer loaded failed: ' + (e?.message ?? String(e))] });
                });
        }
    }, [layer]);

    if (!layer) {
        return <Messages />;
    }

    const handleQueryHere = () => {
        const message = addMessage({
            type: 'info',
            message: ['Getting location…'],
        })
        getCurrentLatLon()
            .finally(() => delMessage(message))
            .then((location) => {
                setCoord(location);
                const message = addMessage({
                    type: 'info',
                    message: ['Querying…'],
                })
                latLonToClimateClass(location)
                    .then((climateClass) => {
                        delMessage(message)
                        setClimateClass(climateClass);
                    })
                    .catch(err => {
                        addMessage({
                            type: "error",
                            message: ['Query failed: ' + (err?.message ?? String(err))]
                        });
                    });
            });
    }

    return (
        <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
            <Messages />
            <h1>Polylookup demo</h1>
            <p style={{ marginBottom: 8 }}>
                <button onClick={handleQueryHere}>2) Get my location & query</button>
            </p>
            <p><b>Status:</b> {status}</p>
            {coord && <p><b>Here:</b> lat {coord.lat.toFixed(6)}, lon {coord.lon.toFixed(6)}</p>}
            {climateClass && (
                <>
                    <h3>Matches</h3>
                    <pre>{climateClass[0]} ({climateClass[1]})</pre>
                </>
            )}
        </main>
    );
}

export default App;