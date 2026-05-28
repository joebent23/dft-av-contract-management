import { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { BumpResult } from '@/lib/semverBump';

interface ApproveDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (rationale: string) => void;
  contractId: string;
  bump: BumpResult;
  busy: boolean;
}

export function ApproveDialog({ open, onClose, onConfirm, contractId, bump, busy }: ApproveDialogProps) {
  const [rationale, setRationale] = useState('');

  const handleConfirm = () => {
    if (!rationale.trim()) return;
    onConfirm(rationale.trim());
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Approve contract</DialogTitle>
        <DialogDescription>
          Approve <strong>{contractId}</strong> as version{' '}
          <code className="bg-muted px-1 rounded">{bump.suggestedVersion}</code> ({bump.bump} bump).
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">{bump.reason}</p>
        <label className="block space-y-1">
          <span className="font-medium">Rationale</span>
          <Input
            placeholder="Reason for approval..."
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirm();
            }}
          />
        </label>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={busy || !rationale.trim()}>
          {busy ? 'Approving…' : 'Approve & publish'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
