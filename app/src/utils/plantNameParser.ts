// src/utils/plantNameParser.ts

export interface PlantOption {
    fullKey: string;        // original string, e.g. "Blumenkohl|früh"
    level0: string;         // "Blumenkohl"
    level1?: string;        // "früh"
    level2?: string;        // third level, if any
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

// Returns all unique level0 values (e.g. "Blumenkohl", "Brokkoli"...)
export const getLevel0Groups = (options: PlantOption[]): string[] =>
    [...new Set(options.map((o) => o.level0))];

// Returns all options for a given level0 value
export const getLevel1Options = (options: PlantOption[], level0: string): PlantOption[] =>
    options.filter((o) => o.level0 === level0);

// Checks whether a level0 group has real selectable variants (more than one option).
// Single-option groups (e.g. fodder "Knaulgras|1") should be resolved automatically,
// even if the option has a level1 tag.
export const hasVariants = (options: PlantOption[], level0: string): boolean => {
    const group = getLevel1Options(options, level0);
    return group.length > 1;
};
