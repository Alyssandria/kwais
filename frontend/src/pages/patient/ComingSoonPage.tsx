import { Hammer } from 'lucide-react';
import { Card, EmptyState, PageHeader } from '@/components/ui';

/** Placeholder so every route in the shell works before its section is built. */
export function ComingSoonPage({ title, section }: { title: string; section: number }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} />
      <Card>
        <EmptyState
          icon={Hammer}
          title="This page is on its way"
          description={`It is built in Section ${section} of the K-WAIS plan.`}
        />
      </Card>
    </div>
  );
}
