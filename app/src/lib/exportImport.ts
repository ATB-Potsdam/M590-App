// src/lib/exportImport.ts
import type {Farm} from "../types/farm";
import type {Project} from "../types/project";

export const EXPORT_PREFIX = "dwa-m590";

export interface ExportData {
    version: 1;
    exportedAt: string;
    farm: Farm;
    projects: Project[];
}

const buildExportFile = (farm: Farm, projects: Project[]): File => {
    const data: ExportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        farm,
        projects,
    };
    const date = new Date().toISOString().slice(0, 10);
    const filename = `${EXPORT_PREFIX}-export-${date}.json`;
    return new File([JSON.stringify(data, null, 2)], filename, {type: "application/json"});
};

/** Try Web Share API (mobile), fall back to download link (desktop). */
export const exportData = async (farm: Farm, projects: Project[]): Promise<"shared" | "downloaded"> => {
    const file = buildExportFile(farm, projects);
    if (navigator.canShare?.({files: [file]})) {
        await navigator.share({files: [file]});
        return "shared";
    }
    // Fallback: trigger download
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return "downloaded";
};

export const parseImportFile = (text: string): ExportData => {
    let data: unknown;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error("Die Datei enthält kein gültiges JSON.");
    }
    if (!data || typeof data !== "object") {
        throw new Error("Die Datei enthält kein gültiges JSON-Objekt.");
    }
    const obj = data as Record<string, unknown>;
    if (obj.version !== 1) {
        throw new Error("Unbekannte Export-Version. Bitte eine kompatible Datei verwenden.");
    }
    if (!obj.farm || typeof obj.farm !== "object") {
        throw new Error("Die Datei enthält keine gültigen Betriebsdaten.");
    }
    if (!Array.isArray(obj.projects)) {
        throw new Error("Die Datei enthält keine gültigen Projektdaten.");
    }
    return data as ExportData;
};
