// Contact and responsibility data. ATB is the operator of the app.

export const DEVELOPER = {
    name: "runlevel3 GmbH",
    url: "https://www.runlevel3.de",
} as const;

export const OPERATOR = {
    name: "Leibniz-Institut für Agrartechnik und Bioökonomie e.V. (ATB)",
    address: "Max-Eyth-Allee 100, 14469 Potsdam, Deutschland",
    url: "https://www.atb-potsdam.de",
} as const;

// Impressum (legal notice) details (§ 5 DDG). ATB is the operator of the app; the
// full provider identification (authorized representatives, Vereinsregister,
// USt-IdNr.) is linked to the ATB Impressum page instead of duplicated here,
// so that it does not drift.
export const IMPRINT = {
    provider: OPERATOR.name,
    address: OPERATOR.address,
    contactEmail: "atb@atb-potsdam.de",
    contactPhone: "+49 (0)331 5699-0",
    imprintUrl: "https://www.atb-potsdam.de/de/impressum",
} as const;

// Privacy (Datenschutz) details. The contact of the data protection officer and
// the full privacy policy reside with ATB; they are referenced here.
// TODO(ATB): confirm the responsibility of the supervisory authority (seat Potsdam →
// presumably LDA Brandenburg).
export const PRIVACY = {
    dpoEmail: "datenschutz@atb-potsdam.de",
    policyUrl: "https://www.atb-potsdam.de/de/datenschutz",
    supervisoryAuthority: "Die Landesbeauftragte für den Datenschutz und für das Recht auf Akteneinsicht Brandenburg (LDA Brandenburg)",
    supervisoryAuthorityUrl: "https://www.lda.brandenburg.de",
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
    holder: `${DEVELOPER.name}/\u200bATB`,
} as const;
