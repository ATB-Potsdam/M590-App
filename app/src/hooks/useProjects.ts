// src/hooks/useProjects.ts
import {v4 as uuidv4} from "uuid";
import {useLocalStore} from "../stores/useLocalStore";
import type {FieldAssignment, Project} from "../types/project";

export const useProjects = () => {
    const [projects, setProjects] = useLocalStore((state) => state.dwa_projects);

    const addProject = (name: string, year?: number) => {
        const project: Project = {
            id: uuidv4(),
            name,
            year,
            fieldAssignments: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        setProjects((prev: Project[]) => [...prev, project]);
        return project.id;
    };

    const copyProject = (sourceId: string, name: string, year?: number) => {
        const source = projects.find((p) => p.id === sourceId);
        if (!source) return null;
        const project: Project = {
            ...source,
            id: uuidv4(),
            name,
            year,
            // Feldzuweisungen übernehmen, neue IDs vergeben
            fieldAssignments: source.fieldAssignments.map((fa) => ({
                ...fa,
                id: uuidv4(),
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        setProjects((prev: Project[]) => [...prev, project]);
        return project.id;
    };

    const removeProject = (id: string) => {
        setProjects((prev: Project[]) => prev.filter((p) => p.id !== id));
    };

    const updateProject = (id: string, data: Partial<Omit<Project, "id" | "createdAt">>) => {
        setProjects((prev: Project[]) =>
            prev.map((p) =>
                p.id === id ? {...p, ...data, updatedAt: new Date().toISOString()} : p
            )
        );
    };

    const addFieldAssignment = (projectId: string, fieldId: string) => {
        const project = projects.find((p) => p.id === projectId);
        if (!project) return;
        if (project.fieldAssignments.some((fa) => fa.fieldId === fieldId)) return;

        const newAssignment: FieldAssignment = {
            id: uuidv4(),
            fieldId,
            surchargeIntermediate: false,
            surchargeEmergence: 0,
            surchargeHeavySoil: 0,
        };

        setProjects((prev: Project[]) =>
            prev.map((p) =>
                p.id === projectId
                    ? {
                        ...p,
                        fieldAssignments: [...p.fieldAssignments, newAssignment],
                        updatedAt: new Date().toISOString(),
                    }
                    : p
            )
        );
    };
    const removeFieldAssignment = (projectId: string, assignmentId: string) => {
        setProjects((prev: Project[]) =>
            prev.map((p) =>
                p.id === projectId
                    ? {...p, fieldAssignments: p.fieldAssignments.filter((fa) => fa.id !== assignmentId), updatedAt: new Date().toISOString()}
                    : p
            )
        );
    };

    const updateFieldAssignment = (
        projectId: string,
        assignmentId: string,
        data: Partial<Omit<FieldAssignment, "id" | "fieldId">>
    ) => {
        setProjects((prev: Project[]) =>
            prev.map((p) =>
                p.id === projectId
                    ? {
                        ...p,
                        fieldAssignments: p.fieldAssignments.map((fa) =>
                            fa.id === assignmentId ? {...fa, ...data} : fa
                        ),
                        updatedAt: new Date().toISOString(),
                    }
                    : p
            )
        );
    };

    const removeFieldFromAllProjects = (fieldId: string) => {
        setProjects((prev: Project[]) =>
            prev.map((p) => {
                const filtered = p.fieldAssignments.filter((fa) => fa.fieldId !== fieldId);
                return filtered.length === p.fieldAssignments.length
                    ? p
                    : {...p, fieldAssignments: filtered, updatedAt: new Date().toISOString()};
            })
        );
    };

    return {projects, addProject, copyProject, removeProject, updateProject, addFieldAssignment, removeFieldAssignment, removeFieldFromAllProjects, updateFieldAssignment};
};
