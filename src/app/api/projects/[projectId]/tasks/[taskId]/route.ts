import { workspace } from '@/server/workspace';
import { readInput, respond } from '@/server/workspace-http';
type Context = { params: Promise<{ projectId: string; taskId: string }> };
export async function GET(_request: Request, context: Context) {
  return respond('tasks.get', async () => {
    const p = await context.params;
    return workspace.getTask(p.projectId, p.taskId);
  });
}
export async function POST(request: Request, context: Context) {
  return respond('tasks.edit', async () => {
    const p = await context.params;
    const task = await workspace.editTask(
      request,
      p.projectId,
      p.taskId,
      await readInput(request),
    );
    return { task, location: `/projects/${p.projectId}/tasks/${task.id}` };
  });
}
