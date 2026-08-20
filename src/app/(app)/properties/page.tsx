'use client';

import * as React from 'react';
import {
  Alert, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader,
  Pagination, SearchInput, Select, Table, TableSkeleton, Td, Th, Tr,
} from '@/components/ui';
import { IconHome, IconMapPin, IconPlus } from '@/components/icons';
import { BranchRef, Paginated, Person, api, readableError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface PropertyRow {
  id: string; reference: string; propertyType: string; addressLine: string;
  latitude: string | null; longitude: string | null;
  branch: BranchRef; division: { id: string; name: string } | null;
  _count: { inspections: number };
}

export default function PropertiesPage() {
  const { can } = useAuth();
  const [result, setResult] = React.useState<Paginated<PropertyRow> | null>(null);
  const [branches, setBranches] = React.useState<BranchRef[]>([]);
  const [inspectors, setInspectors] = React.useState<Person[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [showCreate, setShowCreate] = React.useState(false);
  const [raiseFor, setRaiseFor] = React.useState<PropertyRow | null>(null);

  const [form, setForm] = React.useState({
    reference: '', branchId: '', propertyType: 'Residential house',
    addressLine: '', plotNumber: '', titleNumber: '', latitude: '', longitude: '',
  });
  const [inspectionForm, setInspectionForm] = React.useState({
    loanReference: '', clientName: '', inspectorId: '', priority: 'NORMAL', dueDate: '',
  });

  const [debounced, setDebounced] = React.useState('');
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  React.useEffect(() => { setPage(1); }, [debounced]);

  const load = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (debounced.trim()) params.set('search', debounced.trim());
    try {
      setResult(await api.get<Paginated<PropertyRow>>(`/properties?${params}`));
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setLoading(false);
    }
  }, [page, debounced]);

  React.useEffect(() => { void load(); }, [load]);

  React.useEffect(() => {
    if (can('branches.read')) {
      api.get<Paginated<BranchRef>>('/branches?page=1&pageSize=100')
        .then((r) => setBranches(r.data)).catch(() => setBranches([]));
    }
    if (can('inspections.assign')) {
      api.get<Person[]>('/users/inspectors').then(setInspectors).catch(() => setInspectors([]));
    }
  }, [can]);

  const createProperty = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(null); setNotice(null);
    try {
      await api.post('/properties', {
        reference: form.reference, branchId: form.branchId,
        propertyType: form.propertyType, addressLine: form.addressLine,
        plotNumber: form.plotNumber || undefined,
        titleNumber: form.titleNumber || undefined,
        // Registered coordinates are the reference point for every later
        // proof-of-presence check, so they are worth capturing at entry.
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
      });
      setNotice(`Property ${form.reference} registered.`);
      setShowCreate(false);
      setForm({
        reference: '', branchId: '', propertyType: 'Residential house',
        addressLine: '', plotNumber: '', titleNumber: '', latitude: '', longitude: '',
      });
      await load();
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
    }
  };

  const raiseInspection = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!raiseFor) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await api.post('/inspections', {
        propertyId: raiseFor.id,
        loanReference: inspectionForm.loanReference,
        clientName: inspectionForm.clientName || undefined,
        inspectorId: inspectionForm.inspectorId || undefined,
        priority: inspectionForm.priority,
        dueDate: inspectionForm.dueDate
          ? new Date(inspectionForm.dueDate).toISOString()
          : undefined,
      });
      setNotice(`Inspection raised for ${raiseFor.reference}.`);
      setRaiseFor(null);
      setInspectionForm({
        loanReference: '', clientName: '', inspectorId: '', priority: 'NORMAL', dueDate: '',
      });
      await load();
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        description="Collateral registered for inspection."
        action={
          can('properties.write') ? (
            <Button icon={<IconPlus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
              Register property
            </Button>
          ) : undefined
        }
      />

      {error && (
        <Alert tone="danger" title="Something went wrong" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert tone="success" title={notice} onDismiss={() => setNotice(null)} />
      )}

      <Card className="p-4">
        <SearchInput
          placeholder="Search reference, address, plot or title number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search properties"
        />
      </Card>

      <Card>
        {loading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : !result || result.data.length === 0 ? (
          <EmptyState
            icon={<IconHome />}
            title={debounced ? 'No properties match that search' : 'No properties yet'}
            description={
              debounced ? 'Try a different reference.' : 'Register one to begin raising inspections.'
            }
            action={
              can('properties.write') && !debounced ? (
                <Button onClick={() => setShowCreate(true)}>Register property</Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table label="Registered properties">
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Address</Th>
                  <Th className="hidden lg:table-cell">Branch</Th>
                  <Th className="hidden md:table-cell">Coordinates</Th>
                  <Th align="right">Inspections</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((property) => (
                  <Tr key={property.id}>
                    <Td>
                      <span className="font-semibold text-ink">{property.reference}</span>
                      <span className="mt-0.5 block text-xs text-ink-faint">
                        {property.propertyType}
                      </span>
                    </Td>
                    <Td>
                      <span className="block max-w-[260px] truncate">{property.addressLine}</span>
                      {property.division && (
                        <span className="mt-0.5 block text-xs text-ink-faint">
                          {property.division.name}
                        </span>
                      )}
                    </Td>
                    <Td className="hidden text-sm text-ink-muted lg:table-cell">
                      {property.branch.code}
                    </Td>
                    <Td className="hidden md:table-cell">
                      {property.latitude ? (
                        <span className="inline-flex items-center gap-1.5 text-xs tabular-nums text-ink-muted">
                          <IconMapPin className="h-3.5 w-3.5 text-success-fg" />
                          {Number(property.latitude).toFixed(4)},{' '}
                          {Number(property.longitude).toFixed(4)}
                        </span>
                      ) : (
                        // Flagged, because without registered coordinates a GPS
                        // capture can never be verified against this property.
                        <Badge tone="warning">Not set</Badge>
                      )}
                    </Td>
                    <Td align="right" className="tabular-nums">{property._count.inspections}</Td>
                    <Td align="right">
                      {can('inspections.create') && (
                        <Button size="sm" variant="secondary" onClick={() => setRaiseFor(property)}>
                          Raise inspection
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pagination
              page={result.meta.page}
              totalPages={result.meta.totalPages}
              total={result.meta.total}
              onChange={setPage}
            />
          </>
        )}
      </Card>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Register property"
        description="Coordinates are optional, but without them a GPS capture cannot be verified."
        width="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button form="property-form" type="submit" loading={busy}>Register</Button>
          </>
        }
      >
        <form id="property-form" onSubmit={createProperty} className="grid gap-4 sm:grid-cols-2">
          <Field label="Reference" required>
            <Input
              required value={form.reference} placeholder="PROP-2026-0004"
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
            />
          </Field>
          <Field label="Branch" required>
            <Select
              required value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
            >
              <option value="">Choose a branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Property type" required>
            <Input
              required value={form.propertyType}
              onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
            />
          </Field>
          <Field label="Plot number">
            <Input
              value={form.plotNumber}
              onChange={(e) => setForm({ ...form, plotNumber: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address" required>
              <Input
                required value={form.addressLine}
                onChange={(e) => setForm({ ...form, addressLine: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Title number">
            <Input
              value={form.titleNumber}
              onChange={(e) => setForm({ ...form, titleNumber: e.target.value })}
            />
          </Field>
          <div />
          <Field label="Latitude" hint="e.g. -1.9536">
            <Input
              type="number" step="any" value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })}
            />
          </Field>
          <Field label="Longitude" hint="e.g. 30.0928">
            <Input
              type="number" step="any" value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={raiseFor !== null}
        onClose={() => setRaiseFor(null)}
        title="Raise inspection"
        description={raiseFor ? `${raiseFor.reference} — ${raiseFor.addressLine}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRaiseFor(null)}>Cancel</Button>
            <Button form="inspection-form" type="submit" loading={busy}>Raise inspection</Button>
          </>
        }
      >
        <form id="inspection-form" onSubmit={raiseInspection} className="space-y-4">
          <Field label="Loan reference" required>
            <Input
              required value={inspectionForm.loanReference} placeholder="LOAN-2026-001"
              onChange={(e) => setInspectionForm({ ...inspectionForm, loanReference: e.target.value })}
            />
          </Field>
          <Field label="Client name">
            <Input
              value={inspectionForm.clientName}
              onChange={(e) => setInspectionForm({ ...inspectionForm, clientName: e.target.value })}
            />
          </Field>
          {inspectors.length > 0 && (
            <Field label="Assign to inspector" hint="Can be assigned later if left blank.">
              <Select
                value={inspectionForm.inspectorId}
                onChange={(e) => setInspectionForm({ ...inspectionForm, inspectorId: e.target.value })}
              >
                <option value="">Assign later</option>
                {inspectors.map((i) => (
                  <option key={i.id} value={i.id}>{i.firstName} {i.lastName}</option>
                ))}
              </Select>
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Priority">
              <Select
                value={inspectionForm.priority}
                onChange={(e) => setInspectionForm({ ...inspectionForm, priority: e.target.value })}
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </Select>
            </Field>
            <Field label="Due date">
              <Input
                type="date" value={inspectionForm.dueDate}
                onChange={(e) => setInspectionForm({ ...inspectionForm, dueDate: e.target.value })}
              />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
