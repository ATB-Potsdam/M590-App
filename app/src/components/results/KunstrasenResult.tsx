import {formatNum} from "../../lib/formatNum";
import type {KunstrasenResult} from "../../lib/calculations/kunstrasen";
import "./ResultCard.scss";

interface Props {
    result: KunstrasenResult;
    fieldName: string;
}

export const KunstrasenResultCard = ({result, fieldName}: Props) => (
    <div className="result-card">
        <div className="result-card__header">
            <strong>{fieldName}</strong>
            <span>Kunstrasen · {formatNum(result.areaHa, 2)} ha</span>
        </div>

        {/* Block 1: Ergebnis */}
        <div className="result-card__block">
            <h4>Befeuchtungswasserbedarf</h4>
            <div className="result-card__values">
                <div className="result-card__value-row">
                    <span>Jahreswert</span>
                    <strong>{formatNum(result.annualMm, 0)} mm/a</strong>
                </div>
                <div className="result-card__value-row">
                    <span>Wasserbedarf</span>
                    <strong>{formatNum(result.totalRangeM3[0], 0)} m³/a</strong>
                </div>
            </div>
        </div>

        {/* Block 2: Grundlagen */}
        <details className="result-card__block result-card__details">
            <summary>Berechnungsgrundlagen</summary>
            <div className="result-card__value-row">
                <span>Fläche</span>
                <span>{formatNum(result.areaHa, 2)} ha</span>
            </div>
            <div className="result-card__value-row">
                <span>Wochen/Saison</span>
                <span>{result.weeks} Wochen</span>
            </div>
            <div className="result-card__value-row">
                <span>Intensität</span>
                <span>{result.mmPerWeek} mm/Woche</span>
            </div>
            <div className="result-card__value-row">
                <span>Formel</span>
                <span>{result.weeks} × {result.mmPerWeek} mm/Woche = {formatNum(result.annualMm, 0)} mm/a</span>
            </div>
            <div className="result-card__value-row">
                <span>Quelle</span>
                <span>DWA-M 590, Kap. 4.4.5 (Kunststoffrasenflächen)</span>
            </div>
        </details>
    </div>
);
