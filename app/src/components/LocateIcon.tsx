// src/components/LocateIcon.tsx
// The crosshair "use current location" glyph. Shared so the map's locate button
// and the guided tour reference the exact same icon.
interface Props {
    className?: string;
}

export const LocateIcon = ({className}: Props) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <circle cx="12" cy="12" r="8" />
        <line x1="12" y1="2" x2="12" y2="8" />
        <line x1="12" y1="16" x2="12" y2="22" />
        <line x1="2" y1="12" x2="8" y2="12" />
        <line x1="16" y1="12" x2="22" y2="12" />
    </svg>
);
