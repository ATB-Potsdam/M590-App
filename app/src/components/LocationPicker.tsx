// src/components/LocationPicker.tsx
import type {Map as LeafletMap} from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {forwardRef, useEffect, useImperativeHandle, useRef, useState, type RefObject} from "react";
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

// Dimmed icon for existing fields
const existingIcon = new L.Icon({
    iconUrl: markerIconUrl,
    iconRetinaUrl: markerIconRetinaUrl,
    shadowUrl: markerShadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    shadowSize: [41, 41],
    className: "marker-existing", // for SCSS opacity
});

interface Props {
    value: GeoPoint | null;
    onChange: (point: GeoPoint) => void;
    existingLocations?: Array<GeoPoint & {name: string;}>;
    onLocate?: () => void;   // passed in from FieldForm
    locating?: boolean;      // loading state for disabled
}

// React.MutableRefObject → React.RefObject (not deprecated)
const MapRefCapture = ({mapRef}: {mapRef: RefObject<LeafletMap | null>;}) => {
    const map = useMap();

    useEffect(() => {
        mapRef.current = map;
    }, [map, mapRef]);

    return null;
};
const ClickHandler = ({onChange}: {onChange: (p: GeoPoint) => void;}) => {
    useMapEvents({
        click(e) {
            onChange({lat: e.latlng.lat, lon: e.latlng.lng});
        },
    });
    return null;
};

const BoundsFitter = ({locations}: {locations: GeoPoint[];}) => {
    const map = useMap();
    useState(() => {
        if (locations.length === 0) return;
        const bounds = L.latLngBounds(locations.map((l) => [l.lat, l.lon]));
        map.fitBounds(bounds, {padding: [48, 48], maxZoom: 13});
    });
    return null;
};

export interface LocationPickerHandle {
    flyTo: (point: GeoPoint) => void;
}

export const LocationPicker = forwardRef<LocationPickerHandle, Props>(
    ({value, onChange, existingLocations = [], onLocate, locating = false}, ref) => {
        const mapRef = useRef<LeafletMap | null>(null);

        useImperativeHandle(ref, () => ({
            flyTo: (point: GeoPoint) => {
                mapRef.current?.flyTo([point.lat, point.lon], 13);
            },
        }));

        const defaultCenter: [number, number] = [51.1657, 10.4515];
        const center: [number, number] = existingLocations.length > 0
            ? [existingLocations[0].lat, existingLocations[0].lon]
            : value
                ? [value.lat, value.lon]
                : defaultCenter;

        return (
            <div className="location-picker">
                <MapContainer
                    center={center}
                    zoom={existingLocations.length > 0 || value ? 13 : 6}
                    className="location-picker__map"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapRefCapture mapRef={mapRef} />
                    <ClickHandler onChange={onChange} />

                    {existingLocations.map((loc, i) => (
                        <Marker key={i} position={[loc.lat, loc.lon]} icon={existingIcon} interactive={true}>
                            {loc.name && (
                                <Tooltip direction="top" offset={[0, -36]}>{loc.name}</Tooltip>
                            )}
                        </Marker>
                    ))}

                    {value && <Marker position={[value.lat, value.lon]} />}

                    {existingLocations.length > 0 && (
                        <BoundsFitter locations={existingLocations} />
                    )}
                </MapContainer>

                {/* Location button as overlay – like in Google Maps / Apple Maps */}
                {onLocate && (
                    <button
                        type="button"
                        className="location-picker__locate-btn"
                        onClick={onLocate}
                        disabled={locating}
                        title="Aktuellen Standort verwenden"
                    >
                        {locating ? (
                            // Spinner
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round">
                                    <animateTransform attributeName="transform" type="rotate"
                                        from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
                                </path>
                            </svg>
                        ) : (
                            // Location icon (⊙)
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <circle cx="12" cy="12" r="8" />
                                <line x1="12" y1="2" x2="12" y2="8" />
                                <line x1="12" y1="16" x2="12" y2="22" />
                                <line x1="2" y1="12" x2="8" y2="12" />
                                <line x1="16" y1="12" x2="22" y2="12" />
                            </svg>
                        )}
                    </button>
                )}
            </div>
        );
    }
);