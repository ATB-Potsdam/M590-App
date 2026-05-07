import {Link} from "react-router";
import {CONTACT_EMAIL, COPYRIGHT, DEVELOPER, MAP_TILE_SOURCE, OPERATOR, STANDARD} from "../constants/contact";
import "./AboutPage.scss";

export const AboutPage = () => (
    <div className="info-page">
        <Link to="/" className="info-page__back">← Zurück</Link>
        <h1 className="info-page__title">Über die App</h1>

        <section className="info-page__section">
            <p>
                Die <strong>DWA-App (M 590)</strong> berechnet den Beregnungsbedarf landwirtschaftlicher
                Flächen nach dem Standard <a href={STANDARD.url} target="_blank" rel="noopener noreferrer">{STANDARD.name}</a>{" "}
                ({STANDARD.publisher}). Berücksichtigt werden Klimadaten, Bodeneigenschaften (nFKWe-Klasse)
                sowie Kultur- bzw. Nutzungsart.
            </p>
        </section>

        <section className="info-page__section">
            <h2>Entwickelt von</h2>
            <p>
                <a href={DEVELOPER.url} target="_blank" rel="noopener noreferrer">{DEVELOPER.name}</a> für{" "}
                <a href={OPERATOR.url} target="_blank" rel="noopener noreferrer">{OPERATOR.name}</a>
            </p>
        </section>

        <section className="info-page__section">
            <h2>Wissenschaftliche Grundlage</h2>
            <p>
                Methodik und Tabellenwerte stammen aus dem Merkblatt <em>{STANDARD.name}</em>.
                Fachliche Begleitung: <a href={OPERATOR.url} target="_blank" rel="noopener noreferrer">{OPERATOR.name}</a>.
            </p>
        </section>

        <section className="info-page__section">
            <h2>Datenquellen</h2>
            <ul>
                <li>
                    Kartenkacheln: <a href={MAP_TILE_SOURCE.url} target="_blank" rel="noopener noreferrer">{MAP_TILE_SOURCE.name}</a>{" "}
                    (© OpenStreetMap-Mitwirkende, <a href={MAP_TILE_SOURCE.copyrightUrl} target="_blank" rel="noopener noreferrer">Lizenz</a>)
                </li>
                <li>Klimaräume und KWBv-Zonen: DWA-M 590, Anhang</li>
                <li>Niederschlag und ET₀: monatliche Rasterdaten (Deutscher Wetterdienst, Referenzperiode)</li>
                <li>nFKWe-Klassen: Bodenübersichtskarte BÜK 200 / 1000</li>
            </ul>
        </section>

        <section className="info-page__section">
            <h2>Lizenzen verwendeter Software</h2>
            <p>
                Diese App verwendet quelloffene Bibliotheken. Eine Auswahl mit den jeweiligen Lizenzen:
            </p>
            <ul>
                <li>
                    <strong>React</strong>, <strong>React Router</strong>, <strong>Zustand</strong>,{" "}
                    <strong>Capacitor</strong>, <strong>Vite</strong>, <strong>@react-pdf/renderer</strong>,{" "}
                    <strong>proj4</strong>, <strong>uuid</strong>, <strong>clsx</strong>, <strong>react-icons</strong> —{" "}
                    <a href="https://opensource.org/license/mit" target="_blank" rel="noopener noreferrer">MIT-Lizenz</a>
                </li>
                <li>
                    <strong>Leaflet</strong> —{" "}
                    <a href="https://github.com/Leaflet/Leaflet/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">BSD-2-Clause</a>
                </li>
                <li>
                    <strong>react-leaflet</strong> —{" "}
                    <a href="https://firstdonoharm.dev/version/2/1/license/" target="_blank" rel="noopener noreferrer">Hippocratic License 2.1</a>
                </li>
                <li>
                    Schriftart <strong>Roboto</strong> (Google Fonts) —{" "}
                    <a href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noopener noreferrer">Apache License 2.0</a>
                </li>
                <li>
                    Kartendaten © <a href={MAP_TILE_SOURCE.copyrightUrl} target="_blank" rel="noopener noreferrer">OpenStreetMap-Mitwirkende</a>{" "}
                    (Daten: ODbL, Kacheln: CC-BY-SA)
                </li>
            </ul>
            <p className="info-page__meta">
                Vollständige Lizenztexte sind im Quellcode-Repository der App hinterlegt.
            </p>
        </section>

        <section className="info-page__section">
            <h2>Kontakt</h2>
            <p>
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
        </section>

        <section className="info-page__section info-page__meta">
            <p>© {COPYRIGHT.years} {COPYRIGHT.holder}. Alle Rechte vorbehalten.</p>
            <p>Version {__APP_VERSION__}</p>
            <p><Link to="/privacy">Datenschutz</Link></p>
        </section>
    </div>
);
