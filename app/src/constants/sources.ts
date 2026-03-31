// src/constants/sources.ts
import type {ModuleType} from "../types/project";

export interface SourceReference {
    id: string;
    shortName: string;
    fullName: string;
    tables: string;
}

export const MODULE_SOURCES: Record<ModuleType, SourceReference> = {
    hauptkulturen: {
        id: "dwa-m590-hk",
        shortName: "DWA-M 590",
        fullName: "DWA-Merkblatt M 590",
        tables: "Tab. 3–18, 19, 20",
    },
    gemuese_obst: {
        id: "dwa-m590-go",
        shortName: "DWA-M 590",
        fullName: "DWA-Merkblatt M 590",
        tables: "Tab. 21–25, 19, 20",
    },
    weinbau: {
        id: "dwa-m590-wb",
        shortName: "DWA-M 590",
        fullName: "DWA-Merkblatt M 590",
        tables: "Tab. 26/27",
    },
    gruenflaechen: {
        id: "dwa-m590-fll",
        shortName: "DWA-M 590 / FLL",
        fullName: "DWA-Merkblatt M 590 / FLL-Richtlinie",
        tables: "Tab. 29–32",
    },
    naturrasen: {
        id: "din-18035-nr",
        shortName: "DIN 18035-2:2020",
        fullName: "DIN 18035-2:2020 – Sportplätze, Bewässerung",
        tables: "Tabelle 33",
    },
    golf: {
        id: "dwa-m590-golf",
        shortName: "DWA-M 590",
        fullName: "DWA-Merkblatt M 590",
        tables: "Tabelle 34",
    },
    kunstrasen: {
        id: "dwa-m590-kr",
        shortName: "DWA-M 590",
        fullName: "DWA-Merkblatt M 590",
        tables: "Kap. 4.4.5",
    },
    tennen: {
        id: "din-18035-tn",
        shortName: "DIN 18035-2:2020",
        fullName: "DIN 18035-2:2020 – Sportplätze, Bewässerung",
        tables: "Tabelle 36",
    },
};

/** Deduplicated list of sources used by the given modules. */
export const getUsedSources = (modules: ModuleType[]): SourceReference[] => {
    const seen = new Set<string>();
    const result: SourceReference[] = [];
    for (const m of modules) {
        const src = MODULE_SOURCES[m];
        if (!seen.has(src.id)) {
            seen.add(src.id);
            result.push(src);
        }
    }
    return result;
};
