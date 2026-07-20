// Kontakt- und Verantwortlichkeitsdaten. ATB ist Betreiber der App.

export const DEVELOPER = {
    name: "runlevel3 GmbH",
    url: "https://www.runlevel3.de",
} as const;

export const OPERATOR = {
    name: "Leibniz-Institut für Agrartechnik und Bioökonomie e.V. (ATB)",
    address: "Max-Eyth-Allee 100, 14469 Potsdam, Deutschland",
    url: "https://www.atb-potsdam.de",
} as const;

// Impressum-Angaben (§ 5 DDG). ATB ist Betreiber der App; die vollständige
// Anbieterkennzeichnung (vertretungsberechtigte Personen, Vereinsregister,
// USt-IdNr.) wird auf die ATB-Impressumsseite verlinkt statt hier dupliziert,
// damit sie nicht driftet.
export const IMPRINT = {
    provider: OPERATOR.name,
    address: OPERATOR.address,
    contactEmail: "atb@atb-potsdam.de",
    contactPhone: "+49 (0)331 5699-0",
    imprintUrl: "https://www.atb-potsdam.de/de/impressum",
} as const;

export const STANDARD = {
    name: "DWA-M 590",
    publisher: "Deutsche Vereinigung für Wasserwirtschaft, Abwasser und Abfall e.V. (DWA)",
    url: "https://www.dwa.de",
} as const;

export const MAP_TILE_SOURCE = {
    name: "OpenStreetMap",
    url: "https://www.openstreetmap.org",
    copyrightUrl: "https://www.openstreetmap.org/copyright",
} as const;

const COPYRIGHT_START_YEAR = 2025;

export const COPYRIGHT = {
    years: __BUILD_YEAR__ > COPYRIGHT_START_YEAR
        ? `${COPYRIGHT_START_YEAR}–${__BUILD_YEAR__}`
        : `${COPYRIGHT_START_YEAR}`,
    holder: `${DEVELOPER.name} / ATB`,
} as const;
