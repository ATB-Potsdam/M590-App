// src/components/results/GemueseObstResult.tsx
import {formatNum, formatRange} from "../../lib/formatNum";
import type {GemueseObstResult} from "../../lib/calculations/gemueseObst";
import "./ResultCard.scss";

interface Props {
    result: GemueseObstResult;
    dryResult?: GemueseObstResult;
    fieldName: string;
    plantName: string;
    areaHa: number;
}

export const GemueseObstResultCard = ({result, dryResult, fieldName, plantName, areaHa}: Props) => (
    <div className="result-card">
        <div className="result-card__header">
            <strong>{fieldName}</strong>
            <span>{plantName} · {formatNum(areaHa, 2)} ha</span>
        </div>

        {/* Block 1: Ergebnis */}
        <div className="result-card__block">
            <h4>Zusatzwasserbedarf{result.isUserCustom && <span className="result-card__custom-tag"> · benutzerdefiniert</span>}</h4>
            {!result.hasValue ? (
                <p className="result-card__no-value">
                    Kein Literaturwert vorhanden. Leere Felder bedeuten fehlende Literaturwerte, nicht „kein Bedarf".
                </p>
            ) : (
                <div className="result-card__values">
                    <div className="result-card__value-row">
                        <span>{dryResult ? "Normaljahr" : "Gesamt"}</span>
                        <strong>{formatRange(result.totalRangeMm, "mm/a")}</strong>
                        <strong>{formatRange(result.totalRangeM3, "m³/a")}</strong>
                    </div>
                    {dryResult && dryResult.hasValue && (
                        <div className="result-card__value-row">
                            <span>Trockenjahr</span>
                            <strong>{formatRange(dryResult.totalRangeMm, "mm/a")}</strong>
                            <strong>{formatRange(dryResult.totalRangeM3, "m³/a")}</strong>
                        </div>
                    )}
                    {dryResult && !dryResult.hasValue && (
                        <p className="result-card__no-value">
                            Trockenjahr: kein Literaturwert vorhanden.
                        </p>
                    )}
                </div>
            )}
        </div>

        {/* Block 2: Berechnungsgrundlagen */}
        <details className="result-card__block result-card__details">
            <summary>Berechnungsgrundlagen</summary>

            <div className="result-card__value-row">
                <span>{result.isUserCustom ? "Benutzerdefinierter Wert" : "Basiswert Potsdam"}</span>
                <span>
                    {result.isUserCustom
                        ? `${formatNum(result.userCustomMm, 0)} mm/a (benutzerdefiniert)`
                        : result.hasValue ? formatRange(result.baseRangeMm, 'mm') : "kein Literaturwert"}
                    {dryResult && (
                        <>
                            {" (Normal) / "}
                            {dryResult.isUserCustom
                                ? `${formatNum(dryResult.userCustomMm, 0)} mm/a (benutzerdefiniert)`
                                : dryResult.hasValue ? formatRange(dryResult.baseRangeMm, 'mm') : "kein Literaturwert"}{" (Trocken)"}
                        </>
                    )}
                </span>
            </div>
            <div className="result-card__value-row">
                <span>ΔKWB Standort</span>
                <span>{result.deltaKwb > 0 ? '+' : ''}{formatNum(result.deltaKwb, 0)} mm</span>
            </div>
            <div className="result-card__value-row">
                <span>Korrektur (×rFaktor)</span>
                <span>{result.correctionMm > 0 ? '+' : ''}{formatNum(result.correctionMm, 0)} mm</span>
            </div>

            <div className="result-card__value-row">
                <span>Tabellen</span>
                <span>Tab. 21–25 (Basiswerte je Kultur), Tab. 19 (KWB-Referenz Potsdam), Tab. 20 (Korrekturfaktor r)</span>
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
                            <td>{row.label}{row.weight < 1 && <span className="result-card__weight"> ×{formatNum(row.weight, 2)}</span>}</td>
                            <td>{formatNum(row.precip, 0)}</td>
                            <td>{formatNum(row.et0, 0)}</td>
                            <td className={row.localKwb > 0 ? 'cell--positive' : 'cell--negative'}>{formatNum(row.localKwb, 0)}</td>
                            <td>{formatNum(row.refKwbVal, 0)}</td>
                            <td className={row.weightedDelta > 0 ? 'cell--positive' : 'cell--negative'}>
                                {row.weightedDelta > 0 ? '+' : ''}{formatNum(row.weightedDelta, 1)}
                            </td>
                        </tr>
                    ))}
                    <tr className="result-card__climate-table-sum">
                        <td colSpan={5}>Summe ΔKWB</td>
                        <td>{result.deltaKwb > 0 ? '+' : ''}{formatNum(result.deltaKwb, 0)} mm</td>
                    </tr>
                </tbody>
            </table>
        </details>

        {/* Block 3: Zuschläge — itemisiert */}
        {result.totalSurchargeMm > 0 && (
            <details className="result-card__block result-card__details">
                <summary>Zuschläge (+{formatNum(result.totalSurchargeMm, 0)} mm)</summary>
                {result.surchargeEmergenceMm > 0 && (
                    <div className="result-card__value-row">
                        <span>Auflaufbewässerung</span>
                        <span>+{formatNum(result.surchargeEmergenceMm, 0)} mm</span>
                    </div>
                )}
            </details>
        )}
    </div>
);
