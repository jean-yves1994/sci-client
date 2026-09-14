'use client';

import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import {
  Alert, Avatar, Badge, Button, Card, CardHeader, Field, Modal, ProgressBar,
  Skeleton, StatusBadge, Textarea, cx,
} from '@/components/ui';
import {
  IconAlert, IconArrowLeft, IconCamera, IconCheckCircle, IconDownload, IconMapPin,
} from '@/components/icons';
import { ApiError, InspectionDetail, api, readableError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  avatarTone, formatDate, formatDateTime, formatMoney, fullName, humanise,
  initials, priorityTone, statusLabel, statusTone,
} from '@/lib/format';
import type { Tone } from '@/components/ui';

type DecisionKind = 'approve' | 'reject' | 'correction' | null;

type InspectionProperty = InspectionDetail['property'] & {
  province?: string | null;
  district?: string | null;
  sector?: string | null;
  cell?: string | null;
  villageStreet?: string | null;
};

const PROXIMITY_TONE: Record<string, Tone> = {
  AT_PROPERTY: 'success', NEARBY: 'warning', DISTANT: 'danger', UNVERIFIABLE: 'neutral',
};

export default function InspectionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, can } = useAuth();

  const [inspection, setInspection] = React.useState<InspectionDetail | null>(null);
  const [photoUrls, setPhotoUrls] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [decision, setDecision] = React.useState<DecisionKind>(null);
  const [reason, setReason] = React.useState('');
  const [lightbox, setLightbox] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const detail = await api.get<InspectionDetail>(`/inspections/${params.id}`);
      setInspection(detail);
      if (detail.photos.length > 0) {
        const photos = await api.get<Array<{ id: string; url: string }>>(`/inspections/${params.id}/photos`);
        setPhotoUrls(Object.fromEntries(photos.map((p) => [p.id, p.url])));
      }
    } catch (caught) {
      setError(readableError(caught));
    }
  }, [params.id]);

  React.useEffect(() => { void load(); }, [load]);

  const run = async (work: () => Promise<unknown>, success: string) => {
    setBusy(true); setError(null); setNotice(null);
    try {
      await work(); await load(); setNotice(success); setDecision(null); setReason('');
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'INSPECTION_STALE_VERSION') {
        setError(`${caught.message} The page has been reloaded with the latest version.`); await load();
      } else setError(readableError(caught));
    } finally { setBusy(false); }
  };

  if (error && !inspection) return <Alert title="Could not load this inspection">{error}</Alert>;
  if (!inspection) return <div className="space-y-4 py-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-32 rounded-2xl" /><div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-[520px] rounded-2xl lg:col-span-2" /><Skeleton className="h-[520px] rounded-2xl" /></div></div>;

  const awaitingDecision = ['SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW'].includes(inspection.status);
  const isOwnWork = inspection.inspector?.id === user?.id;
  const canDecide = can('reviews.decide') && awaitingDecision && !isOwnWork;
  const canGenerateReport = can('reports.generate') && ['APPROVED', 'REPORT_GENERATED'].includes(inspection.status);
  const canGenerateDraft = can('reports.generate') && awaitingDecision;
  const draftReports = inspection.reports.filter((report) => report.reportNumber.startsWith('DRF-'));
  const officialReports = inspection.reports.filter((report) => report.reportNumber.startsWith('RPT-'));
  const latestDraft = draftReports[0];
  const latestReport = officialReports[0];
  const openCorrection = inspection.corrections.find((c) => !c.resolvedAt);
  const property = inspection.property as InspectionProperty;
  const locationParts = [property.province, property.district, property.sector, property.cell].map((part) => part?.trim()).filter((part): part is string => Boolean(part));
  const locationValue = locationParts.length > 0 ? locationParts.join(' · ') : property.division?.name ?? '—';
  const addressValue = property.addressLine?.trim() || property.villageStreet?.trim() || locationValue;

  const downloadReport = async (reportId: string) => {
    try {
      setError(null);
      const { url } = await api.get<{ url: string }>(`/reports/${reportId}/download`);
      window.open(url, '_blank', 'noopener');
    } catch (caught) {
      setError(readableError(caught));
    }
  };

  const generateDraft = async () => {
    await run(
      () => api.post(`/inspections/${inspection.id}/draft-report`),
      'Draft report is ready to download.',
    );
  };

  return (
    <div className="space-y-4 py-2">
      <button type="button" onClick={() => router.push('/inspections')} className="inline-flex items-center gap-1.5 rounded-lg text-sm text-ink-muted transition-colors hover:text-ink"><IconArrowLeft className="h-4 w-4" />Back to inspections</button>
      <Card className="p-5"><div className="flex flex-wrap items-start justify-between gap-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-semibold tracking-tight text-ink">{inspection.inspectionNumber}</h1><StatusBadge tone={statusTone(inspection.status)}>{statusLabel(inspection.status)}</StatusBadge><Badge tone={priorityTone(inspection.priority)}>{humanise(inspection.priority)}</Badge>{inspection.submissionCount > 1 && <Badge tone="neutral">Submission {inspection.submissionCount}</Badge>}</div><p className="mt-1.5 text-sm text-ink-muted">{inspection.loanReference} · {inspection.property.reference} · {addressValue}</p><dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2.5"><HeaderFact label="Branch" value={inspection.branch.code} /><HeaderFact label="Inspector" value={fullName(inspection.inspector)} /><HeaderFact label="Reviewer" value={fullName(inspection.reviewer)} /><HeaderFact label="Due" value={formatDate(inspection.dueDate)} /></dl></div><div className="flex flex-wrap gap-2">{latestDraft ? <Button variant="secondary" icon={<IconDownload className="h-4 w-4" />} onClick={() => void downloadReport(latestDraft.id)}>Download draft</Button> : canGenerateDraft && <Button variant="secondary" loading={busy} icon={<IconDownload className="h-4 w-4" />} onClick={() => void generateDraft()}>Generate draft</Button>}{canGenerateReport && <Button variant="secondary" loading={busy} onClick={() => void run(() => api.post(`/inspections/${inspection.id}/report`), 'Report generated.')}>{latestReport ? 'Regenerate' : 'Generate report'}</Button>}{latestReport && <Button icon={<IconDownload className="h-4 w-4" />} onClick={() => void downloadReport(latestReport.id)}>Download final</Button>}</div></div></Card>
      {error && <Alert title="That action could not be completed" onDismiss={() => setError(null)}>{error}</Alert>}{notice && <Alert tone="success" title={notice} onDismiss={() => setNotice(null)} />}
      {latestDraft && awaitingDecision && <Alert tone="info" title="Draft report available">A draft report was generated from the submitted inspection. Review it before making the approval decision. It is not the final approved report.</Alert>}
      {!latestDraft && canGenerateDraft && <Alert tone="warning" title="Draft report not generated yet">This inspection is submitted and eligible for a draft report, but no draft record exists yet. Generate it now; this does not change the inspection status.</Alert>}
      {isOwnWork && awaitingDecision && can('reviews.decide') && <Alert tone="info" title="You submitted this inspection">Separation of duties means the person who carried out an inspection cannot also sign it off. Another reviewer must decide on it.</Alert>}
      {openCorrection && <Alert tone="warning" title="Corrections requested"><p className="text-sm">{openCorrection.reason}</p><p className="mt-1.5 text-2xs opacity-80">{fullName(openCorrection.requestedBy)} · {formatDateTime(openCorrection.createdAt)}</p></Alert>}

      <div className="grid gap-4 lg:grid-cols-3"><div className="space-y-4 lg:col-span-2">
        <Card><CardHeader title="Completeness" description="Evaluated server-side against the inspection template." action={<span className="text-xl font-semibold tabular-nums tracking-tight text-ink">{inspection.completeness.percentage}%</span>} /><div className="space-y-3.5 px-5 pb-5"><ProgressBar percentage={inspection.completeness.percentage} />{inspection.completeness.blockingIssues.length === 0 ? <p className="flex items-center gap-2 text-sm text-success-fg"><IconCheckCircle className="h-4 w-4" />All required information has been recorded.</p> : <ul className="space-y-2">{inspection.completeness.blockingIssues.map((issue, index) => <li key={index} className="flex gap-2.5 text-sm text-ink-muted"><IconAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning-fg" />{issue.message}</li>)}</ul>}</div></Card>
        <div className="grid gap-4 sm:grid-cols-2"><Card><CardHeader title="Property" /><dl className="space-y-2.5 px-5 pb-5 text-sm"><Detail label="Reference" value={property.reference} /><Detail label="Type" value={property.propertyType} /><Detail label="Address" value={addressValue} /><Detail label="Location" value={locationValue} /><Detail label="UPI" value={property.titleNumber ?? '—'} /><Detail label="Plot number" value={property.plotNumber ?? '—'} /></dl></Card>
          <Card><CardHeader title="Owner / Client" /><div className="px-5 pb-5"><div className="mb-3 rounded-xl border border-brand-100 bg-brand-50 px-3 py-2"><p className="text-2xs font-semibold text-brand-700">Inherited from Property</p></div>{inspection.owner ? <dl className="space-y-2.5 text-sm"><Detail label="Name" value={inspection.owner.fullName} /><Detail label="Phone" value={inspection.owner.phone ?? '—'} /><Detail label="Email" value={inspection.owner.email ?? '—'} /><Detail label="Occupancy" value={humanise(inspection.owner.occupancyStatus)} /><Detail label="Ownership" value={humanise(inspection.owner.ownershipType)} /><p className="pt-1 text-2xs text-ink-faint">The owner/client name is inherited from the property registration and is not an outstanding inspection requirement. The national ID is encrypted at rest and is not displayed.</p></dl> : <p className="text-sm text-ink-faint">No property owner/client is recorded. Update the property registration before starting a new inspection.</p>}</div></Card>
        </div>
        <Card><CardHeader title="Condition assessment" />{inspection.assessments.length === 0 ? <p className="px-5 pb-5 text-sm text-ink-faint">No assessment categories.</p> : <div className="space-y-1.5 px-5 pb-5">{inspection.assessments.map((assessment) => <div key={assessment.id} className="rounded-xl bg-surface-2 px-4 py-3 transition-colors hover:bg-surface-3"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-medium text-ink">{assessment.categoryName}</p><div className="flex items-center gap-2.5">{assessment.condition && <Badge tone={conditionTone(assessment.condition)}>{humanise(assessment.condition)}</Badge>}<RatingDots rating={assessment.rating} /></div></div>{assessment.notes && <p className="mt-1.5 text-sm text-ink-muted">{assessment.notes}</p>}</div>)}</div>}</Card>
        {inspection.values.length > 0 && <Card><CardHeader title="Recorded information" /><dl className="grid gap-x-8 gap-y-2.5 px-5 pb-5 text-sm sm:grid-cols-2">{inspection.values.map((value) => <Detail key={value.id} label={value.field.label} value={value.valueText ?? value.valueNumber ?? (value.valueBool === null || value.valueBool === undefined ? value.valueDate ? formatDate(value.valueDate) : '—' : value.valueBool ? 'Yes' : 'No')} />)}</dl></Card>}
        <Card><CardHeader title="Photographic evidence" description={`${inspection.photos.length} photograph${inspection.photos.length === 1 ? '' : 's'}`} />{inspection.photos.length === 0 ? <div className="px-5 pb-5"><div className="flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-6 text-sm text-ink-faint"><IconCamera className="h-5 w-5" />No photographs uploaded.</div></div> : <div className="grid grid-cols-2 gap-3 px-5 pb-5 sm:grid-cols-3">{inspection.photos.map((photo) => <button key={photo.id} type="button" onClick={() => photoUrls[photo.id] && setLightbox(photoUrls[photo.id])} aria-label={`View ${humanise(photo.category)} photograph`} className="group overflow-hidden rounded-xl border border-line bg-surface-2 text-left transition-shadow hover:shadow-lift"><div className="aspect-[4/3] overflow-hidden bg-surface-3">{photoUrls[photo.id] ? <img src={photoUrls[photo.id]} alt={photo.caption ?? humanise(photo.category)} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-2xs text-ink-faint">Loading…</div>}</div><div className="px-3 py-2"><p className="truncate text-xs font-medium text-ink">{humanise(photo.category)}</p><p className="mt-0.5 truncate text-2xs text-ink-faint">{photo.capturedAt ? formatDate(photo.capturedAt) : '—'}{photo.latitude ? ' · geotagged' : ''}</p></div></button>)}</div>}</Card>
        {canDecide && <Card><CardHeader title="Review decision" description="Rejections and correction requests require a written reason." /><div className="flex flex-wrap gap-2 px-5 pb-5">{inspection.status !== 'UNDER_REVIEW' && <Button variant="secondary" loading={busy} onClick={() => void run(() => api.post(`/inspections/${inspection.id}/begin-review`), 'Claimed for review.')}>Claim for review</Button>}<Button variant="success" onClick={() => setDecision('approve')}>Approve</Button><Button variant="secondary" onClick={() => setDecision('correction')}>Request corrections</Button><Button variant="danger" onClick={() => setDecision('reject')}>Reject</Button></div></Card>}
      </div>
      <div className="space-y-4"><Card><CardHeader title="Location verification" /><div className="space-y-3.5 px-5 pb-5">{inspection.proximity ? <><div className="flex items-start gap-3"><span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', {success:'bg-success-bg text-success-fg',warning:'bg-warning-bg text-warning-fg',danger:'bg-danger-bg text-danger-fg',neutral:'bg-neutral-bg text-neutral-fg'}[PROXIMITY_TONE[inspection.proximity.verdict] as 'success' | 'warning' | 'danger' | 'neutral'])}><IconMapPin /></span><div className="min-w-0"><Badge tone={PROXIMITY_TONE[inspection.proximity.verdict]}>{humanise(inspection.proximity.verdict)}</Badge><p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{inspection.proximity.explanation}</p></div></div>{inspection.locations[0] && <><dl className="space-y-2 border-t border-line pt-3.5 text-sm"><Detail label="Coordinates" value={`${Number(inspection.locations[0].latitude).toFixed(5)}, ${Number(inspection.locations[0].longitude).toFixed(5)}`} /><Detail label="Accuracy" value={inspection.locations[0].accuracyM ? `${Math.round(inspection.locations[0].accuracyM)} m` : '—'} /><Detail label="Captured" value={formatDateTime(inspection.locations[0].capturedAt)} /></dl>{inspection.locations[0].isMocked && <Alert tone="warning" title="Mock location reported">The device reported a simulated position. Recorded for your judgement, not treated as proof of wrongdoing.</Alert>}<a href={`https://www.google.com/maps/search/?api=1&query=${inspection.locations[0].latitude},${inspection.locations[0].longitude}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded text-xs font-medium text-brand-600 hover:text-brand-700">Open in Google Maps →</a></>}</> : <p className="text-sm text-ink-faint">No GPS reading has been captured.</p>}</div></Card>
        <Card><CardHeader title="Reports" description="Draft reports are available after submission. Official reports are created after approval." />{inspection.reports.length === 0 ? <p className="px-5 pb-5 text-sm text-ink-faint">No report has been generated yet.</p> : <div className="space-y-2 px-5 pb-5">{inspection.reports.map((report) => { const isDraft = report.reportNumber.startsWith('DRF-'); return <div key={report.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3"><div><p className="text-sm font-medium text-ink">{isDraft ? 'Draft' : 'Final'} · {report.reportNumber}</p><p className="mt-0.5 text-2xs text-ink-faint">Version {report.version} · {formatDateTime(report.generatedAt)}</p></div><Button variant="secondary" icon={<IconDownload className="h-4 w-4" />} onClick={() => void downloadReport(report.id)}>Download</Button></div>; })}</div>}</Card>
      </div></div>

      {decision && <Modal title={decision === 'approve' ? 'Approve inspection' : decision === 'reject' ? 'Reject inspection' : 'Request corrections'} onClose={() => setDecision(null)}><Field label="Reason" hint={decision === 'approve' ? 'Optional.' : 'Required.'}><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder={decision === 'approve' ? 'Add a note for the record…' : 'Explain what needs attention…'} /></Field><div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={() => setDecision(null)}>Cancel</Button><Button variant={decision === 'approve' ? 'success' : decision === 'reject' ? 'danger' : 'primary'} loading={busy} onClick={() => { if (decision !== 'approve' && !reason.trim()) { setError('A reason is required for this decision.'); return; } const endpoint = decision === 'approve' ? `/inspections/${inspection.id}/approve` : decision === 'reject' ? `/inspections/${inspection.id}/reject` : `/inspections/${inspection.id}/corrections`; const payload = decision === 'approve' ? { comment: reason.trim() || undefined } : { reason: reason.trim() }; void run(() => api.post(endpoint, payload), decision === 'approve' ? 'Inspection approved.' : decision === 'reject' ? 'Inspection rejected.' : 'Corrections requested.'); }}>{decision === 'approve' ? 'Approve' : decision === 'reject' ? 'Reject' : 'Request corrections'}</Button></div></Modal>}
      {lightbox && <Modal title="Photograph" onClose={() => setLightbox(null)}><img src={lightbox} alt="Inspection evidence" className="max-h-[75vh] w-full rounded-xl object-contain" /></Modal>}
    </div>
  );
}

function HeaderFact({ label, value }: { label: string; value: string }) { return <div><dt className="text-2xs uppercase tracking-[0.12em] text-ink-faint">{label}</dt><dd className="mt-0.5 text-sm font-medium text-ink">{value || '—'}</dd></div>; }
function Detail({ label, value }: { label: string; value: unknown }) { return <div><dt className="text-2xs uppercase tracking-[0.08em] text-ink-faint">{label}</dt><dd className="mt-0.5 text-sm text-ink">{String(value ?? '—')}</dd></div>; }
function RatingDots({ rating }: { rating: number | null }) { return <div className="flex items-center gap-1" aria-label={rating === null ? 'Not rated' : `${rating} out of 5`} >{[1,2,3,4,5].map((dot) => <span key={dot} className={cx('h-1.5 w-1.5 rounded-full', rating !== null && dot <= rating ? 'bg-brand-600' : 'bg-surface-4')} />)}</div>; }
function conditionTone(condition: string): Tone { if (condition === 'GOOD') return 'success'; if (condition === 'FAIR') return 'warning'; if (condition === 'POOR' || condition === 'CRITICAL') return 'danger'; return 'neutral'; }
