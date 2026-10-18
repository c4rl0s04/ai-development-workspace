import type { Metadata } from 'next';
import { workspace } from '@/server/workspace';
import { pageError } from '@/server/page-error';
import { PageHeading } from '@/components/page-heading';
import { RecordForm } from '@/components/record-form';
export const metadata: Metadata = { title: 'New task' };
export default async function NewTask({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  let project: Awaited<ReturnType<typeof workspace.getProject>>['project'];
  try {
    project = (await workspace.getProject((await params).projectId)).project;
  } catch (error) {
    return pageError(error);
  }
  return (
    <>
      <PageHeading
        title={`New task in ${project.key}`}
        description="Capture the work. A project-local task number will be allocated when it is saved."
      />
      <RecordForm
        kind="task"
        endpoint={`/api/projects/${project.id}/tasks`}
        cancelHref={`/projects/${project.id}`}
      />
    </>
  );
}
