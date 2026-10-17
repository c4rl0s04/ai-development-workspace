import type { Metadata } from 'next';
import { workspace } from '@/server/workspace';
import { pageError } from '@/server/page-error';
import { PageHeading } from '@/components/page-heading';
import { RecordForm } from '@/components/record-form';
export const metadata: Metadata = { title: 'Edit project' };
export default async function EditProject({
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
        title={`Edit ${project.key}`}
        description="The project key stays fixed so task identifiers remain stable."
      />
      <RecordForm
        kind="project"
        endpoint={`/api/projects/${project.id}`}
        cancelHref={`/projects/${project.id}`}
        initial={project}
      />
    </>
  );
}
