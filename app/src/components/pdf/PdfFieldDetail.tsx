// src/components/pdf/PdfFieldDetail.tsx
import {Text, View} from "@react-pdf/renderer";
import {styles} from "./PdfStyles";
import {formatNumDe} from "./pdfFormatNum";
import {PdfBerechnungsBlock, ET0} from "./PdfBerechnungsBlock";
import {PdfZuschlaegeBlock} from "./PdfZuschlaegeBlock";
import {PdfErgebnisBlock} from "./PdfErgebnisBlock";
import {getModuleLabel} from "../../constants/modules";
import {MODULE_SOURCES} from "../../constants/sources";
import type {Field} from "../../types/farm";
import type {FieldAssignment} from "../../types/project";
import type {AssignmentResult} from "../../lib/calculations/getAssignmentResult";

interface Props {
    field: Field;
    assignment: FieldAssignment;
    result: AssignmentResult;
    index: number;
    iconNormalDataUrl: string;
    iconDryDataUrl: string;
    iconAltWasserDataUrl: string;
}

export const PdfFieldDetail = ({field, assignment: fa, result, index, iconNormalDataUrl, iconDryDataUrl, iconAltWasserDataUrl}: Props) => {
    if (!fa.module) return null;

    const moduleLabel = getModuleLabel(fa.module);
    const source = MODULE_SOURCES[fa.module];
    const annualPrecip = field.climateData
        ? field.climateData.precipitation.reduce<number>((s, v) => s + (v ?? 0), 0)
        : 0;
    const annualEt0 = field.climateData
        ? field.climateData.et0.reduce<number>((s, v) => s + (v ?? 0), 0)
        : 0;

    return (
        <View>
            <Text style={styles.detailTitle}>
                {index}. {field.name} — {moduleLabel} — {formatNumDe(field.areaHa, 2)} ha
            </Text>

            {/* Standortdaten */}
            <View style={styles.detailTable}>
                <View style={styles.detailTableHeader}>
                    <Text style={styles.detailTableHeaderCell}>Standortdaten</Text>
                </View>
                <View style={styles.detailTableRow}>
                    <Text style={styles.detailTableLabel}>Koordinaten</Text>
                    <Text style={styles.detailTableValue}>
                        {formatNumDe(field.location.lat, 5)}° N, {formatNumDe(field.location.lon, 5)}° E
                    </Text>
                </View>
                {field.climateClass && (
                    <View style={styles.detailTableRow}>
                        <Text style={styles.detailTableLabel}>KWBv-Zone</Text>
                        <Text style={styles.detailTableValue}>
                            {field.climateClass[0]} ({formatNumDe(field.climateClass[1], 0)} mm)
                        </Text>
                    </View>
                )}
                {field.nFkweClass && (
                    <View style={styles.detailTableRow}>
                        <Text style={styles.detailTableLabel}>nFKWe-Klasse</Text>
                        <Text style={styles.detailTableValue}>{field.nFkweClass}</Text>
                    </View>
                )}
                {field.climateData && (
                    <>
                        <View style={styles.detailTableRow}>
                            <Text style={styles.detailTableLabel}>Jahresniederschlag</Text>
                            <Text style={styles.detailTableValue}>{formatNumDe(annualPrecip, 0)} mm</Text>
                        </View>
                        <View style={styles.detailTableRow}>
                            <Text style={styles.detailTableLabel}>Jahres-<ET0 /></Text>
                            <Text style={styles.detailTableValue}>{formatNumDe(annualEt0, 0)} mm</Text>
                        </View>
                    </>
                )}
            </View>

            {/* Nutzungsdaten */}
            <PdfNutzungsdatenBlock fa={fa} />

            {/* Berechnungsgrundlagen */}
            <PdfBerechnungsBlock module={fa.module} result={result} fa={fa} source={source} />

            {/* Zuschläge */}
            <PdfZuschlaegeBlock module={fa.module} result={result} />

            {/* Ergebnis */}
            <PdfErgebnisBlock result={result} iconNormalDataUrl={iconNormalDataUrl} iconDryDataUrl={iconDryDataUrl} iconAltWasserDataUrl={iconAltWasserDataUrl} />
        </View>
    );
};

const MONTH_NAMES = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

import {
    VEGETATION_OPTIONS,
    MOISTURE_OPTIONS,
    SOIL_OPTIONS,
    SUN_OPTIONS,
} from "../../lib/calculations/gruenflaechen";
import {boundToLabel} from "../../utils/irrigationPeriod";

const PdfNutzungsdatenBlock = ({fa}: {fa: FieldAssignment}) => {
    const rows: [string, string][] = [];

    if (fa.module === "hauptkulturen" || fa.module === "gemuese_obst") {
        if (fa.plantKey) {
            rows.push(["Kultur", fa.plantKey.split("|").slice(0, 2).join(" · ")]);
        }
    }

    if (fa.module === "gemuese_obst" && fa.irrigationPeriod) {
        rows.push(["Bewässerungszeitraum",
            `${boundToLabel(fa.irrigationPeriod.from)} – ${boundToLabel(fa.irrigationPeriod.to)}`]);
    }

    if (fa.module === "weinbau") {
        rows.push(["Junganlage", fa.isJunganlage ? "Ja" : "Nein"]);
    }

    if (fa.module === "gruenflaechen") {
        if (fa.fllVegetation) rows.push(["Vegetation", VEGETATION_OPTIONS.find(o => o.value === fa.fllVegetation)?.label ?? fa.fllVegetation]);
        if (fa.fllMoisture) rows.push(["Standortfeuchte", MOISTURE_OPTIONS.find(o => o.value === fa.fllMoisture)?.label ?? fa.fllMoisture]);
        if (fa.fllSoil) rows.push(["Bodenart", SOIL_OPTIONS.find(o => o.value === fa.fllSoil)?.label ?? fa.fllSoil]);
        if (fa.fllSun) rows.push(["Sonnenexposition", SUN_OPTIONS.find(o => o.value === fa.fllSun)?.label ?? fa.fllSun]);
        if (fa.fllPeriodStart && fa.fllPeriodEnd) {
            rows.push(["Zeitraum", `${MONTH_NAMES[fa.fllPeriodStart - 1]} – ${MONTH_NAMES[fa.fllPeriodEnd - 1]}`]);
        }
    }

    if (fa.module === "golf") {
        rows.push(["Flächenmodus", fa.golfAreaMode ?? "manual"]);
        if (fa.golfGreensM2 != null) rows.push(["Grüns/Vorgrüns", `${formatNumDe(fa.golfGreensM2, 0)} m²`]);
        if (fa.golfTeeM2 != null) rows.push(["Abschläge/Tees", `${formatNumDe(fa.golfTeeM2, 0)} m²`]);
        if (fa.golfFairwayM2 != null) rows.push(["Spielbahnen/Fairways", `${formatNumDe(fa.golfFairwayM2, 0)} m²`]);
    }

    if (fa.module === "kunstrasen") {
        if (fa.kunstrasenWeeks != null) rows.push(["Wochen/Saison", String(fa.kunstrasenWeeks)]);
        if (fa.kunstrasenMmPerWeek != null) rows.push(["Intensität", `${formatNumDe(fa.kunstrasenMmPerWeek, 1)} mm/Woche`]);
    }

    if (rows.length === 0) return null;

    return (
        <View style={styles.detailTable}>
            <View style={styles.detailTableHeader}>
                <Text style={styles.detailTableHeaderCell}>Nutzungsdaten</Text>
            </View>
            {rows.map(([label, value]) => (
                <View key={label} style={styles.detailTableRow}>
                    <Text style={styles.detailTableLabel}>{label}</Text>
                    <Text style={styles.detailTableValue}>{value}</Text>
                </View>
            ))}
        </View>
    );
};
