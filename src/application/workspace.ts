import type { Owner } from './auth/owner';
import {
  parse,
  projectInput,
  projectEdit,
  taskInput,
  taskEdit,
  opaqueId,
  pageInput,
  type Project,
  type ProjectInput,
  type ProjectEdit,
  type Task,
  type TaskInput,
  type TaskEdit,
  type Page,
  type ProjectDetails,
} from '../domain/workspace';

// Feature-specific persistence port; every implementation must scope by verified owner.
export interface WorkspaceStore {
  listProjects(owner: string, page: number): Promise<Page<Project>>;
  getProjectSummary(owner: string, id: string): Promise<Project>;
  getProject(owner: string, id: string, page: number): Promise<ProjectDetails>;
  createProject(owner: string, input: ProjectInput): Promise<Project>;
  editProject(owner: string, id: string, input: ProjectEdit): Promise<Project>;
  getTask(
    owner: string,
    projectId: string,
    id: string,
  ): Promise<{ project: Project; task: Task }>;
  createTask(owner: string, projectId: string, input: TaskInput): Promise<Task>;
  editTask(
    owner: string,
    projectId: string,
    id: string,
    input: TaskEdit,
  ): Promise<Task>;
}
export type WorkspaceAuth = {
  requireOwner(): Promise<Owner>;
  requireOwnerMutation(request: Request): Promise<Owner>;
};
export function workspaceService(
  auth: WorkspaceAuth,
  store: () => WorkspaceStore,
) {
  return {
    async listProjects(page: unknown = 1) {
      const owner = await auth.requireOwner();
      return store().listProjects(
        owner.githubProviderId,
        parse(pageInput, page),
      );
    },
    async getProjectSummary(id: unknown) {
      const owner = await auth.requireOwner();
      return store().getProjectSummary(
        owner.githubProviderId,
        parse(opaqueId, id),
      );
    },
    async getProject(id: unknown, page: unknown = 1) {
      const owner = await auth.requireOwner();
      return store().getProject(
        owner.githubProviderId,
        parse(opaqueId, id),
        parse(pageInput, page),
      );
    },
    async createProject(request: Request, input: unknown) {
      const owner = await auth.requireOwnerMutation(request);
      return store().createProject(
        owner.githubProviderId,
        parse(projectInput, input),
      );
    },
    async editProject(request: Request, id: unknown, input: unknown) {
      const owner = await auth.requireOwnerMutation(request);
      return store().editProject(
        owner.githubProviderId,
        parse(opaqueId, id),
        parse(projectEdit, input),
      );
    },
    async getTask(projectId: unknown, id: unknown) {
      const owner = await auth.requireOwner();
      return store().getTask(
        owner.githubProviderId,
        parse(opaqueId, projectId),
        parse(opaqueId, id),
      );
    },
    async createTask(request: Request, projectId: unknown, input: unknown) {
      const owner = await auth.requireOwnerMutation(request);
      return store().createTask(
        owner.githubProviderId,
        parse(opaqueId, projectId),
        parse(taskInput, input),
      );
    },
    async editTask(
      request: Request,
      projectId: unknown,
      id: unknown,
      input: unknown,
    ) {
      const owner = await auth.requireOwnerMutation(request);
      return store().editTask(
        owner.githubProviderId,
        parse(opaqueId, projectId),
        parse(opaqueId, id),
        parse(taskEdit, input),
      );
    },
  };
}
