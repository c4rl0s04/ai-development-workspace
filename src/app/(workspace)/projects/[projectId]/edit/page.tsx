import { Breadcrumbs } from '@/components/workspace-records';
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
  let project: Awaited<ReturnType<typeof workspace.getProjectSummary>>;
  try {
    project = await workspace.getProjectSummary((await params).projectId);
  } catch (error) {
    return pageError(error, 'projects.summary');
  }
  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: project.key, href: `/projects/${project.id}` },
          { label: 'Edit' },
        ]}
      />
      <PageHeading
        title={`Edit ${project.key}`}
        description="The project key stays fixed so task identifiers remain stable."
      />
      <RecordForm
        kind="project"
        endpoint={`/api/projects/${project.id}`}
        cancelHref={`/projects/${project.id}`}
        initial={{
          name: project.name,
          description: project.description,
          repositoryUrl: project.repositoryUrl,
          revision: project.revision,
        }}
      />
    </>
  );
}
