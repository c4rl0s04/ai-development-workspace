import { workspace } from '@/server/workspace';
import { readInput, respond } from '@/server/workspace-http';
type Context = { params: Promise<{ projectId: string }> };
export async function GET(request: Request, context: Context) {
  return respond(async () =>
    workspace.getProject(
      (await context.params).projectId,
      new URL(request.url).searchParams.get('page') ?? 1,
    ),
  );
}
export async function POST(request: Request, context: Context) {
  return respond(async () => {
    const project = await workspace.editProject(
      request,
      (await context.params).projectId,
      await readInput(request),
    );
    return { project, location: `/projects/${project.id}` };
  });
}
