// src/components/DemoHint.tsx
import {useNavigate} from "react-router";
import "./DemoHint.scss";

interface Props {
    /** "farm" = on the farm page, "project" = within the scenario. */
    variant: "farm" | "project";
}

/**
 * Short note that example data is currently loaded, with a link to
 * delete it. The actual guidance is handled by the guided walk-through
 * (components/tour) – which is why this note is deliberately kept brief.
 * Not dismissible, only collapsible (<details>); stays available as long as
 * the example exists.
 */
export const DemoHint = ({variant}: Props) => {
    const navigate = useNavigate();

    // Jump to the "Alle Daten löschen" section on the farm page and scroll
    // there. From the project page, navigate first, then scroll.
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
