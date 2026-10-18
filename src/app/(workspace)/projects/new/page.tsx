import type { Metadata } from 'next';
import { requireOwner } from '@/server/auth';
import { PageHeading } from '@/components/page-heading';
import { RecordForm } from '@/components/record-form';
export const metadata: Metadata = { title: 'New project' };
export default async function NewProject() {
  await requireOwner();
  return (
    <>
      <PageHeading
        title="New project"
        description="Give the project a permanent short key and a clear name."
      />
      <RecordForm
        kind="project"
        endpoint="/api/projects"
        cancelHref="/projects"
      />
    </>
  );
}
