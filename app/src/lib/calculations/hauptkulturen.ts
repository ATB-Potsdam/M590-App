// src/lib/calculations/hauptkulturen.ts
import {additionWaterDryYear, additionWaterNormYear, type CropAdditionalWater} from "../../constants/soilConstants";
import type {CropName, KwbZone, NFkweClassName, Range, Scenario} from "../../types/dataTypes";

export interface HauptkulturenInput {
    crop: CropName;
    nFkweClass: NFkweClassName;
    kwbZone: KwbZone;
    areaHa: number;
    scenario: Scenario;
    // Surcharges
    surchargeIntermediate: boolean;  // +10 mm
    surchargeEmergence: number;      // 0–20 mm
    surchargeHeavySoil: number;      // 0–20 mm (Kartoffeln only)
    // Speisekartoffeln: enables the automatic +20 mm surcharge (Kartoffeln only).
    // undefined = true (backward compatibility with saved projects).
    isTablePotato?: boolean;
    // Sommergetreide (e.g. Sommerhafer) for "sonst. Getreide" — unlocks the
    // optional surcharges. undefined = false.
    isSummerCereal?: boolean;
    // User-defined (fallback if no literature value): mm/a
    userCustomMm?: number;
}

export interface HauptkulturenResult {
    // Base value from table (mm/a) as a Range
    baseRangeMm: Range;
    // Automatic surcharge (mm) — total
    autoSurchargeMm: number;
    // Label of the automatic surcharge (e.g. "Speisekartoffeln", "Körnermais")
    autoSurchargeLabel?: string;
    // Optional surcharges (mm) — total
    optionalSurchargeMm: number;
    // Itemized optional surcharges for transparency (scenario view / PDF)
    surchargeIntermediateMm: number;
    surchargeEmergenceMm: number;
    surchargeHeavySoilMm: number;
    // Total surcharge (mm)
    totalSurchargeMm: number;
    // Total demand (mm/a) as a Range
    totalRangeMm: Range;
    // Water demand (m³/a) as a Range
    totalRangeM3: Range;
    // Scenario used
    scenario: Scenario;
    // false if no literature value exists (table value = 0)
    hasValue: boolean;
    // true if the result was derived from a user-defined value (userCustomMm)
    isUserCustom: boolean;
    // user-defined base value (mm/a) — only set when isUserCustom
    userCustomMm: number;
}

// Automatic surcharge per crop (Spec Kapitel 4.2.2):
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

// Crops with winter sowing: Zwischenfrucht and Auflaufbewässerung surcharges
// make no agronomic sense and are hidden.
const WINTER_CROPS: readonly CropName[] = ["Winterraps", "Winterweizen"];

// Whether the optional surcharges (Zwischenfrucht / Auflaufbewässerung) are
// permitted for a crop. "sonst. Getreide" only if it is Sommergetreide.
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
    // Fall back to userCustomMm when no literature value exists and a user value is set
    const isUserCustom = !hasLiteratureValue && userCustomMm !== undefined && userCustomMm > 0;
    const baseRangeMm: Range = hasLiteratureValue
        ? baseRangeMmRaw!
        : isUserCustom
            ? [userCustomMm!, userCustomMm!]
            : [0, 0];

    // Automatic surcharge. For Kartoffeln only if Speisekartoffeln
    // (isTablePotato); undefined = true (backward compatibility).
    const potatoSurchargeActive = crop !== "Kartoffeln" || isTablePotato !== false;
    const autoSurchargeMm = potatoSurchargeActive ? (AUTO_SURCHARGE_MM[crop] ?? 0) : 0;
    const autoSurchargeLabel = potatoSurchargeActive ? AUTO_SURCHARGE_LABEL[crop] : undefined;

    // Optional surcharges — itemized for transparent output. For crops without
    // sensible Zwischenfrucht/Auflaufbewässerung they are hard-set to 0.
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
        // hasValue=true means "demand value present" — also via a user value
        hasValue: hasLiteratureValue || isUserCustom,
        isUserCustom,
        userCustomMm: isUserCustom ? userCustomMm! : 0,
    };
};

// For scenario "both": compute both results
export const calculateHauptkulturenBoth = (
    input: Omit<HauptkulturenInput, "scenario">
): {normal: HauptkulturenResult; dry: HauptkulturenResult;} => ({
    normal: calculateHauptkulturen({...input, scenario: "normal"}),
    dry: calculateHauptkulturen({...input, scenario: "dry"}),
});
