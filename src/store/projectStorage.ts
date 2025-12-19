/**
 * Project Storage Manager
 * Handles saving and loading multiple projects from localStorage
 */

import type { Project } from '../types';

const PROJECTS_LIST_KEY = 'card-sorting-projects-list';
const PROJECT_PREFIX = 'card-sorting-project-';

export interface ProjectMetadata {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  stickyCount: number;
  canvasCount: number;
  ownerId?: string;
  ownerUsername?: string;
}

/**
 * Get list of all saved projects
 */
export const getAllProjects = (): ProjectMetadata[] => {
  try {
    const stored = localStorage.getItem(PROJECTS_LIST_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/**
 * Save a project to localStorage
 */
export const saveProject = (project: Project): void => {
  try {
    // Save the full project data
    const projectKey = `${PROJECT_PREFIX}${project.id}`;
    localStorage.setItem(projectKey, JSON.stringify(project));

    // Update the projects list
    const projects = getAllProjects();
    const existingIndex = projects.findIndex((p) => p.id === project.id);

    const metadata: ProjectMetadata = {
      id: project.id,
      name: project.name,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      stickyCount: project.stickies.length,
      canvasCount: project.canvasInstances.length,
      ownerId: project.ownerId,
      ownerUsername: project.ownerUsername,
    };

    if (existingIndex >= 0) {
      projects[existingIndex] = metadata;
    } else {
      projects.push(metadata);
    }

    localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error('Failed to save project:', error);
    throw new Error('Failed to save project');
  }
};

/**
 * Load a specific project
 */
export const loadProject = (projectId: string): Project | null => {
  try {
    const projectKey = `${PROJECT_PREFIX}${projectId}`;
    const stored = localStorage.getItem(projectKey);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

/**
 * Delete a project
 */
export const deleteProject = (projectId: string): void => {
  try {
    // Remove the project data
    const projectKey = `${PROJECT_PREFIX}${projectId}`;
    localStorage.removeItem(projectKey);

    // Update the projects list
    const projects = getAllProjects();
    const filtered = projects.filter((p) => p.id !== projectId);
    localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete project:', error);
  }
};

/**
 * Rename a project
 */
export const renameProject = (projectId: string, newName: string): void => {
  try {
    const project = loadProject(projectId);
    if (!project) return;

    project.name = newName;
    project.updatedAt = Date.now();
    saveProject(project);
  } catch (error) {
    console.error('Failed to rename project:', error);
  }
};

/**
 * Check if a project is already saved
 */
export const isProjectSaved = (projectId: string): boolean => {
  const projects = getAllProjects();
  return projects.some((p) => p.id === projectId);
};

/**
 * Save project as a new copy with a new ID
 */
export const saveProjectAs = (project: Project, newName: string): Project => {
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

  const newProject: Project = {
    ...project,
    id: generateId(),
    name: newName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  saveProject(newProject);
  return newProject;
};

/**
 * Migrate old single-project storage to new multi-project format
 */
export const migrateOldProjects = (): void => {
  try {
    const OLD_STORAGE_KEY = 'card-sorting-tool-project';

    // Check if there's an old project
    const oldProjectData = localStorage.getItem(OLD_STORAGE_KEY);
    if (!oldProjectData) return;

    const oldProject: Project = JSON.parse(oldProjectData);

    // Check if this project is already migrated
    const existingProjects = getAllProjects();
    const alreadyMigrated = existingProjects.some(p => p.id === oldProject.id);

    if (!alreadyMigrated) {
      // Save to new format
      saveProject(oldProject);
      console.log('Migrated old project:', oldProject.name);
    }
  } catch (error) {
    console.error('Failed to migrate old projects:', error);
  }
};
