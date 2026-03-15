// src/pages/FarmPage.tsx
import clsx from "clsx";
import {useState} from "react";
import {ClimateBarChart} from "../components/ClimateBarChart";
import {FieldForm} from "../components/FieldForm";
import {useFarm} from "../hooks/useFarm";
import type {Field} from "../types/farm";

const ClimateClassBadge = ({field}: {field: Field;}) => {
    switch (field.climateClassStatus) {
        case "loading":
            return <span style={{color: "#888"}}>⏳ Klimazone wird ermittelt…</span>;
        case "error":
            return <span style={{color: "red"}}>⚠️ Klimazone nicht verfügbar</span>;
        case "done":
            return <span style={{color: "green"}}>🌿 Klimazone: <strong>{field.climateClass![0]} (KWB: {field.climateClass![1]})</strong></span>;
        default:
            return null;
    }
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
                    style={{display: "block", marginTop: 4, width: "100%"}}
                />
            </label>

            <h2 style={{marginTop: 24}}>Felder</h2>

            {farm.fields.length === 0 && <p>Noch keine Felder angelegt.</p>}

            {farm.fields.map((field) => (
                <div key={field.id} style={{border: "1px solid #ccc", borderRadius: 8, padding: 12, marginBottom: 8}}>
                    {editingField?.id === field.id ? (
                        <FieldForm
                            initialValues={{name: field.name, areaHa: field.areaHa, location: field.location}}
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
                                Lat: {field.location.lat.toFixed(5)}, Lon: {field.location.lon.toFixed(5)}
                            </small>
                            <br />
                            <ClimateClassBadge field={field} />
                            {field.climateDataStatus === "done" && field.climateData && (
                                <ClimateBarChart
                                    precipitation={field.climateData.precipitation}
                                    et0={field.climateData.et0}
                                />
                            )}
                            {field.climateDataStatus === "loading" && (
                                <small style={{color: "#888"}}>⏳ Klimadaten werden geladen…</small>
                            )}                            <div style={{display: "flex", gap: 8, marginTop: 8}}>
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
                    <button onClick={() => setShowAddField(true)} style={{marginTop: 12}}>
                        + Feld hinzufügen
                    </button>
                )
            )}
        </div>
    );
};