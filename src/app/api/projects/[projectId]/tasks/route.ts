import { workspace } from '@/server/workspace';
import { readInput, respond } from '@/server/workspace-http';
type Context = { params: Promise<{ projectId: string }> };
export async function POST(request: Request, context: Context) {
  return respond(
    'tasks.create',
    async () => {
      const { projectId } = await context.params;
      const task = await workspace.createTask(
        request,
        projectId,
        await readInput(request),
      );
      return { task, location: `/projects/${projectId}/tasks/${task.id}` };
    },
    201,
  );
}
