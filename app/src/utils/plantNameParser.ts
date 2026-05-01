// src/utils/plantNameParser.ts

export interface PlantOption {
    fullKey: string;        // original string z.B. "Blumenkohl|früh"
    level0: string;         // "Blumenkohl"
    level1?: string;        // "früh"
    level2?: string;        // ggf. dritte Ebene
}

export const parsePlantNames = (names: readonly string[]): PlantOption[] =>
    names.map((name) => {
        const parts = name.split("|");
        return {
            fullKey: name,
            level0: parts[0],
            level1: parts[1],
            level2: parts[2],
        };
    });

// Gibt alle eindeutigen level0-Werte zurück (z.B. "Blumenkohl", "Brokkoli"...)
export const getLevel0Groups = (options: PlantOption[]): string[] =>
    [...new Set(options.map((o) => o.level0))];

// Gibt alle Optionen für einen bestimmten level0-Wert zurück
export const getLevel1Options = (options: PlantOption[], level0: string): PlantOption[] =>
    options.filter((o) => o.level0 === level0);

// Prüft ob eine level0-Gruppe echte Auswahl-Varianten hat (mehr als eine Option).
// Single-option-Gruppen (z.B. fodder "Knaulgras|1") sollen automatisch aufgelöst werden,
// auch wenn die Option ein level1-Tag hat.
export const hasVariants = (options: PlantOption[], level0: string): boolean => {
    const group = getLevel1Options(options, level0);
    return group.length > 1;
};
