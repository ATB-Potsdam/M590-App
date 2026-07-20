import {Link} from "react-router";
import {DEVELOPER, IMPRINT, MAP_TILE_SOURCE, OPERATOR} from "../constants/contact";
import {BackButton} from "../components/BackButton";
import "./AboutPage.scss";

export const PrivacyPage = () => (
    <div className="info-page">
        <BackButton to="/">Zurück</BackButton>
        <h1 className="info-page__title">Datenschutz</h1>

        <section className="info-page__section">
            <p>
                Diese App speichert Eingaben ausschließlich lokal auf Ihrem Gerät. Es findet keine
                Übertragung personenbezogener Daten an einen Server der Betreiber statt.
            </p>
        </section>

        <section className="info-page__section">
            <h2>Verantwortlicher</h2>
            <p>
                {OPERATOR.name}<br />
                {OPERATOR.address}<br />
                E-Mail: <a href={`mailto:${IMPRINT.contactEmail}`}>{IMPRINT.contactEmail}</a>
            </p>
            <p>
                Technische Umsetzung: <a href={DEVELOPER.url} target="_blank" rel="noopener noreferrer">{DEVELOPER.name}</a>
            </p>
        </section>

        <section className="info-page__section">
            <h2>Lokale Datenspeicherung</h2>
            <p>
                Betriebsname, Schlagdaten (Geokoordinaten, Bodenklasse, Klimadaten) sowie angelegte
                Szenarien werden ausschließlich im <em>localStorage</em> Ihres Browsers bzw. Ihrer
                App-Installation gespeichert. Diese Daten verlassen Ihr Gerät nicht.
            </p>
            <p>
                Beim Deinstallieren der App oder Löschen der Browserdaten gehen diese Informationen
                verloren. Eine Export- und Importfunktion zur lokalen Sicherung steht im Bereich
                „Betrieb“ zur Verfügung.
            </p>
        </section>

        <section className="info-page__section">
            <h2>Standortdaten</h2>
            <p>
                Bei Nutzung der Funktion „Aktuelle Position übernehmen“ wird die Geolokalisierungs-API
                Ihres Geräts angefragt. Die ermittelten Koordinaten werden ausschließlich lokal
                verarbeitet und nicht an Dritte übermittelt. Die Freigabe erfordert Ihre
                ausdrückliche Zustimmung im Browser bzw. Betriebssystem.
            </p>
        </section>

        <section className="info-page__section">
            <h2>Kartendienst (OpenStreetMap)</h2>
            <p>
                Zur Anzeige der Karte werden Kartenkacheln vom Server{" "}
                <a href={MAP_TILE_SOURCE.url} target="_blank" rel="noopener noreferrer">{MAP_TILE_SOURCE.name}</a>{" "}
                (tile.openstreetmap.org) geladen. Dabei wird Ihre IP-Adresse sowie der ausgewählte
                Kartenausschnitt an die OpenStreetMap Foundation (OSMF) übertragen. Rechtsgrundlage
                ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Bereitstellung der
                Kartenfunktion). Datenschutzerklärung der OSMF:{" "}
                <a href="https://wiki.osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener noreferrer">
                    wiki.osmfoundation.org/wiki/Privacy_Policy
                </a>.
            </p>
        </section>

        <section className="info-page__section">
            <h2>Klima- und Bodendaten</h2>
            <p>
                Klimaraum-Polygone, Niederschlags- und ET₀-Rasterdaten sowie nFKWe-Klassifizierung
                werden mit der App ausgeliefert und lokal verarbeitet. Es erfolgt kein Abruf
                personenbezogener Daten von externen Diensten.
            </p>
        </section>

        <section className="info-page__section">
            <h2>Kein Tracking</h2>
            <p>
                Diese App nutzt weder Analyse-Werkzeuge (z. B. Google Analytics) noch Cookies zu
                Tracking-Zwecken. Es werden keine Werbe- oder Drittanbieter-Skripte eingebunden.
            </p>
        </section>

        <section className="info-page__section">
            <h2>Ihre Rechte</h2>
            <p>
                Da keine personenbezogenen Daten an die Betreiber übermittelt werden, entstehen
                hieraus keine Auskunfts- oder Löschpflichten unsererseits. Lokal gespeicherte Daten
                können Sie jederzeit selbst über die Einstellungen Ihres Geräts oder Browsers
                löschen.
            </p>
        </section>

        <section className="info-page__section info-page__meta">
            <p><Link to="/about">Über die App</Link></p>
        </section>
    </div>
);
