// src/components/LocationPicker.tsx
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {useState} from "react";
import {MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents} from "react-leaflet";
import type {GeoPoint} from "../types/farm";
import "./LocationPicker.scss";

import markerIconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.prototype.options.iconUrl = markerIconUrl;
L.Icon.Default.prototype.options.iconRetinaUrl = markerIconRetinaUrl;
L.Icon.Default.prototype.options.shadowUrl = markerShadowUrl;
L.Icon.Default.imagePath = "";

// Gedimmtes Icon für bestehende Felder
const existingIcon = new L.Icon({
    iconUrl: markerIconUrl,
    iconRetinaUrl: markerIconRetinaUrl,
    shadowUrl: markerShadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    shadowSize: [41, 41],
    className: "marker-existing", // für SCSS opacity
});

interface Props {
    value: GeoPoint | null;
    onChange: (point: GeoPoint) => void;
    existingLocations?: Array<GeoPoint & {name: string;}>;
}
const ClickHandler = ({onChange}: {onChange: (p: GeoPoint) => void;}) => {
    useMapEvents({
        click(e) {
            onChange({lat: e.latlng.lat, lon: e.latlng.lng});
        },
    });
    return null;
};

// Zoomt beim Mount auf alle übergebenen Punkte
const BoundsFitter = ({locations}: {locations: GeoPoint[];}) => {
    const map = useMap();

    // useMap-Hook ist nur beim ersten Render relevant → einmaliger Fit
    useState(() => {
        if (locations.length === 0) return;
        const bounds = L.latLngBounds(locations.map((l) => [l.lat, l.lon]));
        map.fitBounds(bounds, {padding: [48, 48], maxZoom: 13});
    });

    return null;
};

export const LocationPicker = ({value, onChange, existingLocations = []}: Props) => {
    // Fallback-Center: Deutschland-Mitte
    const defaultCenter: [number, number] = [51.1657, 10.4515];

    // Initiales Center: erster bestehender Punkt, sonst gewählter Wert, sonst Deutschland
    const center: [number, number] = existingLocations.length > 0
        ? [existingLocations[0].lat, existingLocations[0].lon]
        : value
            ? [value.lat, value.lon]
            : defaultCenter;

    const initialZoom = existingLocations.length > 0 || value ? 13 : 6;

    return (
        <MapContainer
            center={center}
            zoom={initialZoom}
            style={{height: 300, width: "100%", borderRadius: 8}}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler onChange={onChange} />

            {/* Bestehende Felder gedimmt anzeigen */}
            {existingLocations.map((loc, i) => (
                <Marker
                    key={i}
                    position={[loc.lat, loc.lon]}
                    icon={existingIcon}
                    interactive={true}  // muss true sein damit Tooltip funktioniert
                >
                    {loc.name && (
                        <Tooltip direction="top" offset={[0, -36]}>
                            {loc.name}
                        </Tooltip>
                    )}
                </Marker>
            ))}
            {/* Neu gewählter Standort */}
            {value && <Marker position={[value.lat, value.lon]} />}

            {/* Bounds nur fitten wenn bestehende Locations vorhanden */}
            {existingLocations.length > 0 && (
                <BoundsFitter locations={existingLocations} />
            )}
        </MapContainer>
    );
};
