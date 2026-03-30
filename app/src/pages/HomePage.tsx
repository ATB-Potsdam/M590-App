import clsx from "clsx";
import {refKwb, rFactor} from "../constants/soilConstants";
import {useFarm} from "../hooks/useFarm";
import {getKwbSum, lookupOtherPlant} from "../lib/tools";
import type {AnyPlantName, Range} from "../types/dataTypes";
import type {Field} from "../types/farm";
import {formatNum} from "../lib/formatNum";
import "./HomePage.scss";

const ClimateClassBadge = ({field}: {field: Field;}) => {
    switch (field.climateClassStatus) {
        case "loading":
            return <span className="badge badge--loading">⏳ Wird ermittelt…</span>;
        case "error":
            return <span className="badge badge--error">⚠️ Nicht verfügbar</span>;
        case "done":
            return <span className="badge badge--done">🌿 {field.climateClass?.[0]}</span>;
        default:
            return null;
    }
};

const sample = () => {
    const plant: AnyPlantName = "Spinat|früh";
    const plantData = lookupOtherPlant(plant, "dry", "1-2");
    const time: Range = [4.5, 5];
    const refKwb2 = getKwbSum(refKwb, time);
    const kwb = getKwbSum([0, 0, 0, -32, -40, -48, -28, -39, -10, 0, 0, 0], time);
    const dKwb = refKwb2 - kwb;
    const rDKwb = rFactor["1-2"] * dKwb;
    const newPlantData = plantData ? [plantData[0] + rDKwb, plantData[1] + rDKwb] as Range : null;
    return [plant, plantData, time, refKwb2, kwb, dKwb, rDKwb, newPlantData];
};

export const HomePage = () => {
    const {farm} = useFarm();

    console.log("Sample", sample());

    // Klimazonen-Summary: Anzahl Felder pro Klimazone
    const climateSummary = farm.fields.reduce<Record<string, number>>((acc, field) => {
        if (field.climateClassStatus === "done" && field.climateClass) {
            const zone = field.climateClass[0]; // "A" | "B" | ... | "H"
            acc[zone] = (acc[zone] ?? 0) + 1;
        }
        return acc;
    }, {});

    const totalArea = farm.fields.reduce((sum, f) => sum + f.areaHa, 0);

    return (
        <div className={clsx("home-page", "page")}>
            <header className="home-page__header">
                <h1>{farm.name || "Mein Betrieb"}</h1>
                <p className="home-page__meta">
                    {farm.fields.length} Feld{farm.fields.length !== 1 ? "er" : ""} · {formatNum(totalArea, 1)} ha gesamt
                </p>
            </header>

            {Object.keys(climateSummary).length > 0 && (
                <section className="home-page__section">
                    <h2>Klimazonen</h2>
                    <div className="climate-summary">
                        {Object.entries(climateSummary).map(([zone, count]) => (
                            <div key={zone} className="climate-summary__item">
                                <span className="climate-summary__zone">🌿 Klasse {zone}</span>
                                <span className="climate-summary__count">{count} Feld{count !== 1 ? "er" : ""}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className="home-page__section">
                <h2>Felder</h2>
                {farm.fields.length === 0 ? (
                    <p className="home-page__empty">Noch keine Felder angelegt.</p>
                ) : (
                    <ul className="field-list">
                        {farm.fields.map((field) => (
                            <li key={field.id} className="field-list__item">
                                <div className="field-list__info">
                                    <strong>{field.name}</strong>
                                    <span>{field.areaHa} ha</span>
                                </div>
                                <div className="field-list__meta">
                                    <small>
                                        {formatNum(field.location.lat, 4)}, {formatNum(field.location.lon, 4)}
                                    </small>
                                    <ClimateClassBadge field={field} />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
};
