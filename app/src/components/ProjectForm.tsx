// src/components/ProjectForm.tsx
import {useState, type SubmitEvent} from "react";
import {SCENARIOS} from "../constants/scenarios";
import type {Project, Scenario} from "../types/project";

interface Props {
    existingProjects: Project[];
    onSave: (name: string, year: number | undefined, scenario: Scenario, copyFromId?: string) => void;
    onCancel: () => void;
}

export const ProjectForm = ({existingProjects, onSave, onCancel}: Props) => {
    const [name, setName] = useState("");
    const [year, setYear] = useState<number | "">(new Date().getFullYear());
    const [scenario, setScenario] = useState<Scenario>("normal");
    const [copyFromId, setCopyFromId] = useState<string>("");

    const handleSubmit = (e: SubmitEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave(
            name.trim(),
            year === "" ? undefined : Number(year),
            scenario,
            copyFromId || undefined
        );
    };

    return (
        <form className="field-form" onSubmit={handleSubmit}>
            <label>
                Projektname
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={`z. B. Bewässerung ${new Date().getFullYear()}`}
                    required
                />
            </label>

            <label>
                Jahr (optional)
                <input
                    type="number"
                    value={year}
                    min={2000}
                    max={2100}
                    onChange={(e) => setYear(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="z. B. 2026"
                />
            </label>

            <fieldset style={{border: "1px solid #ddd", borderRadius: 8, padding: "8px 12px"}}>
                <legend style={{fontWeight: 600, fontSize: 14}}>Szenario</legend>
                {SCENARIOS.map(({type, icon, label, description}) => (
                    <label key={type} style={{display: "flex", alignItems: "center", gap: 8, marginBottom: 4}}>
                        <input
                            type="radio"
                            name="scenario"
                            value={type}
                            checked={scenario === type}
                            onChange={() => setScenario(type)}
                        />
                        {icon} {label} – <small>{description}</small>
                    </label>
                ))}
            </fieldset>

            {existingProjects.length > 0 && (
                <label>
                    Als Vorlage kopieren (optional)
                    <select value={copyFromId} onChange={(e) => setCopyFromId(e.target.value)}>
                        <option value="">— Kein Vorlage —</option>
                        {existingProjects.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}{p.year ? ` (${p.year})` : ""}
                            </option>
                        ))}
                    </select>
                </label>
            )}

            <div style={{display: "flex", gap: 8}}>
                <button type="submit" disabled={!name.trim()}>
                    Projekt erstellen
                </button>
                <button type="button" onClick={onCancel}>
                    Abbrechen
                </button>
            </div>
        </form>
    );
};
