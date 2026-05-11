import {formatNum, formatRange} from "../../lib/formatNum";
import type {WeinbauResult} from "../../lib/calculations/weinbau";
import "./ResultCard.scss";

interface Props {
    result: WeinbauResult;
    dryResult?: WeinbauResult;
    fieldName: string;
    areaHa: number;
}

const precipClassLabel = (pc: string): string => {
    if (pc === "<500") return "< 500 mm";
    if (pc === "500-700") return "500–700 mm";
    return "700–900 mm";
};

export const WeinbauResultCard = ({result, dryResult, fieldName, areaHa}: Props) => {
    const showBothScenarios = result.hasScenarioData && dryResult;

    return (
        <div className="result-card">
            <div className="result-card__header">
                <strong>{fieldName}</strong>
                <span>Weinbau · {formatNum(areaHa, 2)} ha</span>
            </div>

            {/* Block 1: Ergebnis */}
            <div className="result-card__block">
                <h4>Zusatzwasserbedarf</h4>
                <div className="result-card__values">
                    <div className="result-card__value-row">
                        <span>{showBothScenarios ? "Normaljahr" : "Gesamt"}</span>
                        <strong>{formatRange(result.totalRangeMm, "mm/a")}</strong>
                        <strong>{formatRange(result.totalRangeM3, "m³/a")}</strong>
                    </div>
                    {showBothScenarios && dryResult && (
                        <div className="result-card__value-row">
                            <span>Trockenjahr</span>
                            <strong>{formatRange(dryResult.totalRangeMm, "mm/a")}</strong>
                            <strong>{formatRange(dryResult.totalRangeM3, "m³/a")}</strong>
                        </div>
                    )}
                </div>
            </div>

            {/* Block 2: Grundlagen */}
            <details className="result-card__block result-card__details">
                <summary>Berechnungsgrundlagen</summary>
                <div className="result-card__value-row">
                    <span>nFKWe-Gruppe</span>
                    <span>{result.weinbauNFkwe}{result.isJunganlage ? " (Junganlage)" : ""}</span>
                </div>
                <div className="result-card__value-row">
                    <span>Jahresniederschlag</span>
                    <span>{formatNum(result.annualPrecipMm, 0)} mm</span>
                </div>
                <div className="result-card__value-row">
                    <span>Niederschlagsklasse</span>
                    <span>{precipClassLabel(result.precipClass)}</span>
                </div>
                <div className="result-card__value-row">
                    <span>Tabelle</span>
                    <span>{result.hasScenarioData ? "Tabelle 27 (Geisenheim)" : "Tabelle 26"}</span>
                </div>
            </details>

            {/* Hint: no scenario data */}
            {!result.hasScenarioData && (
                <div className="result-card__block result-card__hint">
                    Für diese Niederschlagsklasse ({precipClassLabel(result.precipClass)}) liegen
                    keine szenariospezifischen Werte (Normaljahr/Trockenjahr) vor.
                    Die angezeigten Werte basieren auf Tabelle 26 (standortabhängige Richtwerte).
                </div>
            )}
        </div>
    );
};
