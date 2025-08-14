import { useRef, useState } from 'react';
import { loadLayerFromPublic } from './lib/polylookup';

export default function App() {
  const layerRef = useRef<any>(null);
  const [msg, setMsg] = useState('—');

  async function onLoad() {
    layerRef.current = await loadLayerFromPublic();
    setMsg('Layer loaded.');
  }

  async function onQuery(lon: number, lat: number) {
    if (!layerRef.current) return setMsg('Load layer first.');
    const json = layerRef.current.queryPointJSON(lon, lat);
    setMsg(json);
  }

  return (
    <main>
      <button onClick={onLoad}>Load</button>
      <button onClick={() => onQuery(13.4178058, 52.5167835)}>Query Berlin</button>
      <pre>{msg}</pre>
    </main>
  );
}
