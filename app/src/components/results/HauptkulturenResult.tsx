import {formatRange} from "../../lib/formatNum";
import type {HauptkulturenResult} from "../../lib/calculations/hauptkulturen";
import "./ResultCard.scss";

interface Props {
    result: HauptkulturenResult;
    dryResult?: HauptkulturenResult; // für Szenario "both"
    fieldName: string;
    cropName: string;
    areaHa: number;
}

export const HauptkulturenResultCard = ({result, dryResult, fieldName, cropName, areaHa}: Props) => (
    <div className="result-card">
        <div className="result-card__header">
            <strong>{fieldName}</strong>
            <span>{cropName} · {areaHa} ha</span>
        </div>

        {/* Block 1: Ergebnis */}
        <div className="result-card__block">
            <h4>Zusatzwasserbedarf</h4>
            {!result.hasValue ? (
                <p className="result-card__no-value">
                    Kein Literaturwert vorhanden. Leere Felder bedeuten fehlende Literaturwerte, nicht „kein Bedarf".
                </p>
            ) : (
                <div className="result-card__values">
                    <div className="result-card__value-row">
                        <span>{dryResult ? "🌤 Normaljahr" : "Gesamt"}</span>
                        <strong>{formatRange(result.totalRangeMm, "mm/a")}</strong>
                        <strong>{formatRange(result.totalRangeM3, "m³/a")}</strong>
                    </div>
                    {dryResult && dryResult.hasValue && (
                        <div className="result-card__value-row">
                            <span>☀️ Trockenjahr</span>
                            <strong>{formatRange(dryResult.totalRangeMm, "mm/a")}</strong>
                            <strong>{formatRange(dryResult.totalRangeM3, "m³/a")}</strong>
                        </div>
                    )}
                    {dryResult && !dryResult.hasValue && (
                        <p className="result-card__no-value">
                            ☀️ Trockenjahr: kein Literaturwert vorhanden.
                        </p>
                    )}
                </div>
            )}
        </div>

        {/* Block 2: Berechnungsgrundlagen */}
        <details className="result-card__block result-card__details">
            <summary>Berechnungsgrundlagen</summary>
            <div className="result-card__value-row">
                <span>{dryResult && "🌤 "}Tabellenwert (Basis)</span>
                <span>
                    {formatRange(result.baseRangeMm, "mm/a")}
                </span>
            </div>
            {dryResult && <div className="result-card__value-row">
                <span>☀️ Tabellenwert (Basis)</span>
                <span>
                    {formatRange(dryResult.baseRangeMm, "mm/a")}
                </span>
            </div>}
            <div className="result-card__value-row">
                <span>Tabellen</span>
                <span>Tab. 3–18 (ZWB je KWBv-Zone), Tab. 19 (KWB-Referenz Potsdam), Tab. 20 (Korrekturfaktor r)</span>
            </div>
        </details>

        {/* Block 3: Zuschläge */}
        {result.totalSurchargeMm > 0 && (
            <details className="result-card__block result-card__details">
                <summary>Zuschläge (+{result.totalSurchargeMm} mm)</summary>
                {result.autoSurchargeMm > 0 && (
                    <div className="result-card__value-row">
                        <span>Automatisch (Kultur)</span>
                        <span>+{result.autoSurchargeMm} mm</span>
                    </div>
                )}
                {result.optionalSurchargeMm > 0 && (
                    <div className="result-card__value-row">
                        <span>Optional</span>
                        <span>+{result.optionalSurchargeMm} mm</span>
                    </div>
                )}
            </details>
        )}
    </div>
);
