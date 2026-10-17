import { workspace } from '@/server/workspace';
import { readInput, respond } from '@/server/workspace-http';
export async function GET(request: Request) {
  return respond(() =>
    workspace.listProjects(new URL(request.url).searchParams.get('page') ?? 1),
  );
}
export async function POST(request: Request) {
  return respond(async () => {
    const project = await workspace.createProject(
      request,
      await readInput(request),
    );
    return { project, location: `/projects/${project.id}` };
  }, 201);
}
