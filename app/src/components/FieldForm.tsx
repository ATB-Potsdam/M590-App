// src/components/FieldForm.tsx
import {useRef, useState, type SubmitEvent} from "react";
import {getCurrentLatLon} from "../lib/location";
import {nFkweClassNames, type NFkweClassName} from "../types/dataTypes";
import type {FieldInput, GeoPoint} from "../types/farm";
import "./FieldForm.scss";
import {LocationPicker, type LocationPickerHandle} from "./LocationPicker";

interface Props {
    initialValues?: FieldInput;
    existingLocations?: Array<GeoPoint & {name: string;}>;
    onSave: (field: FieldInput) => void;
    onCancel: () => void;
}

export const FieldForm = ({initialValues, existingLocations = [], onSave, onCancel}: Props) => {
    const [name, setName] = useState(initialValues?.name ?? "");
    const [areaHa, setAreaHa] = useState<number | "">(initialValues?.areaHa ?? "");
    const [location, setLocation] = useState<GeoPoint | null>(initialValues?.location ?? null);
    const [locating, setLocating] = useState(false);
    const locationPickerRef = useRef<LocationPickerHandle | null>(null);
    const [nFkweClass, setNFkweClass] = useState<NFkweClassName | undefined>(
        initialValues?.nFkweClass
    );

    const handleUseCurrentLocation = () => {
        setLocating(true);
        getCurrentLatLon()
            .then((latLon) => {
                const point = {lat: latLon.lat, lon: latLon.lon};
                setLocation(point);
                locationPickerRef.current?.flyTo(point);
            })
            .catch((e) => {
                console.error("Standort konnte nicht ermittelt werden:", e);
            })
            .finally(() => {
                setLocating(false);
            });
    };

    const handleSubmit = (e: SubmitEvent) => {
        e.preventDefault();
        if (!name || !areaHa || !location) return;
        onSave({name, areaHa: Number(areaHa), location, nFkweClass});
    };

    return (
        <form onSubmit={handleSubmit} className="field-form">
            <label>
                Feldname
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="z. B. Nordfeld"
                    required
                />
            </label>

            <label>
                Fläche (ha)
                <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={areaHa}
                    onChange={(e) => setAreaHa(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="z. B. 12.5"
                    required
                />
            </label>

            <p style={{margin: 0, fontWeight: 600}}>
                Standort wählen – auf die Karte klicken:
            </p>

            <LocationPicker
                ref={locationPickerRef}
                value={location}
                onChange={setLocation}
                existingLocations={existingLocations}
                onLocate={handleUseCurrentLocation}
                locating={locating}
            />

            {location && (
                <small>
                    Lat: {location.lat.toFixed(5)}, Lon: {location.lon.toFixed(5)}
                </small>
            )}

            <fieldset style={{border: "1px solid #ddd", borderRadius: 8, padding: "8px 12px"}}>
                <legend style={{fontWeight: 600, fontSize: 14}}>nFKWe-Klasse (Bodenwasser)</legend>
                <p style={{margin: "0 0 8px", fontSize: 12, color: "#888"}}>
                    Böden können lokal variieren – bitte bestätigen oder anpassen.
                </p>
                <div style={{display: "flex", gap: 8, flexWrap: "wrap"}}>
                    {nFkweClassNames.map((cls) => (
                        <label key={cls} style={{display: "flex", alignItems: "center", gap: 4}}>
                            <input
                                type="radio"
                                name="nFkweClass"
                                value={cls}
                                checked={nFkweClass === cls}
                                onChange={() => setNFkweClass(cls)}
                            />
                            {cls}
                        </label>
                    ))}
                </div>
            </fieldset>

            <div style={{display: "flex", gap: 8}}>
                <button type="submit" disabled={!name || !areaHa || !location}>
                    Speichern
                </button>
                <button type="button" onClick={onCancel}>
                    Abbrechen
                </button>
            </div>
        </form>
    );
};
