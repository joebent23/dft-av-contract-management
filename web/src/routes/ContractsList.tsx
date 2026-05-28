import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { Callout } from '@/components/ui/callout';
import { hasToken } from '@/lib/octokit';
import { listDrafts, fetchApprovedIndexPublic, type ContractListItem } from '@/lib/contracts';

export default function ContractsList() {
  const [drafts, setDrafts] = useState<ContractListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!hasToken()) {
        setError('No PAT configured. Go to Settings to add one.');
        setLoading(false);
        return;
      }
      try {
        const [draftList, index] = await Promise.all([listDrafts(), fetchApprovedIndexPublic()]);
        if (cancelled) return;

        // Merge approved-only contracts that have no draft
        const draftIds = new Set(draftList.map((d) => d.id));
        const approvedOnly: ContractListItem[] = Object.entries(index.contracts)
          .filter(([id]) => !draftIds.has(id))
          .map(([id, entry]) => ({
            id,
            path: '',
            status: 'published',
            latestApproved: entry.latest,
          }));

        setDrafts([...draftList, ...approvedOnly]);
      } catch (err) {
        if (!cancelled) setError(String((err as Error).message));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Loading contracts…</div>;
  }

  if (error) {
    return (
      <Callout tone="destructive" title="Error">
        {error}
      </Callout>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Data Contracts</h1>
        <Link to="/contracts/new">
          <Button size="sm">New draft</Button>
        </Link>
      </div>

      {drafts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No contracts found. Create a new draft to get started.
        </p>
      ) : (
        <div className="grid gap-3">
          {drafts.map((c) => (
            <Link key={c.id} to={`/contracts/${c.id}`} className="block">
              <Card className="hover:border-primary/40 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between py-3">
                  <CardTitle className="text-sm font-mono">{c.id}</CardTitle>
                  <StatusBadge status={c.status} />
                </CardHeader>
                <CardContent className="py-2 text-sm text-muted-foreground flex gap-4">
                  {c.description && <span className="truncate flex-1">{c.description}</span>}
                  {c.agency && <span>Agency: {c.agency}</span>}
                  {c.version && <span>v{c.version}</span>}
                  {c.latestApproved && <span>Approved: v{c.latestApproved}</span>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
