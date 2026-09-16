'use client';
import * as React from 'react';
import { Alert, Button, Card, CardHeader, Field } from '@/components/ui';
import { ApiError, InspectionDetail, api, readableError } from '@/lib/api';
import { formatDate, formatDateTime, fullName, humanise } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';

export function AdminInspectionEditor({ inspectionId }: { inspectionId: string }) {
  const { user, can } = useAuth();
  const [inspection, setInspection] = React.useState<InspectionDetail | null>(null);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [owner, setOwner] = React.useState({ fullName: '', phone: '', email: '', occupancyStatus: '', ownershipType: '' });
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const isAdmin = Boolean(user?.roles.some((r) => r.trim().toLowerCase() === 'admin'));
  const allowed = isAdmin && can('inspections.write');

  const load = React.useCallback(async () => {
    if (!allowed) return;
    try {
      const d = await api.get<InspectionDetail>(`/inspections/${inspectionId}`);
      setInspection(d);
      setValues(Object.fromEntries(d.values.map((v) => [v.field.id, toEditValue(v)])));
      if (d.owner) setOwner({ fullName: d.owner.fullName ?? '', phone: d.owner.phone ?? '', email: d.owner.email ?? '', occupancyStatus: d.owner.occupancyStatus ?? '', ownershipType: d.owner.ownershipType ?? '' });
    } catch (e) { setError(readableError(e)); }
  }, [allowed, inspectionId]);

  React.useEffect(() => { void load(); }, [load]);
  if (!allowed) return null;
  if (!inspection) return error ? <Alert title="Administrative editor unavailable">{error}</Alert> : <Card><div className="p-5 text-sm text-ink-muted">Loading administrative editor…</div></Card>;

  const editable = !['APPROVED', 'REPORT_GENERATED', 'ARCHIVED'].includes(inspection.status);
  const saveValues = async () => {
    setBusy(true); setError(null);
    try {
      const payload = inspection.values.map((v) => {
        const value = values[v.field.id] ?? '';
        const type = v.field.type;
        if (type === 'NUMBER' || type === 'CURRENCY') return { fieldId: v.field.id, valueNumber: value === '' ? undefined : Number(value) };
        if (type === 'BOOLEAN') return { fieldId: v.field.id, valueBool: value === '' ? undefined : value === 'true' };
        if (type === 'DATE') return { fieldId: v.field.id, valueDate: value || undefined };
        if (type === 'MULTI_SELECT') return { fieldId: v.field.id, valueJson: value ? value.split(',').map((x) => x.trim()).filter(Boolean) : [] };
        return { fieldId: v.field.id, valueText: value };
      });
      await api.patch(`/inspections/${inspectionId}/values`, { values: payload, baseVersion: inspection.version });
      await load(); setNotice('Inspection fields updated.');
    } catch (e) { if (e instanceof ApiError && e.code === 'INSPECTION_STALE_VERSION') { setError(`${e.message} Reloaded the latest inspection.`); await load(); } else setError(readableError(e)); }
    finally { setBusy(false); }
  };

  const saveOwner = async () => {
    if (!owner.fullName.trim()) return;
    setBusy(true); setError(null);
    try {
      await api.patch(`/inspections/${inspectionId}/owner`, { ...owner, baseVersion: inspection.version });
      await load(); setNotice('Owner information updated.');
    } catch (e) { setError(readableError(e)); }
    finally { setBusy(false); }
  };

  return <Card className="border-primary/30"><CardHeader title="Administrative inspection edit" description="Administrator-only correction of the inspector's recorded data. Every save uses the inspection version to prevent overwriting newer changes."/><div className="space-y-6 px-5 pb-5">
    {error && <Alert title="Administrative edit failed" onDismiss={() => setError(null)}>{error}</Alert>}{notice && <Alert tone="success" title={notice} onDismiss={() => setNotice(null)}/>} {!editable && <Alert title="Editing locked">Approved, report-ready and archived inspections cannot be administratively edited.</Alert>}
    <div><h3 className="mb-3 text-sm font-semibold text-ink">Recorded inspection fields</h3><div className="grid gap-3 sm:grid-cols-2">{inspection.values.map((v) => <Field key={v.field.id} label={`${v.field.label} · ${humanise(v.field.type)}`}><input value={values[v.field.id] ?? ''} disabled={!editable || busy} onChange={(e) => setValues((x) => ({ ...x, [v.field.id]: e.target.value }))} type={v.field.type === 'NUMBER' || v.field.type === 'CURRENCY' ? 'number' : v.field.type === 'DATE' ? 'date' : 'text'} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"/></Field>)}</div><div className="mt-4"><Button loading={busy} disabled={!editable || !inspection.values.length} onClick={() => void saveValues()}>Save inspection fields</Button></div></div>
    <div className="border-t border-line pt-5"><h3 className="mb-3 text-sm font-semibold text-ink">Owner information</h3><div className="grid gap-3 sm:grid-cols-2"><Field label="Owner name"><input value={owner.fullName} disabled={!editable || busy} onChange={(e) => setOwner((x) => ({ ...x, fullName: e.target.value }))} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"/></Field><Field label="Phone"><input value={owner.phone} disabled={!editable || busy} onChange={(e) => setOwner((x) => ({ ...x, phone: e.target.value }))} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"/></Field><Field label="Email"><input value={owner.email} disabled={!editable || busy} onChange={(e) => setOwner((x) => ({ ...x, email: e.target.value }))} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"/></Field><Field label="Occupancy"><input value={owner.occupancyStatus} disabled={!editable || busy} onChange={(e) => setOwner((x) => ({ ...x, occupancyStatus: e.target.value }))} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"/></Field><Field label="Ownership"><input value={owner.ownershipType} disabled={!editable || busy} onChange={(e) => setOwner((x) => ({ ...x, ownershipType: e.target.value }))} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"/></Field></div><div className="mt-4"><Button variant="secondary" loading={busy} disabled={!editable || !owner.fullName.trim()} onClick={() => void saveOwner()}>Save owner information</Button></div></div>
    <p className="text-xs text-ink-faint">Inspection: {inspection.inspectionNumber} · Version {inspection.version} · Inspector: {fullName(inspection.inspector)} · Last submitted: {formatDateTime(inspection.submittedAt)} · Created: {formatDate(inspection.createdAt)}</p>
  </div></Card>;
}

function toEditValue(v: InspectionDetail['values'][number]): string {
  if (v.valueText != null) return v.valueText;
  if (v.valueNumber != null) return String(v.valueNumber);
  if (v.valueDate != null) return String(v.valueDate).slice(0, 10);
  if (v.valueBool != null) return String(v.valueBool);
  if (Array.isArray(v.valueJson)) return v.valueJson.map(String).join(', ');
  if (v.valueJson != null) return typeof v.valueJson === 'object' ? JSON.stringify(v.valueJson) : String(v.valueJson);
  return '';
}
