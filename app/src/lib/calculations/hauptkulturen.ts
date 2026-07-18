// src/lib/calculations/hauptkulturen.ts
import {additionWaterDryYear, additionWaterNormYear, type CropAdditionalWater} from "../../constants/soilConstants";
import type {CropName, KwbZone, NFkweClassName, Range, Scenario} from "../../types/dataTypes";

export interface HauptkulturenInput {
    crop: CropName;
    nFkweClass: NFkweClassName;
    kwbZone: KwbZone;
    areaHa: number;
    scenario: Scenario;
    // Zuschläge
    surchargeIntermediate: boolean;  // +10 mm
    surchargeEmergence: number;      // 0–20 mm
    surchargeHeavySoil: number;      // 0–20 mm (nur Kartoffeln)
    // Speisekartoffeln: aktiviert den automatischen +20-mm-Zuschlag (nur Kartoffeln).
    // undefined = true (Rückwärtskompatibilität mit gespeicherten Projekten).
    isTablePotato?: boolean;
    // Sommergetreide (z.B. Sommerhafer) bei "sonst. Getreide" — schaltet die
    // optionalen Zuschläge frei. undefined = false.
    isSummerCereal?: boolean;
    // Benutzerdefiniert (Fallback, falls kein Literaturwert): mm/a
    userCustomMm?: number;
}

export interface HauptkulturenResult {
    // Basiswert aus Tabelle (mm/a) als Range
    baseRangeMm: Range;
    // Automatischer Zuschlag (mm) — gesamt
    autoSurchargeMm: number;
    // Beschriftung des automatischen Zuschlags (z.B. "Speisekartoffeln", "Körnermais")
    autoSurchargeLabel?: string;
    // Optionale Zuschläge (mm) — gesamt
    optionalSurchargeMm: number;
    // Itemisierte optionale Zuschläge für Transparenz (Szenario-Ansicht / PDF)
    surchargeIntermediateMm: number;
    surchargeEmergenceMm: number;
    surchargeHeavySoilMm: number;
    // Gesamtzuschlag (mm)
    totalSurchargeMm: number;
    // Gesamtbedarf (mm/a) als Range
    totalRangeMm: Range;
    // Wasserbedarf (m³/a) als Range
    totalRangeM3: Range;
    // Verwendetes Szenario
    scenario: Scenario;
    // false wenn kein Literaturwert vorhanden (Tabellenwert = 0)
    hasValue: boolean;
    // true wenn das Ergebnis aus einem benutzerdefinierten Wert (userCustomMm) abgeleitet wurde
    isUserCustom: boolean;
    // benutzerdefinierter Basiswert (mm/a) — nur gesetzt wenn isUserCustom
    userCustomMm: number;
}

// Automatischer Zuschlag je Kultur (Spec Kapitel 4.2.2):
// - Speisekartoffeln: +20 mm/a
// - Körnermais (vs. Silomais): +20 mm/a
const AUTO_SURCHARGE_MM: Partial<Record<CropName, number>> = {
    "Kartoffeln": 20,
    "Silomais|Körnermais": 20,
};

const AUTO_SURCHARGE_LABEL: Partial<Record<CropName, string>> = {
    "Kartoffeln": "Speisekartoffeln",
    "Silomais|Körnermais": "Körnermais",
};

// Kulturen mit Winteransaat: Zwischenfrucht- und Auflaufbewässerungs-Zuschläge
// sind agronomisch nicht sinnvoll und werden ausgeblendet.
const WINTER_CROPS: readonly CropName[] = ["Winterraps", "Winterweizen"];

// Ob die optionalen Zuschläge (Zwischenfrucht / Auflaufbewässerung) für eine
// Kultur zulässig sind. "sonst. Getreide" nur, wenn es Sommergetreide ist.
export const cropAllowsOptionalSurcharge = (
    crop: CropName | undefined,
    isSummerCereal: boolean,
): boolean => {
    if (!crop) return false;
    if (WINTER_CROPS.includes(crop)) return false;
    if (crop === "sonst. Getreide") return isSummerCereal;
    return true;
};

const getTableValue = (
    kwbZone: KwbZone,
    crop: CropName,
    nFkweClass: NFkweClassName,
    scenario: Scenario
): Range | null => {
    const table: CropAdditionalWater =
        scenario === "dry" ? additionWaterDryYear : additionWaterNormYear;
    return table[kwbZone]?.[crop]?.[nFkweClass] ?? null;
};

export const calculateHauptkulturen = (input: HauptkulturenInput): HauptkulturenResult => {
    const {crop, nFkweClass, kwbZone, areaHa, scenario,
        surchargeIntermediate, surchargeEmergence, surchargeHeavySoil,
        isTablePotato, isSummerCereal, userCustomMm} = input;

    const baseRangeMmRaw = getTableValue(kwbZone, crop, nFkweClass, scenario);
    const hasLiteratureValue = baseRangeMmRaw !== null;
    // Fallback auf userCustomMm wenn kein Literaturwert vorliegt und ein Anwenderwert gesetzt ist
    const isUserCustom = !hasLiteratureValue && userCustomMm !== undefined && userCustomMm > 0;
    const baseRangeMm: Range = hasLiteratureValue
        ? baseRangeMmRaw!
        : isUserCustom
            ? [userCustomMm!, userCustomMm!]
            : [0, 0];

    // Automatischer Zuschlag. Bei Kartoffeln nur, wenn Speisekartoffeln
    // (isTablePotato); undefined = true (Rückwärtskompatibilität).
    const potatoSurchargeActive = crop !== "Kartoffeln" || isTablePotato !== false;
    const autoSurchargeMm = potatoSurchargeActive ? (AUTO_SURCHARGE_MM[crop] ?? 0) : 0;
    const autoSurchargeLabel = potatoSurchargeActive ? AUTO_SURCHARGE_LABEL[crop] : undefined;

    // Optionale Zuschläge — itemisiert für transparente Ausgabe. Für Kulturen ohne
    // sinnvolle Zwischenfrucht-/Auflaufbewässerung werden sie hart auf 0 gesetzt.
    const allowOptional = cropAllowsOptionalSurcharge(crop, isSummerCereal ?? false);
    const surchargeIntermediateMm = allowOptional && surchargeIntermediate ? 10 : 0;
    const surchargeEmergenceMm = allowOptional ? surchargeEmergence : 0;
    const surchargeHeavySoilMm = surchargeHeavySoil;
    const optionalSurchargeMm = surchargeIntermediateMm + surchargeEmergenceMm + surchargeHeavySoilMm;

    const totalSurchargeMm = autoSurchargeMm + optionalSurchargeMm;

    const totalRangeMm: Range = [
        baseRangeMm[0] + totalSurchargeMm,
        baseRangeMm[1] + totalSurchargeMm,
    ];

    // mm/a × ha × 10 = m³/a
    const totalRangeM3: Range = [
        totalRangeMm[0] * areaHa * 10,
        totalRangeMm[1] * areaHa * 10,
    ];

    return {
        baseRangeMm,
        autoSurchargeMm,
        autoSurchargeLabel,
        optionalSurchargeMm,
        surchargeIntermediateMm,
        surchargeEmergenceMm,
        surchargeHeavySoilMm,
        totalSurchargeMm,
        totalRangeMm,
        totalRangeM3,
        scenario,
        // hasValue=true heißt „Bedarfsangabe vorhanden“ — auch via Anwenderwert
        hasValue: hasLiteratureValue || isUserCustom,
        isUserCustom,
        userCustomMm: isUserCustom ? userCustomMm! : 0,
    };
};

// Für Szenario "both": beide Ergebnisse berechnen
export const calculateHauptkulturenBoth = (
    input: Omit<HauptkulturenInput, "scenario">
): {normal: HauptkulturenResult; dry: HauptkulturenResult;} => ({
    normal: calculateHauptkulturen({...input, scenario: "normal"}),
    dry: calculateHauptkulturen({...input, scenario: "dry"}),
});
