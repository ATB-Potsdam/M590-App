// src/pages/FarmPage.tsx
import clsx from "clsx";
import {useState} from "react";
import {ClimateBarChart} from "../components/ClimateBarChart";
import {FieldForm} from "../components/FieldForm";
import {useFarm} from "../hooks/useFarm";
import {formatNum} from "../lib/formatNum";
import type {Field} from "../types/farm";
import "./FarmPage.scss";

const ClimateClassBadge = ({field}: {field: Field;}) => {
    switch (field.climateClassStatus) {
        case "loading":
            return <span className="farm-badge farm-badge--loading">⏳ Klimazone wird ermittelt…</span>;
        case "error":
            return <span className="farm-badge farm-badge--error">⚠️ Klimazone nicht verfügbar</span>;
        case "done":
            return <span className="farm-badge farm-badge--done">🌿 Klimazone: <strong>{field.climateClass![0]} (KWB: {field.climateClass![1]})</strong></span>;
        default:
            return null;
    }
};

const NfkweBadge = ({field}: {field: Field;}) => {
    if (!field.nFkweClass) return null;
    return (
        <span className="farm-badge farm-badge--nfkwe">
            🪨 nFKWe-Klasse: <strong>{field.nFkweClass}</strong>
            {field.nFkweClassSource === 'manual' && (
                <span className="farm-badge__manual"> (manuell)</span>
            )}
        </span>
    );
};

export const FarmPage = () => {
    const {farm, updateFarmName, addField, editField, removeField} = useFarm();
    const [showAddField, setShowAddField] = useState(false);
    const [editingField, setEditingField] = useState<Field | null>(null);

    return (
        <div className="page">
            <h1>Stammdaten</h1>

            <label>
                <strong>Betriebsname</strong>
                <input
                    value={farm.name}
                    onChange={(e) => updateFarmName(e.target.value)}
                    placeholder="Name des Betriebs"
                    className="farm-page__name-input"
                />
            </label>

            <h2 className="farm-page__fields-heading">Felder</h2>

            {farm.fields.length === 0 && <p>Noch keine Felder angelegt.</p>}

            {farm.fields.map((field) => (
                <div key={field.id} className="farm-page__field-card">
                    {editingField?.id === field.id ? (
                        <FieldForm
                            initialValues={{...field}}
                            existingLocations={farm.fields.map((f) => ({...f.location, name: f.name}))}
                            onSave={(data) => {
                                editField(field.id, data);
                                setEditingField(null);
                            }}
                            onCancel={() => setEditingField(null)}
                        />
                    ) : (
                        <>
                            <strong>{field.name}</strong> — {field.areaHa} ha
                            <br />
                            <small>
                                Lat: {formatNum(field.location.lat, 5)}, Lon: {formatNum(field.location.lon, 5)}
                            </small>
                            <br />
                            <ClimateClassBadge field={field} />
                            <br />
                            <NfkweBadge field={field} />
                            {field.climateDataStatus === "done" && field.climateData && (
                                <ClimateBarChart
                                    precipitation={field.climateData.precipitation}
                                    et0={field.climateData.et0}
                                />
                            )}
                            {field.climateDataStatus === "loading" && (
                                <small className="farm-badge farm-badge--loading">⏳ Klimadaten werden geladen…</small>
                            )}                            <div className="farm-page__field-actions">
                                <button onClick={() => setEditingField(field)}>✏️ Bearbeiten</button>
                                <button onClick={() => removeField(field.id)}>
                                    🗑 <span className={clsx("red")}>Entfernen</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            ))}

            {!editingField && (
                showAddField ? (
                    <FieldForm
                        existingLocations={farm.fields.map((f) => ({...f.location, name: f.name}))}
                        onSave={(f) => {addField(f); setShowAddField(false);}}
                        onCancel={() => setShowAddField(false)}
                    />
                ) : (
                    <button onClick={() => setShowAddField(true)} className="farm-page__add-btn">
                        + Feld hinzufügen
                    </button>
                )
            )}
        </div>
    );
};