// src/components/FieldForm.tsx
import clsx from "clsx";
import {useMemo, useRef, useState, type SubmitEvent} from "react";
import {getCurrentLatLon} from "../lib/location";
import {latLonToClimateClass, latLonToNfkweClass} from "../lib/tools";
import type {ClimateClassType} from "../types";
import {nFkweClassNames, type NFkweClassName} from "../types/dataTypes";
import {nFkweClasses} from "../constants/soilConstants";
import {formatNum} from "../lib/formatNum";
import type {FieldInput, GeoPoint} from "../types/farm";
import "./FieldForm.scss";
import {LocationPicker, type LocationPickerHandle} from "./LocationPicker";
import {InfoHint} from "./InfoHint";

interface Props {
    initialValues?: FieldInput;
    existingLocations?: Array<GeoPoint & {name: string;}>;
    onSave: (field: FieldInput) => void;
    onCancel: () => void;
}

// The Merkblatt defines the nFKWe classes solely by usable field capacity (mm), soil
// index (Bodenzahl, BZ) and MMK site types — never by a texture ("grobe Bodenart")
// label. Earlier versions showed app-authored texture blurbs ("vorwiegend sandige
// Böden" …), which conflicted with the data: class 1-2 legitimately contains the clay
// type K1a and class 3b K1b/K1c — clay soils can have a low nFKWe too. Derive the
// description from the actual class criteria instead.
const nfkweRangeLabel = (cls: NFkweClassName): string => {
    const [min, max] = nFkweClasses[cls][0];
    if (min <= 0) return `nFKWe <${max} mm`;
    if (!Number.isFinite(max)) return `nFKWe >${min} mm`;
    return `nFKWe ${min}–${max} mm`;
};

const bzRangeLabel = (cls: NFkweClassName): string => {
    const [min, max] = nFkweClasses[cls][1];
    if (min <= 0) return `BZ <${max}`;
    if (!Number.isFinite(max)) return `BZ >${min}`;
    return `BZ ${min}–${max}`;
};

// A few MMK site types as concrete examples — the Merkblatt's own classification aid.
const mmkExamples = (cls: NFkweClassName): string =>
    nFkweClasses[cls][2].slice(0, 3).join(", ");

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
        // nFkweClass is required (no silent default) – the save button is disabled
        // until it is resolved (geo) or picked manually.
        if (!name || !areaHaValid || !location || !nFkweClass) return;
        onSave({
            name,
            areaHa: areaHa as number,
            location,
            nFkweClass,
            nFkweClassSource: nFkweSource,
        });
    };

    const handleNfkweChange = (cls: NFkweClassName) => {
        setManualNFkweClass(cls);
        setNFkweSource('manual');
    };

    const isValid = !!name && areaHaValid && !!location && !!nFkweClass;

    return (
        <form onSubmit={handleSubmit} className={clsx("field-form", isValid && "field-form--valid")}>
            <div className="field-form__name-area-row">
                <label className="field-form__name-label" data-tour="field-name">
                    Feldname
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="z. B. Nordfeld"
                        required
                    />
                </label>

                <label className="field-form__area-label" data-tour="field-area">
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

            <div data-tour="field-location">
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
            </div>

            <fieldset data-tour="field-nfkwe">
                <legend>nFKWe-Klasse (Bodenwasser)</legend>
                {geoNFkweClass && (
                    <p>
                        Für diesen Standort wurde die Bodenklasse <b>{geoNFkweClass}</b> ermittelt.
                        Böden können lokal variieren – bitte bestätigen oder anpassen.
                    </p>
                )}
                {location && !nFkweClass && (
                    <p className="field-form__nfkwe-warning">
                        ⚠ Für diesen Standort liegt kein Kartenwert vor – bitte wählen Sie die Bodenklasse.
                    </p>
                )}
                <InfoHint summary="Was bedeuten die Bodenklassen?">
                    <p>
                        Die nFKWe-Klasse beschreibt, wie viel Wasser der Boden pflanzenverfügbar
                        speichert – ein zentraler Eingangswert für den Zusatzwasserbedarf.
                        Sie wird – sofern für den Standort Kartendaten vorliegen – automatisch
                        ermittelt und kann angepasst werden; andernfalls wählen Sie sie selbst.
                    </p>
                    <ul className="field-form__nfkwe-help-list">
                        {nFkweClassNames.map((cls) => (
                            <li key={cls}>
                                <b>Klasse {cls}</b>: {nfkweRangeLabel(cls)} · {bzRangeLabel(cls)}
                                <br />
                                <span className="field-form__nfkwe-help-mmk">
                                    z. B. Standorttypen {mmkExamples(cls)}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <p>
                        Maßgeblich ist allein die nutzbare Feldkapazität, nicht die Bodenart:
                        Auch Tonböden können eine geringe nFKWe haben und fallen dann in eine
                        niedrige Klasse. Klasse 1-2 fasst die Klassen 1 und 2 des Merkblatts
                        zusammen.
                    </p>
                </InfoHint>
                <div className={clsx("field-set")}>
                    {nFkweClassNames.map((cls) => (
                        <label
                            key={cls}
                            className={clsx(cls === geoNFkweClass && "field-form__nfkwe-geo")}
                            title={cls === geoNFkweClass ? "Aus Karte ermittelt" : undefined}
                        >
                            <input
                                type="radio"
                                name="nFkweClass"
                                value={cls}
                                checked={nFkweClass === cls}
                                onChange={() => handleNfkweChange(cls)}
                            />
                            {cls}
                            {cls === geoNFkweClass && <span className="field-form__nfkwe-geo-marker" aria-hidden>📍</span>}
                        </label>
                    ))}
                </div>
                {geoNFkweClass && nFkweSource === "manual" && manualNFkweClass !== geoNFkweClass && (
                    <p className="field-form__nfkwe-reset">
                        Manuelle Auswahl weicht von Kartenwert ab.{" "}
                        <button
                            type="button"
                            className="field-form__nfkwe-reset-btn"
                            onClick={() => setNFkweSource("geo")}
                        >
                            ↻ Auf Kartenwert ({geoNFkweClass}) zurücksetzen
                        </button>
                    </p>
                )}
            </fieldset>

            <div className="field-form__actions">
                <button type="submit" data-tour="field-save" disabled={!isValid}>
                    Speichern
                </button>
                <button type="button" onClick={onCancel}>
                    Abbrechen
                </button>
            </div>
        </form>
    );
};
