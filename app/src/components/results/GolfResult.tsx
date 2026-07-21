import {formatNum, formatRange} from "../../lib/formatNum";
import type {GolfResult} from "../../lib/calculations/golf";
import "./ResultCard.scss";

interface Props {
    result: GolfResult;
    fieldName: string;
}

const precipClassLabel = (pc: string): string => {
    if (pc === "<500") return "< 500 mm/a";
    if (pc === "500-700") return "500–700 mm/a";
    if (pc === "700-900") return "700–900 mm/a";
    return "> 900 mm/a";
};

export const GolfResultCard = ({result, fieldName}: Props) => (
    <div className="result-card">
        <div className="result-card__header">
            <strong>{fieldName}</strong>
            <span>Golfplatz</span>
        </div>

        {/* Block 1: Ergebnis */}
        <div className="result-card__block">
            <h4>Zusatzwasserbedarf gesamt</h4>
            <div className="result-card__values">
                <div className="result-card__value-row">
                    <span>Gesamt</span>
                    <strong>{formatRange(result.totalRangeM3, "m³/a")}</strong>
                </div>
                <div className="result-card__value-row">
                    <span>Grüns/{'\u200b'}Vorgrüns</span>
                    <span>{formatRange(result.greens.rangeM3, "m³/a")}</span>
                </div>
                <div className="result-card__value-row">
                    <span>Abschläge/{'\u200b'}Tees</span>
                    <span>{formatRange(result.tees.rangeM3, "m³/a")}</span>
                </div>
                <div className="result-card__value-row">
                    <span>Spielbahnen/{'\u200b'}Fairways</span>
                    <span>{formatRange(result.fairways.rangeM3, "m³/a")}</span>
                </div>
            </div>
        </div>

        {/* Block 2: Grundlagen */}
        <details className="result-card__block result-card__details">
            <summary>Berechnungsgrundlagen</summary>
            <div className="result-card__value-row">
                <span>Jahresniederschlag</span>
                <span>{formatNum(result.annualPrecipMm, 0)} mm/a</span>
            </div>
            <div className="result-card__value-row">
                <span>Niederschlagsklasse</span>
                <span>{precipClassLabel(result.precipClass)}</span>
            </div>
            <div className="result-card__value-row">
                <span>Tabelle</span>
                <span>Tabelle 34 (DWA-M 590)</span>
            </div>

            <table className="result-card__climate-table">
                <thead>
                    <tr>
                        <th>Bereich</th>
                        <th>Fläche (m²)</th>
                        <th>ZWB (mm/a)</th>
                        <th>ZWB (m³/a)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Grüns/{'\u200b'}Vorgrüns</td>
                        <td>{formatNum(result.greens.areaM2, 0)}</td>
                        <td>{formatRange(result.greens.rangeMmPerA, "")}</td>
                        <td>{formatRange(result.greens.rangeM3, "")}</td>
                    </tr>
                    <tr>
                        <td>Abschläge/{'\u200b'}Tees</td>
                        <td>{formatNum(result.tees.areaM2, 0)}</td>
                        <td>{formatRange(result.tees.rangeMmPerA, "")}</td>
                        <td>{formatRange(result.tees.rangeM3, "")}</td>
                    </tr>
                    <tr>
                        <td>Spielbahnen/{'\u200b'}Fairways</td>
                        <td>{formatNum(result.fairways.areaM2, 0)}</td>
                        <td>{formatRange(result.fairways.rangeMmPerA, "")}</td>
                        <td>{formatRange(result.fairways.rangeM3, "")}</td>
                    </tr>
                </tbody>
            </table>
        </details>
    </div>
);
