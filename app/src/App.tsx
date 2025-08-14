import { useRef, useState } from 'react';
import { getCurrentLatLon } from './lib/location';
import { loadLayerFromPublic } from './lib/polylookup';

type Match = { id: number; kwb: number | null };

const App = () => {
    const layerRef = useRef<any>(null);
    const [status, setStatus] = useState('—');
    const [coord, setCoord] = useState<{ lat: number; lon: number } | null>(null);
    const [matches, setMatches] = useState<Match[] | null>(null);

    const handleLoad = async () => {
        try {
            setStatus('Loading layer…');
            layerRef.current = await loadLayerFromPublic();
            setStatus('Layer loaded ✅');
        } catch (e: any) {
            setStatus('Layer load failed: ' + (e?.message ?? String(e)));
        }
    }

    const handleQueryHere = async () => {
        try {
            if (!layerRef.current) {
                setStatus('Load the layer first'); return;
            }
            setStatus('Getting location…');
            const { lat, lon } = await getCurrentLatLon();
            setCoord({ lat, lon });
            setStatus('Querying…');
            const json = layerRef.current.queryPointJSON(lon, lat); // WASM expects (lon, lat)
            const arr: Match[] = JSON.parse(json);
            setMatches(arr);
            setStatus(`Done (${arr.length} match${arr.length === 1 ? '' : 'es'})`);
        }
        catch (e: any) {
            setStatus('Query failed: ' + (e?.message ?? String(e)));
        }
    }

    return (
        <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
            <h1>Polylookup demo</h1>
            <p style={{ marginBottom: 8 }}>
                <button onClick={handleLoad}>1) Load layer</button>{' '}
                <button onClick={handleQueryHere}>2) Get my location & query</button>
            </p>
            <p><b>Status:</b> {status}</p>
            {coord && <p><b>Here:</b> lat {coord.lat.toFixed(6)}, lon {coord.lon.toFixed(6)}</p>}
            {matches && (
                <>
                    <h3>Matches</h3>
                    <pre>{JSON.stringify(matches, null, 2)}</pre>
                </>
            )}
        </main>
    );
}

export default App;