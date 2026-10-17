import type { Metadata } from 'next';
import { PageHeading } from '@/components/page-heading';
import { Placeholder } from '@/components/placeholder';

export const metadata: Metadata = { title: 'Projects' };

export default function Projects() {
  return (
    <>
      <PageHeading
        title="Projects"
        description="A focused home for each software project, its specifications and its progress."
      />
      <Placeholder
        title="Project management is not implemented yet"
        description="This placeholder marks the future project area. There is no project database connected, and no projects can be created here."
        next="Persistent projects and task workflows will arrive with owner-only access."
      />
    </>
  );
}
