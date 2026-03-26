import type {GruenflaechenResult} from "../../lib/calculations/gruenflaechen";
import "./ResultCard.scss";

interface Props {
    result: GruenflaechenResult;
    fieldName: string;
    areaHa: number;
}

const MONTH_NAMES = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

export const GruenflaechenResultCard = ({result, fieldName, areaHa}: Props) => (
    <div className="result-card">
        <div className="result-card__header">
            <strong>{fieldName}</strong>
            <span>Grünfläche · {areaHa} ha</span>
        </div>

        {/* Block 1: Ergebnis */}
        <div className="result-card__block">
            <h4>Zusatzwasserbedarf</h4>
            <div className="result-card__values">
                <div className="result-card__value-row">
                    <span>ETt (täglich)</span>
                    <strong>{result.ettMmPerDay.toFixed(2)} mm/d</strong>
                </div>
                <div className="result-card__value-row">
                    <span>Zeitraum ({MONTH_NAMES[result.periodStart - 1]}–{MONTH_NAMES[result.periodEnd - 1]}, {result.periodDays} Tage)</span>
                    <strong>{result.totalRangeMm[0].toFixed(0)} mm</strong>
                </div>
                <div className="result-card__value-row">
                    <span>Wasserbedarf</span>
                    <strong>{result.totalRangeM3[0].toFixed(0)} m³</strong>
                </div>
            </div>
        </div>

        {/* Block 2: Grundlagen */}
        <details className="result-card__block result-card__details">
            <summary>Berechnungsgrundlagen</summary>
            <div className="result-card__value-row">
                <span>Ø ET₀ im Zeitraum</span>
                <span>{result.avgDailyEt0.toFixed(2)} mm/d</span>
            </div>
            <div className="result-card__value-row">
                <span>Faktor L (Lebensbereich)</span>
                <span>{result.factorL}</span>
            </div>
            <div className="result-card__value-row">
                <span>Faktor G (Vegetation)</span>
                <span>{result.factorG}</span>
            </div>
            <div className="result-card__value-row">
                <span>Faktor B (Bodenart)</span>
                <span>{result.factorB}</span>
            </div>
            <div className="result-card__value-row">
                <span>Faktor S (Sonne)</span>
                <span>{result.factorS}</span>
            </div>
            <div className="result-card__value-row">
                <span>Faktorprodukt (L×G×B×S)</span>
                <strong>{result.factorProduct.toFixed(3)}</strong>
            </div>
            <div className="result-card__value-row">
                <span>ETt = ET₀ × {result.factorProduct.toFixed(3)}</span>
                <strong>{result.ettMmPerDay.toFixed(2)} mm/d</strong>
            </div>
        </details>
    </div>
);
