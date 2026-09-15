'use client';

import * as React from 'react';
import { Alert, Badge, Button, Card, CardHeader, Field } from '@/components/ui';
import { ApiError, InspectionDetail, api, readableError } from '@/lib/api';
import { formatDateTime, formatMoney, fullName, humanise } from '@/lib/format';

interface Adjustment { id: string; fieldCode: string; originalValue: unknown; adjustedValue: Record<string, unknown>; reason: string; createdAt: string; reviewerFirstName?: string; reviewerLastName?: string; }
interface ReviewerValuation { id: string; inspectionId: string; reviewerId: string; currency: string; marketValue: string | number | null; forcedSaleValue: string | number | null; replacementCost: string | number | null; rentalEstimate: string | number | null; comments: string | null; createdAt: string; updatedAt: string; }
interface ReviewWorkspace { inspection: InspectionDetail & { reviewerRisk?: { level: string; comments?: string | null } | null; reviewerConclusion?: string | null; reviewerAdjustedAt?: string | null }; reviewerValuation: ReviewerValuation | null; adjustments: Adjustment[]; }

export function ProfessionalReviewPanel({ inspectionId }: { inspectionId: string }) {
  const [data, setData] = React.useState<ReviewWorkspace | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [fieldCode, setFieldCode] = React.useState('');
  const [adjustedValue, setAdjustedValue] = React.useState('');
  const [adjustmentReason, setAdjustmentReason] = React.useState('');
  const [risk, setRisk] = React.useState('LOW');
  const [riskComments, setRiskComments] = React.useState('');
  const [conclusion, setConclusion] = React.useState('');
  const [valuation, setValuation] = React.useState({ currency: 'RWF', marketValue: '', forcedSaleValue: '', replacementCost: '', rentalEstimate: '', comments: '' });

  const load = React.useCallback(async () => {
    try {
      const result = await api.get<ReviewWorkspace>(`/inspections/${inspectionId}/review`);
      setData(result);
      const currentRisk = result.inspection.reviewerRisk;
      if (currentRisk) { setRisk(currentRisk.level); setRiskComments(currentRisk.comments ?? ''); }
      setConclusion(result.inspection.reviewerConclusion ?? '');
      const v = result.reviewerValuation;
      if (v) {
        setValuation({
          currency: v.currency ?? 'RWF',
          marketValue: v.marketValue != null ? String(v.marketValue) : '',
          forcedSaleValue: v.forcedSaleValue != null ? String(v.forcedSaleValue) : '',
          replacementCost: v.replacementCost != null ? String(v.replacementCost) : '',
          rentalEstimate: v.rentalEstimate != null ? String(v.rentalEstimate) : '',
          comments: v.comments ?? '',
        });
      } else {
        setValuation({ currency: 'RWF', marketValue: '', forcedSaleValue: '', replacementCost: '', rentalEstimate: '', comments: '' });
      }
    } catch (e) { setError(readableError(e)); }
  }, [inspectionId]);
  React.useEffect(() => { void load(); }, [load]);

  const run = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true); setError(null); setNotice(null);
    try { await fn(); await load(); setNotice(message); }
    catch (e) {
      if (e instanceof ApiError && e.code === 'INSPECTION_STALE_VERSION') { setError(`${e.message} Reloaded the latest review data.`); await load(); }
      else setError(readableError(e));
    } finally { setBusy(false); }
  };

  if (!data) return error ? <Alert title="Professional review unavailable">{error}</Alert> : <Card><div className="p-5 text-sm text-ink-muted">Loading professional review…</div></Card>;
  const inspection = data.inspection;
  const version = inspection.version;
  const editable = ['SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW'].includes(inspection.status) && Boolean(inspection.reviewer);
  const inspectorValuation = inspection.valuation;

  return <div className="space-y-4">
    {error && <Alert title="Review action failed" onDismiss={() => setError(null)}>{error}</Alert>}
    {notice && <Alert tone="success" title={notice} onDismiss={() => setNotice(null)} />}

    <Card>
      <CardHeader title="Professional Review & Quality Assurance" description="Inspector-submitted information is preserved. Professional review values, adjustments, risk and conclusions are stored separately with an audit trail." />
      <div className="grid gap-3 px-5 pb-5 sm:grid-cols-3">
        <ReviewFact label="Inspector" value={fullName(inspection.inspector)} />
        <ReviewFact label="Submitted" value={formatDateTime(inspection.submittedAt)} />
        <ReviewFact label="Version reviewed" value={String(version)} />
      </div>
    </Card>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Validation checklist" description="Review the evidence and field data before signing off." />
        <div className="space-y-2 px-5 pb-5">
          <Check label="Completeness" ok={inspection.completeness.blockingIssues.length === 0} detail={`${inspection.completeness.percentage}% complete`} />
          <Check label="GPS / location" ok={inspection.locations.length > 0} detail={inspection.locations.length ? `${inspection.locations[0].accuracyM ?? '—'} m accuracy` : 'No capture'} />
          <Check label="Evidence" ok={inspection.photos.length > 0} detail={`${inspection.photos.length} photo(s)`} />
          <Check label="Owner / client" ok={Boolean(inspection.owner)} detail={inspection.owner?.fullName ?? 'Not recorded'} />
          <Check label="Inspector valuation" ok={Boolean(inspectorValuation)} detail={inspectorValuation ? formatMoney(inspectorValuation.marketValue) : 'Not recorded'} />
          <Check label="Professional valuation" ok={Boolean(data.reviewerValuation)} detail={data.reviewerValuation ? formatMoney(data.reviewerValuation.marketValue) : 'Not yet entered'} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Reviewer risk" description="Professional risk classification with reviewer comments." />
        <div className="space-y-3 px-5 pb-5">
          <Field label="Risk level"><select value={risk} disabled={!editable || busy} onChange={e => setRisk(e.target.value)} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink"><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select></Field>
          <Field label="Risk comments"><textarea value={riskComments} disabled={!editable || busy} onChange={e => setRiskComments(e.target.value)} placeholder="Explain material risks, inconsistencies or concerns…" className="min-h-28 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-primary focus:ring-2 focus:ring-primary/10" /></Field>
          <Button loading={busy} disabled={!editable} onClick={() => void run(() => api.patch(`/inspections/${inspectionId}/review/risk`, { level: risk, comments: riskComments, baseVersion: version }), 'Risk assessment saved.')}>Save risk</Button>
        </div>
      </Card>
    </div>

    <Card>
      <CardHeader title="Valuation review" description="The inspector's submitted valuation is read-only. The professional reviewer enters a separate valuation that is used for the report after review." />
      <div className="grid gap-4 lg:grid-cols-2 px-5 pb-5">
        <div className="rounded-2xl border border-line bg-surface-2 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div><h3 className="text-sm font-semibold text-ink">Inspector valuation</h3><p className="text-2xs text-ink-faint">Submitted inspection data · read-only</p></div>
            <Badge tone="neutral">Original</Badge>
          </div>
          {inspectorValuation ? <div className="grid grid-cols-2 gap-3 text-sm">
            <ReviewFact label="Currency" value={inspectorValuation.currency || 'RWF'} />
            <ReviewFact label="Market value" value={formatMoney(inspectorValuation.marketValue)} />
            <ReviewFact label="Forced sale" value={formatMoney(inspectorValuation.forcedSaleValue)} />
            <ReviewFact label="Replacement cost" value={formatMoney(inspectorValuation.replacementCost)} />
            <ReviewFact label="Rental estimate" value={formatMoney(inspectorValuation.rentalEstimate)} />
            <div className="col-span-2 rounded-xl bg-surface p-3"><p className="text-2xs uppercase tracking-wide text-ink-faint">Inspector comments</p><p className="mt-1 whitespace-pre-wrap text-sm text-ink">{inspectorValuation.comments || '—'}</p></div>
          </div> : <p className="text-sm text-ink-muted">The inspector did not submit a valuation.</p>}
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div><h3 className="text-sm font-semibold text-ink">Professional valuation</h3><p className="text-2xs text-ink-faint">Reviewer assessment · editable</p></div>
            <Badge tone={data.reviewerValuation ? 'success' : 'warning'}>{data.reviewerValuation ? 'Saved' : 'Not entered'}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Currency"><input value={valuation.currency} disabled={!editable || busy} onChange={e => setValuation(v => ({ ...v, currency: e.target.value.toUpperCase() }))} maxLength={3} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm" /></Field>
            <Field label="Market value"><input type="number" min="0" value={valuation.marketValue} disabled={!editable || busy} onChange={e => setValuation(v => ({ ...v, marketValue: e.target.value }))} placeholder="0" className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm" /></Field>
            <Field label="Forced sale value"><input type="number" min="0" value={valuation.forcedSaleValue} disabled={!editable || busy} onChange={e => setValuation(v => ({ ...v, forcedSaleValue: e.target.value }))} placeholder="0" className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm" /></Field>
            <Field label="Replacement cost"><input type="number" min="0" value={valuation.replacementCost} disabled={!editable || busy} onChange={e => setValuation(v => ({ ...v, replacementCost: e.target.value }))} placeholder="0" className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm" /></Field>
            <Field label="Rental estimate"><input type="number" min="0" value={valuation.rentalEstimate} disabled={!editable || busy} onChange={e => setValuation(v => ({ ...v, rentalEstimate: e.target.value }))} placeholder="0" className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm" /></Field>
          </div>
          <div className="mt-3 space-y-3">
            <Field label="Professional valuation comments"><textarea value={valuation.comments} disabled={!editable || busy} onChange={e => setValuation(v => ({ ...v, comments: e.target.value }))} placeholder="Explain the valuation basis, assumptions, market evidence, adjustments or other professional considerations…" className="min-h-28 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-primary focus:ring-2 focus:ring-primary/10" /></Field>
            <div className="flex flex-wrap items-center gap-3"><Button loading={busy} disabled={!editable || !valuation.marketValue.trim()} onClick={() => void run(() => api.patch(`/inspections/${inspectionId}/review/valuation`, {
              currency: valuation.currency.trim() || 'RWF',
              marketValue: Number(valuation.marketValue),
              forcedSaleValue: valuation.forcedSaleValue.trim() ? Number(valuation.forcedSaleValue) : undefined,
              replacementCost: valuation.replacementCost.trim() ? Number(valuation.replacementCost) : undefined,
              rentalEstimate: valuation.rentalEstimate.trim() ? Number(valuation.rentalEstimate) : undefined,
              comments: valuation.comments,
              baseVersion: version,
            }), 'Professional valuation saved.')}>Save professional valuation</Button>{data.reviewerValuation && <span className="text-2xs text-ink-faint">Last updated {formatDateTime(data.reviewerValuation.updatedAt)}</span>}</div>
          </div>
        </div>
      </div>
    </Card>

    <Card>
      <CardHeader title="Professional adjustments" description="Adjust only information that requires professional judgement. Every adjustment preserves the submitted value." />
      <div className="grid gap-3 px-5 pb-5 lg:grid-cols-[1fr_1fr_1fr_auto]">
        <Field label="Field code"><input value={fieldCode} disabled={!editable || busy} onChange={e => setFieldCode(e.target.value)} placeholder="e.g. LAND_ESTIMATED_VALUE" className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm" /></Field>
        <Field label="Reviewed value"><input value={adjustedValue} disabled={!editable || busy} onChange={e => setAdjustedValue(e.target.value)} placeholder="Value" className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm" /></Field>
        <Field label="Reason"><input value={adjustmentReason} disabled={!editable || busy} onChange={e => setAdjustmentReason(e.target.value)} placeholder="Professional justification" className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm" /></Field>
        <div className="flex items-end"><Button loading={busy} disabled={!editable || !fieldCode || !adjustedValue || !adjustmentReason} onClick={() => void run(() => api.post(`/inspections/${inspectionId}/review/adjustments`, { fieldCode, adjustedValue: { value: adjustedValue }, reason: adjustmentReason, baseVersion: version }), 'Adjustment recorded.')}>Record</Button></div>
      </div>
      {data.adjustments.length > 0 && <div className="border-t border-line px-5 py-4"><div className="space-y-2">{data.adjustments.map(a => <div key={a.id} className="rounded-xl bg-surface-2 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{a.fieldCode}</strong><Badge tone="neutral">{formatDateTime(a.createdAt)}</Badge></div><p className="mt-1 text-ink-muted">Submitted: {JSON.stringify(a.originalValue)} → Reviewed: {JSON.stringify(a.adjustedValue)}</p><p className="mt-1 text-ink-muted">Reason: {a.reason}</p></div>)}</div></div>}
    </Card>

    <Card>
      <CardHeader title="Reviewer conclusion" description="This becomes part of the professional review record and official decision trail." />
      <div className="px-5 pb-5 space-y-3"><Field label="Conclusion"><textarea value={conclusion} disabled={!editable || busy} onChange={e => setConclusion(e.target.value)} placeholder="Summarise professional findings, material exceptions and recommendation…" className="min-h-32 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-primary focus:ring-2 focus:ring-primary/10" /></Field><Button loading={busy} disabled={!editable || !conclusion.trim()} onClick={() => void run(() => api.patch(`/inspections/${inspectionId}/review/conclusion`, { conclusion, baseVersion: version }), 'Conclusion saved.')}>Save conclusion</Button></div>
    </Card>

    <Card>
      <CardHeader title="Review history" description="Corrections, comments and status changes remain available as the audit trail." />
      <div className="space-y-2 px-5 pb-5">{inspection.statusEvents.map(e => <div key={e.id} className="flex gap-3 border-l-2 border-line pl-3 text-sm"><div><p className="font-medium text-ink">{humanise(e.toStatus)}</p><p className="text-2xs text-ink-faint">{formatDateTime(e.createdAt)} · {fullName(e.actor)}</p>{e.comment && <p className="mt-1 text-ink-muted">{e.comment}</p>}</div></div>)}</div>
    </Card>
  </div>;
}

function ReviewFact({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-surface-2 p-3"><p className="text-2xs uppercase tracking-wide text-ink-faint">{label}</p><p className="mt-1 text-sm font-semibold text-ink">{value || '—'}</p></div>; }
function Check({ label, ok, detail }: { label: string; ok: boolean; detail: string }) { return <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5"><div><p className="text-sm font-medium text-ink">{label}</p><p className="text-2xs text-ink-faint">{detail}</p></div><Badge tone={ok ? 'success' : 'warning'}>{ok ? 'Verified' : 'Attention'}</Badge></div>; }
