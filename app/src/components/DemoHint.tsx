// src/components/DemoHint.tsx
import {useNavigate} from "react-router";
import "./DemoHint.scss";

interface Props {
    /** "farm" = auf der Betriebsseite, "project" = im Szenario. */
    variant: "farm" | "project";
}

/**
 * Kurzer Hinweis, dass gerade Beispieldaten geladen sind, mit einem Link zum
 * Löschen. Die eigentliche Wegweisung übernimmt der geführte Rundgang
 * (components/tour) – deshalb ist dieser Hinweis bewusst knapp gehalten.
 * Nicht schliessbar, nur einklappbar (<details>); bleibt verfügbar, solange
 * das Beispiel existiert.
 */
export const DemoHint = ({variant}: Props) => {
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
            <summary className="demo-hint__summary">👋 Beispieldaten</summary>
            <div className="demo-hint__content">
                <p className="demo-hint__text">
                    {variant === "farm"
                        ? "Ihr Beispielbetrieb mit zwei Flächen (Kartoffel-Acker + Golfplatz) ist angelegt, der Wasserbedarf steckt im Beispiel-Szenario."
                        : "Dies ist das Beispiel-Szenario mit fertigen Ergebnissen zum Ausprobieren."}
                </p>
                <p className="demo-hint__note">
                    Alles hier sind ganz normale Daten. Wenn Sie mit eigenen Feldern starten
                    möchten, wählen Sie unter Betrieb ➔{" "}
                    <button
                        type="button"
                        className="demo-hint__link"
                        onClick={goToDelete}
                    >
                        „Alle Daten löschen“
                    </button>.
                </p>
            </div>
        </details>
    );
};
