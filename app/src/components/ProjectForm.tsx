// src/components/ProjectForm.tsx
import {useState, useCallback, type SubmitEvent} from "react";
import type {Project} from "../types/project";
import "./ProjectForm.scss";

interface Props {
    existingProjects?: Project[];
    initialName?: string;
    initialDescription?: string;
    submitLabel?: string;
    onSave: (name: string, description: string | undefined, copyFromId?: string) => void;
    onCancel: () => void;
}

export const ProjectForm = ({
    existingProjects = [],
    initialName = "",
    initialDescription = "",
    submitLabel = "Szenario erstellen",
    onSave,
    onCancel,
}: Props) => {
    const [name, setName] = useState(initialName);
    const [description, setDescription] = useState(initialDescription);
    const [copyFromId, setCopyFromId] = useState<string>("");

    const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
    }, []);

    const handleSubmit = (e: SubmitEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave(
            name.trim(),
            description.trim() || undefined,
            copyFromId || undefined
        );
    };

    return (
        <form className="field-form" onSubmit={handleSubmit}>
            <table className="project-form__table">
                <tbody>
                    <tr>
                        <th>Szenarioname</th>
                        <td>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={`z. B. Bewässerung ${new Date().getFullYear()}`}
                                required
                            />
                        </td>
                    </tr>
                    <tr>
                        <th>Beschreibung (optional)</th>
                        <td>
                            <textarea
                                value={description}
                                ref={autoResize}
                                onChange={(e) => { setDescription(e.target.value); autoResize(e.target); }}
                                placeholder="z. B. Trockenjahr-Szenario"
                                rows={1}
                            />
                        </td>
                    </tr>
                    {existingProjects.length > 0 && (
                        <tr>
                            <th>Als Vorlage kopieren (optional)</th>
                            <td>
                                <select value={copyFromId} onChange={(e) => setCopyFromId(e.target.value)}>
                                    <option value="">— Keine Vorlage —</option>
                                    {existingProjects.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}{p.description ? ` (${p.description})` : ""}
                                        </option>
                                    ))}
                                </select>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <div className="field-form__actions">
                <button type="submit" disabled={!name.trim()}>
                    {submitLabel}
                </button>
                <button type="button" onClick={onCancel}>
                    Abbrechen
                </button>
            </div>
        </form>
    );
};
