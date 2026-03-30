import type {NFkweClassName} from "../../types/dataTypes";

// RawData hat 4 Indizes: ["1-2", "3a-3b", "4", "5"]
export const nFkweToRawIndex = (cls: NFkweClassName): 0 | 1 | 2 | 3 => {
    switch (cls) {
        case "1-2": return 0;
        case "3a": case "3b": return 1;
        case "4": return 2;
        case "5": return 3;
        default:
            console.warn(`Unknown nFKWe class: ${cls}, falling back to index 0`);
            return 0;
    }
};
