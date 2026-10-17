import type { Metadata } from 'next';
import { workspace } from '@/server/workspace';
import { pageError } from '@/server/page-error';
import { taskKey } from '@/domain/workspace';
import { PageHeading } from '@/components/page-heading';
import { RecordForm } from '@/components/record-form';
export const metadata: Metadata = { title: 'Edit task' };
export default async function EditTask({
  params,
}: {
  params: Promise<{ projectId: string; taskId: string }>;
}) {
  let result: Awaited<ReturnType<typeof workspace.getTask>>;
  try {
    const p = await params;
    result = await workspace.getTask(p.projectId, p.taskId);
  } catch (error) {
    return pageError(error);
  }
  const { project, task } = result;
  return (
    <>
      <PageHeading
        title={`Edit ${taskKey(project, task)}`}
        description="Update task details without changing its workflow state."
      />
      <RecordForm
        kind="task"
        endpoint={`/api/projects/${project.id}/tasks/${task.id}`}
        cancelHref={`/projects/${project.id}/tasks/${task.id}`}
        initial={task}
      />
    </>
  );
}
