import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { StatusBadge } from '@/components/StatusBadge';
import { YamlEditor } from '@/components/YamlEditor';
import { ApproveDialog } from '@/components/ApproveDialog';
import { useToast } from '@/components/ui/toast';
import { hasToken } from '@/lib/octokit';
import { getDraft, getApprovedYaml, fetchApprovedIndexPublic } from '@/lib/contracts';
import { saveDraft, submitContract, approveContract } from '@/lib/treeCommit';
import { computeBump, type BumpResult } from '@/lib/semverBump';

const BLANK_DRAFT = `kind: DataContract
apiVersion: v3.0.2
uuid: ""
version: "0.1.0"
status: draft
description: ""
type: ""

pocMeta:
  submittingAgency: ""
  submissionType: ""
  status: draft

schema:
  - name: dataset
    properties:
      - name: record
        fields:
          - name: id
            type: string
            required: true
            description: ""
`;

export default function ContractEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isNew = id === 'new';
  const contractId = isNew ? '' : id ?? '';

  const [yaml, setYaml] = useState('');
  const [originalYaml, setOriginalYaml] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('draft');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [bump, setBump] = useState<BumpResult | null>(null);

  useEffect(() => {
    if (isNew) {
      setYaml(BLANK_DRAFT);
      return;
    }
    if (!hasToken()) {
      setError('No PAT configured. Go to Settings.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const draft = await getDraft(contractId);
        if (cancelled) return;
        if (!draft) {
          setError(`Draft not found: ${contractId}`);
          setLoading(false);
          return;
        }
        setYaml(draft.yaml);
        // Extract status from pocMeta
        const match = draft.yaml.match(/^\s*status:\s*(\S+)/m);
        if (match) setStatus(match[1]);
        // Load last approved version for diff
        const index = await fetchApprovedIndexPublic();
        const latestVersion = index.contracts[contractId]?.latest;
        if (latestVersion) {
          const approvedYaml = await getApprovedYaml(contractId, latestVersion);
          if (!cancelled) setOriginalYaml(approvedYaml);
        }
      } catch (err) {
        if (!cancelled) setError(String((err as Error).message));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contractId, isNew]);

  const handleSave = useCallback(async () => {
    if (!contractId && !isNew) return;
    setSaving(true);
    try {
      let saveId = contractId;
      if (isNew) {
        // Derive id from the YAML uuid or prompt
        const uuidMatch = yaml.match(/^\s*uuid:\s*["']?(\S+?)["']?\s*$/m);
        saveId = uuidMatch?.[1] || `draft-${Date.now()}`;
      }
      await saveDraft(saveId, yaml);
      toast({ message: `Draft "${saveId}" saved.`, tone: 'success' });
      if (isNew) navigate(`/contracts/${saveId}`, { replace: true });
    } catch (err) {
      toast({ message: String((err as Error).message), tone: 'destructive', title: 'Save failed' });
    } finally {
      setSaving(false);
    }
  }, [contractId, isNew, yaml, toast, navigate]);

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    try {
      const versionMatch = yaml.match(/^\s*version:\s*["']?(\S+?)["']?\s*$/m);
      const version = versionMatch?.[1] ?? '0.1.0';
      await submitContract({ contractId, version, actor: 'joebent23', draftYaml: yaml });
      setStatus('pending_approval');
      toast({ message: `Submitted for approval.`, tone: 'success' });
    } catch (err) {
      toast({ message: String((err as Error).message), tone: 'destructive', title: 'Submit failed' });
    } finally {
      setSaving(false);
    }
  }, [contractId, yaml, toast]);

  const handleApproveClick = useCallback(() => {
    const result = computeBump(originalYaml, yaml);
    setBump(result);
    setApproveOpen(true);
  }, [originalYaml, yaml]);

  const handleApproveConfirm = useCallback(
    async (rationale: string) => {
      if (!bump) return;
      setSaving(true);
      try {
        const result = await approveContract({
          contractId,
          version: bump.suggestedVersion,
          bump: bump.bump,
          rationale,
          actor: 'joebent23',
          draftYaml: yaml,
        });
        setStatus('published');
        setApproveOpen(false);
        toast({
          message: `Approved v${bump.suggestedVersion}. Tag: ${result.tagName}`,
          tone: 'success',
          title: 'Published',
        });
      } catch (err) {
        toast({ message: String((err as Error).message), tone: 'destructive', title: 'Approve failed' });
      } finally {
        setSaving(false);
      }
    },
    [contractId, bump, yaml, toast],
  );

  if (loading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>;
  }
  if (error) {
    return (
      <Callout tone="destructive" title="Error">
        {error}
      </Callout>
    );
  }

  const canEdit = status === 'draft' || isNew;
  const canSubmit = status === 'draft' && !isNew;
  const canApprove = status === 'pending_approval';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          ← Back
        </Button>
        <h1 className="text-lg font-semibold font-mono flex-1">{isNew ? 'New draft' : contractId}</h1>
        {!isNew && <StatusBadge status={status} />}
      </div>

      <YamlEditor value={yaml} onChange={setYaml} readOnly={!canEdit} />

      <div className="flex gap-2 justify-end">
        {canEdit && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save draft'}
          </Button>
        )}
        {canSubmit && (
          <Button variant="secondary" onClick={handleSubmit} disabled={saving}>
            Submit for approval
          </Button>
        )}
        {canApprove && (
          <Button onClick={handleApproveClick} disabled={saving}>
            Approve & publish
          </Button>
        )}
      </div>

      {bump && (
        <ApproveDialog
          open={approveOpen}
          onClose={() => setApproveOpen(false)}
          onConfirm={handleApproveConfirm}
          contractId={contractId}
          bump={bump}
          busy={saving}
        />
      )}
    </div>
  );
}
