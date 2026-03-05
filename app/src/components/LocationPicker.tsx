// src/components/LocationPicker.tsx
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {MapContainer, Marker, TileLayer, useMapEvents} from "react-leaflet";
import type {GeoPoint} from "../types/farm";

// Leaflet default icon fix (Vite/Webpack asset issue)
import markerIconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";
// Vite-kompatibler Fix: prototype.options statt mergeOptions
L.Icon.Default.prototype.options.iconUrl = markerIconUrl;
L.Icon.Default.prototype.options.iconRetinaUrl = markerIconRetinaUrl;
L.Icon.Default.prototype.options.shadowUrl = markerShadowUrl;
L.Icon.Default.imagePath = ""; // verhindert, dass Leaflet selbst einen Pfad 

interface Props {
    value: GeoPoint | null;
    onChange: (point: GeoPoint) => void;
}

function ClickHandler({onChange}: {onChange: (p: GeoPoint) => void;}) {
    useMapEvents({
        click(e) {
            onChange({lat: e.latlng.lat, lon: e.latlng.lng});
        },
    });
    return null;
}

export function LocationPicker({value, onChange}: Props) {
    const center: [number, number] = value
        ? [value.lat, value.lon]
        : [51.1657, 10.4515]; // Deutschland-Mitte

    return (
        <MapContainer
            center={center}
            zoom={value ? 13 : 6}
            style={{height: 300, width: "100%", borderRadius: 8}}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler onChange={onChange} />
            {value && <Marker position={[value.lat, value.lon]} />}
        </MapContainer>
    );
}
