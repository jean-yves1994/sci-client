'use client';

import * as React from 'react';
import { Alert, Button, Card } from '@/components/ui';
import { InspectionDetail, api, readableError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ProfessionalReviewPanel } from './professional-review-panel';

const REVIEWABLE_STATUSES = new Set(['SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW']);

export function ReviewerReviewWorkspace({ inspectionId }: { inspectionId: string }) {
  const { user, can } = useAuth();
  const [inspection, setInspection] = React.useState<InspectionDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [claiming, setClaiming] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setError(null);
      const detail = await api.get<InspectionDetail>(`/inspections/${inspectionId}`);
      setInspection(detail);
    } catch (caught) {
      setError(readableError(caught));
    }
  }, [inspectionId]);

  React.useEffect(() => { void load(); }, [load]);

  const claim = async () => {
    setClaiming(true);
    setError(null);
    try {
      await api.post(`/inspections/${inspectionId}/begin-review`);
      await load();
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setClaiming(false);
    }
  };

  if (error && !inspection) return <Alert title="Could not open review workspace">{error}</Alert>;
  if (!inspection) return <Card><div className="p-5 text-sm text-ink-muted">Loading review workspace…</div></Card>;

  const isInspector = inspection.inspector?.id === user?.id;
  const awaitingReview = REVIEWABLE_STATUSES.has(inspection.status);
  const assignedToMe = inspection.reviewer?.id === user?.id;
  const unassigned = !inspection.reviewer;
  const canReview = can('reviews.decide') && awaitingReview && !isInspector;

  if (unassigned && canReview) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-6">
        {error && <Alert title="Could not claim inspection">{error}</Alert>}
        <Card className="p-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Reviewer workspace</p>
            <h1 className="text-xl font-semibold tracking-tight text-ink">{inspection.inspectionNumber} is ready for review</h1>
            <p className="text-sm leading-6 text-ink-muted">
              Claim this inspection to become its reviewer. Once claimed, you can edit the professional valuation, reviewer comments, risk, conclusion and justified field adjustments before making the decision.
            </p>
            <Button variant="primary" loading={claiming} onClick={() => void claim()}>Claim for review &amp; edit</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!assignedToMe && inspection.reviewer && canReview) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-6">
        {error && <Alert title="Review workspace unavailable">{error}</Alert>}
        <Alert tone="info" title="Inspection is assigned to another reviewer">
          This inspection is currently being reviewed by {inspection.reviewer.firstName} {inspection.reviewer.lastName}. You can view the record, but only the assigned reviewer can edit and decide it.
        </Alert>
      </div>
    );
  }

  return <ProfessionalReviewPanel inspectionId={inspectionId} />;
}
