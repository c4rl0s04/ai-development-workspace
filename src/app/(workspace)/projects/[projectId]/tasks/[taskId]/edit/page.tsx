import { Breadcrumbs } from '@/components/workspace-records';
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
    return pageError(error, 'tasks.get');
  }
  const { project, task } = result;
  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: project.key, href: `/projects/${project.id}` },
          {
            label: taskKey(project, task),
            href: `/projects/${project.id}/tasks/${task.id}`,
          },
          { label: 'Edit' },
        ]}
      />
      <PageHeading
        title={`Edit ${taskKey(project, task)}`}
        description="Update task details without changing its workflow state."
      />
      <RecordForm
        kind="task"
        endpoint={`/api/projects/${project.id}/tasks/${task.id}`}
        cancelHref={`/projects/${project.id}/tasks/${task.id}`}
        initial={{
          title: task.title,
          description: task.description,
          revision: task.revision,
        }}
      />
    </>
  );
}
