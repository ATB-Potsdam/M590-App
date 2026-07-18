// src/components/InfoHint.tsx
import type {ReactNode} from "react";
import "./InfoHint.scss";

interface Props {
    /** Kurze Frage/Beschriftung im Summary, z.B. "Warum fragen wir das?" */
    summary?: string;
    /** Erklärungstext */
    children: ReactNode;
}

/**
 * Aufklappbare Kontext-Erklärung ("Warum fragen wir das?").
 * Nutzt das native <details>-Element — kein zusätzliches Tooltip-Framework.
 */
export const InfoHint = ({summary = "Warum fragen wir das?", children}: Props) => (
    <details className="info-hint">
        <summary className="info-hint__summary">
            <span className="info-hint__icon" aria-hidden>ℹ️</span>
            {summary}
        </summary>
        <div className="info-hint__body">{children}</div>
    </details>
);
