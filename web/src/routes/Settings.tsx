import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Callout } from '@/components/ui/callout';
import { useToast } from '@/components/ui/toast';
import { getToken, setToken, clearToken } from '@/lib/token';
import { invalidateOctokit } from '@/lib/octokit';

export default function Settings() {
  const { toast } = useToast();
  const [pat, setPat] = useState('');
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    const t = getToken();
    if (t) {
      setPat(t);
      setHasSaved(true);
    }
  }, []);

  const handleSave = () => {
    if (!pat.trim()) return;
    setToken(pat);
    invalidateOctokit();
    setHasSaved(true);
    toast({ message: 'PAT saved to localStorage.', tone: 'success' });
  };

  const handleClear = () => {
    clearToken();
    invalidateOctokit();
    setPat('');
    setHasSaved(false);
    toast({ message: 'PAT cleared.', tone: 'info' });
  };

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-xl font-semibold">Settings</h1>

      <Callout tone="warning" title="PoC only">
        Your PAT is stored in <code>localStorage</code>. Do not use in production.
      </Callout>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">GitHub Personal Access Token</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="password"
            placeholder="ghp_…"
            value={pat}
            onChange={(e) => setPat(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
          />
          <p className="text-xs text-muted-foreground">
            Needs <code>repo</code> scope on <code>joebent23/dft-av-contract-management</code>.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={!pat.trim()}>
              Save
            </Button>
            {hasSaved && (
              <Button size="sm" variant="destructive" onClick={handleClear}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
