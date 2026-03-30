import clsx from "clsx";
import {useFarm} from "../hooks/useFarm";
import {formatNum} from "../lib/formatNum";
import type {Field} from "../types/farm";
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

export const HomePage = () => {
    const {farm} = useFarm();

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
