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

/**
 * The data the app ships, with the attribution each source requires.
 *
 * CC BY and the BGR terms both oblige us to name source and licence, so these
 * are legal obligations rather than courtesy. Keep `attribution` exactly as the
 * provider prescribes it — the BGR states the wording verbatim in the BÜK250
 * metadata ("Datenquelle: BÜK250 V6.0, © BGR, Hannover, 2024.").
 *
 * See LEGAL-TODO.md; the M 590 entry is the one still needing a decision, since
 * reproducing the tables and the annex map goes beyond citation.
 */
export const DATA_SOURCES = [
    {
        subject: "Kartenkacheln",
        name: "OpenStreetMap",
        url: MAP_TILE_SOURCE.url,
        attribution: "© OpenStreetMap-Mitwirkende",
        licence: "ODbL",
        licenceUrl: MAP_TILE_SOURCE.copyrightUrl,
    },
    {
        subject: "Klimaräume und KWBv-Klassen",
        name: "DWA-M 590, Anhang",
        url: "https://www.dwa.de",
        attribution: "© DWA, Hennef",
        licence: null,
        licenceUrl: null,
    },
    {
        subject: "Niederschlag (1991–2020)",
        name: "HYRAS-DE-PR v6.1, DWD Climate Data Center",
        url: "https://opendata.dwd.de/climate_environment/CDC/grids_germany/monthly/hyras_de/precipitation/",
        attribution: "© Deutscher Wetterdienst",
        licence: "CC BY 4.0",
        licenceUrl: "https://creativecommons.org/licenses/by/4.0/deed.de",
    },
    {
        subject: "Verdunstung ET₀ (1991–2020)",
        name: "Grasreferenzverdunstung nach FAO-56, DWD Climate Data Center",
        url: "https://opendata.dwd.de/climate_environment/CDC/grids_germany/daily/evaporation_fao/",
        attribution: "© Deutscher Wetterdienst",
        licence: "CC BY 4.0",
        licenceUrl: "https://creativecommons.org/licenses/by/4.0/deed.de",
    },
    {
        subject: "nFKWe-Klassen",
        name: "Bodenübersichtskarte 1:250.000 (BÜK250)",
        url: "https://www.bgr.bund.de",
        attribution: "Datenquelle: BÜK250 V6.0, © BGR, Hannover, 2024.",
        licence: "BGR-AGB",
        licenceUrl: "https://www.bgr.bund.de/AGB",
    },
] as const;

const COPYRIGHT_START_YEAR = 2025;

export const COPYRIGHT = {
    years: __BUILD_YEAR__ > COPYRIGHT_START_YEAR
        ? `${COPYRIGHT_START_YEAR}–${__BUILD_YEAR__}`
        : `${COPYRIGHT_START_YEAR}`,
    holder: `${DEVELOPER.name}/\u200bATB`,
} as const;
