// src/components/FieldForm.tsx
import {useState, type SubmitEvent} from "react";
import type {Field, GeoPoint} from "../types/farm";
import {LocationPicker} from "./LocationPicker";

interface Props {
    initialValues?: Omit<Field, "id" | "climateClass" | "climateClassStatus">;
    existingLocations?: Array<GeoPoint & {name: string;}>;
    onSave: (field: Omit<Field, "id" | "climateClass" | "climateClassStatus">) => void;
    onCancel: () => void;
}
export const FieldForm = ({initialValues, existingLocations = [], onSave, onCancel}: Props) => {
    const [name, setName] = useState(initialValues?.name ?? "");
    const [areaHa, setAreaHa] = useState<number | "">(initialValues?.areaHa ?? "");
    const [location, setLocation] = useState<GeoPoint | null>(initialValues?.location ?? null);

    const handleSubmit = (e: SubmitEvent) => {
        e.preventDefault();
        if (!name || !areaHa || !location) return;
        onSave({name, areaHa: Number(areaHa), location});
    };

    return (
        <form onSubmit={handleSubmit} style={{display: "flex", flexDirection: "column", gap: 12}}>
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
                value={location}
                onChange={setLocation}
                existingLocations={existingLocations}
            />
            {location && (
                <small>
                    Lat: {location.lat.toFixed(5)}, Lon: {location.lon.toFixed(5)}
                </small>
            )}

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
