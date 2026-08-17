// src/components/InfoHint.tsx
import type {ReactNode} from "react";
import "./InfoHint.scss";

interface Props {
    /** Short question/label in the summary, e.g. "Warum fragen wir das?" */
    summary?: string;
    /** Explanatory text */
    children: ReactNode;
}

/**
 * Collapsible contextual explanation ("Warum fragen wir das?").
 * Uses the native <details> element — no additional tooltip framework.
 */
export const InfoHint = ({summary = "Warum fragen wir das?", children}: Props) => (
    <details className="info-hint">
        <summary className="info-hint__summary">
            <span className="info-hint__icon" aria-hidden>ℹ️</span>
            {/* The label needs its own element: as a bare text node it cannot be a
                flex column, and a wrapped line would run back under the icon. */}
            <span className="info-hint__label">{summary}</span>
        </summary>
        <div className="info-hint__body">{children}</div>
    </details>
);
