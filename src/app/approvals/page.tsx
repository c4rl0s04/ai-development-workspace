import type { Metadata } from 'next';
import { PageHeading } from '@/components/page-heading';
import { Placeholder } from '@/components/placeholder';

export const metadata: Metadata = { title: 'Approvals' };

export default function Approvals() {
  return (
    <>
      <PageHeading
        title="Approvals"
        description="A clear place to review specifications and make explicit human decisions."
      />
      <Placeholder
        title="The approval inbox is not implemented yet"
        description="This placeholder is not a live inbox. Specifications, revision-bound decisions and approval actions are not connected."
        next="Human approvals will bind to an exact specification version. Approval alone will not authorize implementation."
      />
    </>
  );
}
