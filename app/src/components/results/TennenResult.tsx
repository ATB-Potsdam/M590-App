import {formatNum} from "../../lib/formatNum";
import type {TennenResult} from "../../lib/calculations/tennen";
import type {NaturrasenPrecipClass} from "../../lib/calculations/naturrasen";
import "./ResultCard.scss";

interface Props {
    result: TennenResult;
    fieldName: string;
    areaHa: number;
}

const precipClassLabel = (pc: NaturrasenPrecipClass): string => {
    if (pc === "<500") return "< 500 mm/a";
    if (pc === "500-700") return "500–700 mm/a";
    if (pc === "700-900") return "700–900 mm/a";
    return "> 900 mm/a";
};

const formatWaterRange = (result: TennenResult): string => {
    if (result.isOpenRange) {
        return `> ${formatNum(result.totalRangeMm[0], 0)} mm/a`;
    }
    const [min, max] = result.totalRangeMm;
    return min === max
        ? `${formatNum(min, 0)} mm/a`
        : `${formatNum(min, 0)}–${formatNum(max, 0)} mm/a`;
};

const formatM3Range = (result: TennenResult): string => {
    if (result.isOpenRange) {
        return `> ${formatNum(result.totalRangeM3[0], 0)} m³/a`;
    }
    const [min, max] = result.totalRangeM3;
    return min === max
        ? `${formatNum(min, 0)} m³/a`
        : `${formatNum(min, 0)}–${formatNum(max, 0)} m³/a`;
};

export const TennenResultCard = ({result, fieldName, areaHa}: Props) => (
    <div className="result-card">
        <div className="result-card__header">
            <strong>{fieldName}</strong>
            <span>Tennenfläche · {formatNum(areaHa, 2)} ha</span>
        </div>

        {/* Block 1: Ergebnis */}
        <div className="result-card__block">
            <h4>Befeuchtungswasserbedarf</h4>
            <div className="result-card__values">
                <div className="result-card__value-row">
                    <span>Gesamt</span>
                    <strong>{formatWaterRange(result)}</strong>
                    <strong>{formatM3Range(result)}</strong>
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
                <span>Tabelle 36 (DIN 18035-2:2020)</span>
            </div>
        </details>
    </div>
);
