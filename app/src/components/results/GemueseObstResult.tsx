// src/components/results/GemueseObstResult.tsx
import type {GemueseObstResult} from "../../lib/calculations/gemueseObst";
import "./ResultCard.scss";

interface Props {
    result: GemueseObstResult;
    dryResult?: GemueseObstResult;
    fieldName: string;
    plantName: string;
    areaHa: number;
}
const formatRange = ([min, max]: [number, number], unit: string): string =>
    min === max ? `${min.toFixed(0)} ${unit}` : `${min.toFixed(0)}–${max.toFixed(0)} ${unit}`;

export const GemueseObstResultCard = ({result, dryResult, fieldName, plantName, areaHa}: Props) => (
    <div className="result-card">
        <div className="result-card__header">
            <strong>{fieldName}</strong>
            <span>{plantName} · {areaHa} ha</span>
        </div>

        {/* Block 1: Ergebnis */}
        <div className="result-card__block">
            <h4>Zusatzwasserbedarf</h4>
            <div className="result-card__values">
                <div className="result-card__value-row">
                    <span>{dryResult ? "🌤 Normaljahr" : "Gesamt"}</span>
                    <strong>{formatRange(result.totalRangeMm, "mm/a")}</strong>
                    <strong>{formatRange(result.totalRangeM3, "m³/a")}</strong>
                </div>
                {dryResult && (
                    <div className="result-card__value-row">
                        <span>☀️ Trockenjahr</span>
                        <strong>{formatRange(dryResult.totalRangeMm, "mm/a")}</strong>
                        <strong>{formatRange(dryResult.totalRangeM3, "m³/a")}</strong>
                    </div>
                )}
            </div>
        </div>

        {/* Block 2: Berechnungsgrundlagen */}
        <details className="result-card__block result-card__details">
            <summary>Berechnungsgrundlagen</summary>

            <div className="result-card__value-row">
                <span>Basiswert Potsdam</span>
                <span>
                    {formatRange(result.baseRangeMm, 'mm')}
                    {dryResult && (
                        <>
                            {" 🌤 / "}
                            {formatRange(dryResult.baseRangeMm, 'mm')} ☀️
                        </>
                    )}                </span>
            </div>
            <div className="result-card__value-row">
                <span>ΔKWB Standort</span>
                <span>{result.deltaKwb > 0 ? '+' : ''}{result.deltaKwb} mm</span>
            </div>
            <div className="result-card__value-row">
                <span>Korrektur (×rFaktor)</span>
                <span>{result.correctionMm > 0 ? '+' : ''}{result.correctionMm} mm</span>
            </div>

            {/* Monatstabelle */}
            <table className="result-card__climate-table">
                <thead>
                    <tr>
                        <th>Monat</th>
                        <th title="Niederschlag">N (mm)</th>
                        <th title="Gras-ET₀">ET₀</th>
                        <th title="Lokaler KWB = ET₀ − N">KWB</th>
                        <th title="Referenz-KWB Potsdam">KWB<sub>Ref</sub></th>
                        <th title="Differenz × Gewicht">ΔKWB</th>
                    </tr>
                </thead>
                <tbody>
                    {result.monthlyRows.map((row) => (
                        <tr key={row.label}>
                            <td>{row.label}{row.weight < 1 && <span className="result-card__weight"> ×{row.weight}</span>}</td>
                            <td>{row.precip}</td>
                            <td>{row.et0}</td>
                            <td className={row.localKwb > 0 ? 'cell--positive' : 'cell--negative'}>{row.localKwb}</td>
                            <td>{row.refKwbVal}</td>
                            <td className={row.weightedDelta > 0 ? 'cell--positive' : 'cell--negative'}>
                                {row.weightedDelta > 0 ? '+' : ''}{row.weightedDelta}
                            </td>
                        </tr>
                    ))}
                    <tr className="result-card__climate-table-sum">
                        <td colSpan={5}>Summe ΔKWB</td>
                        <td>{result.deltaKwb > 0 ? '+' : ''}{result.deltaKwb} mm</td>
                    </tr>
                </tbody>
            </table>
        </details>

        {/* Block 3: Zuschläge */}
        {result.totalSurchargeMm > 0 && (
            <details className="result-card__block result-card__details">
                <summary>Zuschläge (+{result.totalSurchargeMm} mm)</summary>
                {result.optionalSurchargeMm > 0 && (
                    <div className="result-card__value-row">
                        <span>Weitere Zuschläge</span>
                        <span>+{result.optionalSurchargeMm} mm</span>
                    </div>
                )}
            </details>
        )}
    </div>
);
