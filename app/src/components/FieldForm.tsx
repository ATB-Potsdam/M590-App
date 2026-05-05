// src/components/FieldForm.tsx
import clsx from "clsx";
import {useMemo, useRef, useState, type SubmitEvent} from "react";
import {getCurrentLatLon} from "../lib/location";
import {latLonToClimateClass, latLonToNfkweClass} from "../lib/tools";
import type {ClimateClassType} from "../types";
import {nFkweClassNames, type NFkweClassName} from "../types/dataTypes";
import {formatNum} from "../lib/formatNum";
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
    const [areaHaText, setAreaHaText] = useState<string>(
        initialValues?.areaHa != null ? String(initialValues.areaHa) : ""
    );
    const areaHa = areaHaText === "" ? "" : Number(areaHaText.replace(",", "."));
    const [location, setLocation] = useState<GeoPoint | null>(initialValues?.location ?? null);
    const [locating, setLocating] = useState(false);
    const locationPickerRef = useRef<LocationPickerHandle | null>(null);
    const [manualNFkweClass, setManualNFkweClass] = useState<NFkweClassName | null>(
        initialValues?.nFkweClassSource === "manual" ? (initialValues?.nFkweClass || null) : null
    );
    const [nFkweSource, setNFkweSource] = useState<'geo' | 'manual'>(
        initialValues?.nFkweClassSource ?? 'geo'
    );

    const geoNFkweClass = useMemo<NFkweClassName | null>(() => {
        if (!location) return null;
        try {
            return latLonToNfkweClass(location);
        } catch {
            return null;
        }
    }, [location]);

    const geoClimateClass = useMemo<ClimateClassType | null>(() => {
        if (!location) return null;
        try {
            return latLonToClimateClass(location);
        } catch {
            return null;
        }
    }, [location]);

    const nFkweClass = nFkweSource === "geo" ? (geoNFkweClass ?? manualNFkweClass) : manualNFkweClass;

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

    const areaHaValid = typeof areaHa === "number" && isFinite(areaHa) && areaHa > 0;

    const handleSubmit = (e: SubmitEvent) => {
        e.preventDefault();
        if (!name || !areaHaValid || !location) return;
        onSave({
            name,
            areaHa: areaHa as number,
            location,
            nFkweClass: nFkweClass ?? "3a",
            nFkweClassSource: nFkweSource,
        });
    };

    const handleNfkweChange = (cls: NFkweClassName) => {
        setManualNFkweClass(cls);
        setNFkweSource('manual');
    };

    const isValid = !!name && areaHaValid && !!location;

    return (
        <form onSubmit={handleSubmit} className={clsx("field-form", isValid && "field-form--valid")}>
            <div className="field-form__name-area-row">
                <label className="field-form__name-label">
                    Feldname
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="z. B. Nordfeld"
                        required
                    />
                </label>

                <label className="field-form__area-label">
                    Fläche (ha)
                    <input
                        type="text"
                        inputMode="decimal"
                        value={areaHaText}
                        onChange={(e) => setAreaHaText(e.target.value)}
                        placeholder="z. B. 12,5"
                        size={10}
                        required
                    />
                </label>
            </div>

            <p className={clsx("map")}>
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
                    Lat: {formatNum(location.lat, 5)}, Lon: {formatNum(location.lon, 5)}
                    {geoClimateClass
                        ? <> · 🌿 Klimazone: <b>{geoClimateClass[0]}</b> (KWB: {formatNum(geoClimateClass[1], 0)})</>
                        : <> · ⚠️ Klimazone für diesen Standort nicht verfügbar</>}
                </small>
            )}

            <fieldset>
                <legend>nFKWe-Klasse (Bodenwasser)</legend>
                <p>
                    Böden können lokal variieren – bitte bestätigen oder anpassen.
                </p>
                {geoNFkweClass && <p>Die ermittelte Bodenklasse an diesem Ort ist <b>{geoNFkweClass}</b>.</p>}
                <div className={clsx("field-set")}>
                    {nFkweClassNames.map((cls) => (
                        <label key={cls}>
                            <input
                                type="radio"
                                name="nFkweClass"
                                value={cls}
                                checked={nFkweClass === cls}
                                onChange={() => handleNfkweChange(cls)}
                            />
                            {cls}
                        </label>
                    ))}
                </div>
            </fieldset>

            <div className="field-form__actions">
                <button type="submit" disabled={!name || !areaHaValid || !location}>
                    Speichern
                </button>
                <button type="button" onClick={onCancel}>
                    Abbrechen
                </button>
            </div>
        </form>
    );
};
