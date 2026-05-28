import { Badge, type BadgeProps } from '@/components/ui/badge';

const statusTone: Record<string, BadgeProps['tone']> = {
  draft: 'default',
  pending_approval: 'warning',
  published: 'success',
};

export function StatusBadge({ status }: { status: string }) {
  const tone = statusTone[status] ?? 'default';
  const label = status.replace(/_/g, ' ');
  return <Badge tone={tone}>{label}</Badge>;
}
