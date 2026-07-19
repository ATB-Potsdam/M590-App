// src/components/DemoHint.tsx
import {useNavigate} from "react-router";
import "./DemoHint.scss";

interface Props {
    /** "farm" = auf der Betriebsseite (weiter zu Szenarien), "project" = im Szenario. */
    variant: "farm" | "project";
    /** Ziel-Szenario für den „Weiter“-Button (nur variant="farm"). */
    demoProjectId?: string;
}

/**
 * Wegweisung nach dem Laden des Beispiel-Szenarios. Zeigt je nach Seite, was als
 * Nächstes zu tun ist. Nicht schliessbar, nur einklappbar (<details>) – der
 * Hinweis bleibt verfügbar, solange das Beispiel existiert.
 */
export const DemoHint = ({variant, demoProjectId}: Props) => {
    const navigate = useNavigate();

    // Zum „Alle Daten löschen“-Bereich auf der Betriebsseite springen und dorthin
    // scrollen. Von der Projektseite aus erst navigieren, dann scrollen.
    const goToDelete = () => {
        navigate("/farm");
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                document.getElementById("farm-reset")?.scrollIntoView({behavior: "smooth", block: "center"});
            });
        });
    };

    return (
        <details className="demo-hint" open>
            <summary className="demo-hint__summary">👋 Beispiel geladen</summary>
            <div className="demo-hint__content">
                {variant === "farm" ? (
                    <>
                        <p className="demo-hint__text">
                            Ihr Beispielbetrieb mit zwei Feldern (Kartoffel-Acker + Golfplatz) ist
                            angelegt. Der berechnete Wasserbedarf steckt im Beispiel-Szenario.
                        </p>
                        <button
                            className="demo-hint__cta"
                            onClick={() =>
                                demoProjectId
                                    ? navigate(`/projects/${demoProjectId}`)
                                    : navigate("/")
                            }
                        >
                            Weiter zum Szenario „Beispiel-Szenario“ ➔
                        </button>
                        <p className="demo-hint__note">
                            Sie erreichen Ihre Szenarien jederzeit über den Tab
                            {" "}<strong>Szenarien</strong> unten.
                        </p>
                    </>
                ) : (
                    <>
                        <p className="demo-hint__text">So geht es weiter:</p>
                        <ol className="demo-hint__steps">
                            <li>
                                Öffnen Sie unten eine <strong>Zuweisung</strong> (Kartoffel-Acker
                                oder Golfplatz), um die Berechnung und die Zuschläge im Detail zu
                                sehen.
                            </li>
                            <li>
                                In der <strong>Zusammenfassung</strong> weiter unten finden Sie den
                                Gesamtbedarf und können das <strong>PDF</strong> erzeugen.
                            </li>
                            <li>
                                Über die Tabs <strong>Szenarien</strong> und <strong>Betrieb</strong>
                                {" "}(unten) wechseln Sie zwischen Projekten und Feldern.
                            </li>
                        </ol>
                    </>
                )}
                <p className="demo-hint__note">
                    Alles hier sind normale Daten.{" "}
                    <button
                        type="button"
                        className="demo-hint__link"
                        onClick={goToDelete}
                    >
                        Beispiel löschen
                    </button>{" "}
                    können Sie jederzeit (Betrieb ➔ „Alle Daten löschen“) und dann mit eigenen
                    Feldern neu starten.
                </p>
            </div>
        </details>
    );
};
