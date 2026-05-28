import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Callout } from '@/components/ui/callout';
import { fetchAuditPublic, type AuditEntry } from '@/lib/contracts';

const eventTone: Record<string, 'info' | 'success' | 'warning' | 'destructive'> = {
  submit: 'warning',
  approve: 'success',
};

export default function Audit() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAuditPublic();
        if (!cancelled) setEntries(data);
      } catch (err) {
        if (!cancelled) setError(String((err as Error).message));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Loading audit log…</div>;
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
      <h1 className="text-xl font-semibold">Audit log</h1>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No audit entries yet.</p>
      ) : (
        <div className="grid gap-2">
          {entries.map((e, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between py-2">
                <CardTitle className="text-sm font-mono">{e.contractId}</CardTitle>
                <Badge tone={eventTone[e.event] ?? 'default'}>{e.event}</Badge>
              </CardHeader>
              <CardContent className="py-2 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                <span>{new Date(e.ts).toLocaleString()}</span>
                {e.version && <span>v{e.version}</span>}
                {e.bump && <span>bump: {e.bump}</span>}
                {e.actor && <span>actor: {e.actor}</span>}
                {e.rationale && <span className="italic">"{e.rationale}"</span>}
                {e.commit && (
                  <a
                    href={`https://github.com/joebent23/dft-av-contract-management/commit/${e.commit}`}
                    className="underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {e.commit.slice(0, 7)}
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
