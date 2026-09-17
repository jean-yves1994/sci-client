'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';
import {
  Alert, Avatar, Badge, Button, Card, EmptyState, PageHeader, Pagination, SearchInput,
  Segmented, Select, StatusBadge, Table, TableSkeleton, Td, Th, Tr, cx,
} from '@/components/ui';
import { IconClipboard, IconFilter } from '@/components/icons';
import { BranchRef, InspectionListItem, Paginated, Person, api, readableError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  avatarTone, formatDate, fullName, humanise, initials,
  priorityTone, statusLabel, statusTone,
} from '@/lib/format';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'CORRECTION_REQUESTED', label: 'Needs correction' },
  { value: 'RESUBMITTED', label: 'Resubmitted' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REPORT_GENERATED', label: 'Report ready' },
  { value: 'REJECTED', label: 'Rejected' },
];

type Scope = 'all' | 'mine';

export default function InspectionsPage() {
  const { user, can } = useAuth();
  const searchParams = useSearchParams();
  const isInspector = Boolean(user?.roles.some((role) => role.trim().toLowerCase() === 'inspector'));

  const [result, setResult] = React.useState<Paginated<InspectionListItem> | null>(null);
  const [branches, setBranches] = React.useState<BranchRef[]>([]);
  const [inspectors, setInspectors] = React.useState<Person[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [search, setSearch] = React.useState(searchParams.get('search') ?? '');
  const [status, setStatus] = React.useState('');
  const [branchId, setBranchId] = React.useState('');
  const [inspectorId, setInspectorId] = React.useState('');
  const [priority, setPriority] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [sortBy, setSortBy] = React.useState('createdAt');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');
  const [page, setPage] = React.useState(1);
  const [showFilters, setShowFilters] = React.useState(false);
  const [scope, setScope] = React.useState<Scope>(
    isInspector || searchParams.get('assignedToMe') === 'true' ? 'mine' : 'all',
  );

  React.useEffect(() => {
    if (isInspector) setScope('mine');
  }, [isInspector]);

  React.useEffect(() => {
    const controller = new AbortController();
    if (can('branches.read')) {
      api.get<Paginated<BranchRef>>('/branches?page=1&pageSize=100', controller.signal)
        .then((r) => setBranches(r.data)).catch(() => undefined);
    }
    if (!isInspector && can('inspections.assign')) {
      api.get<Person[]>('/users/inspectors', controller.signal)
        .then(setInspectors).catch(() => undefined);
    }
    return () => controller.abort();
  }, [can, isInspector]);

  const [debouncedSearch, setDebouncedSearch] = React.useState(search);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ page: String(page), pageSize: '20', sortBy, sortDir });
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (status) params.set('status', status);
    if (branchId) params.set('branchId', branchId);
    if (!isInspector && inspectorId) params.set('inspectorId', inspectorId);
    if (priority) params.set('priority', priority);
    if (from) params.set('from', new Date(from).toISOString());
    if (to) params.set('to', new Date(to).toISOString());
    if (isInspector || scope === 'mine') params.set('assignedToMe', 'true');

    api.get<Paginated<InspectionListItem>>(`/inspections?${params}`, controller.signal)
      .then(setResult)
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        setError(readableError(caught));
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [page, sortBy, sortDir, debouncedSearch, status, branchId, inspectorId, priority, from, to, scope, isInspector]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, branchId, inspectorId, priority, from, to, scope]);

  const toggleSort = (field: string) => {
    if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('desc'); }
  };
  const sortIndicator = (field: string) => (sortBy === field ? sortDir : null);

  const clearFilters = () => {
    setStatus(''); setBranchId(''); setInspectorId('');
    setPriority(''); setFrom(''); setTo('');
  };

  const activeFilters = [status, branchId, inspectorId, priority, from, to].filter(Boolean).length;

  return (
    <div className="space-y-4 py-2">
      <PageHeader
        title="Inspections"
        description={
          result ? `${result.meta.total.toLocaleString()} record${result.meta.total === 1 ? '' : 's'}` : 'Loading…'
        }
        actions={
          <div className="flex items-center gap-2">
            {!isInspector && (
              <Segmented
                value={scope}
                onChange={(value) => setScope(value as Scope)}
                options={[{ value: 'all', label: 'All' }, { value: 'mine', label: 'Assigned to me' }]}
              />
            )}
            <Button variant="secondary" onClick={() => setShowFilters((value) => !value)}>
              <IconFilter className="mr-2 h-4 w-4" />
              Filters{activeFilters > 0 ? ` (${activeFilters})` : ''}
            </Button>
          </div>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search inspections…" />
          {isInspector && (
            <Badge tone="neutral">Assigned to me</Badge>
          )}
        </div>

        {showFilters && (
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Select value={status} onChange={(event) => setStatus(event.target.value)} options={STATUS_OPTIONS} />
            {!isInspector && (
              <Select
                value={inspectorId}
                onChange={(event) => setInspectorId(event.target.value)}
                options={[{ value: '', label: 'All inspectors' }, ...inspectors.map((inspector) => ({ value: inspector.id, label: fullName(inspector) }))]}
              />
            )}
            {can('branches.read') && (
              <Select
                value={branchId}
                onChange={(event) => setBranchId(event.target.value)}
                options={[{ value: '', label: 'All branches' }, ...branches.map((branch) => ({ value: branch.id, label: `${branch.code} — ${branch.name}` }))]}
              />
            )}
            <Select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              options={[{ value: '', label: 'All priorities' }, { value: 'LOW', label: 'Low' }, { value: 'NORMAL', label: 'Normal' }, { value: 'HIGH', label: 'High' }, { value: 'URGENT', label: 'Urgent' }]}
            />
          </div>
        )}
      </Card>

      {loading ? <TableSkeleton rows={8} /> : !result?.data.length ? (
        <EmptyState icon={<IconClipboard className="h-8 w-8" />} title="No inspections found" description={isInspector ? 'There are no inspections currently assigned to you.' : 'Try adjusting your filters or search terms.'} />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <thead>
              <Tr>
                <Th onClick={() => toggleSort('inspectionNumber')}>Inspection</Th>
                <Th>Property</Th>
                <Th>Status</Th>
                <Th>Priority</Th>
                <Th>Inspector</Th>
                <Th onClick={() => toggleSort('dueDate')}>Due</Th>
                <Th />
              </Tr>
            </thead>
            <tbody>
              {result.data.map((inspection) => (
                <Tr key={inspection.id}>
                  <Td>
                    <Link className="font-medium hover:underline" href={`/inspections/${inspection.id}`}>{inspection.inspectionNumber}</Link>
                    <div className="text-xs text-muted-foreground">{inspection.loanReference}</div>
                  </Td>
                  <Td>
                    <div className="font-medium">{inspection.property.reference}</div>
                    <div className="text-xs text-muted-foreground">{inspection.property.addressLine}</div>
                  </Td>
                  <Td><StatusBadge tone={statusTone(inspection.status)}>{statusLabel(inspection.status)}</StatusBadge></Td>
                  <Td><Badge tone={priorityTone(inspection.priority)}>{humanise(inspection.priority)}</Badge></Td>
                  <Td>
                    {inspection.inspector ? (
                      <div className="flex items-center gap-2">
                        <Avatar initials={initials(inspection.inspector)} tone={avatarTone(inspection.inspector.id)} />
                        <span>{fullName(inspection.inspector)}</span>
                      </div>
                    ) : '—'}
                  </Td>
                  <Td>{formatDate(inspection.dueDate)}</Td>
                  <Td className="text-right">
                    <Link className="text-sm font-medium hover:underline" href={`/inspections/${inspection.id}`}>View</Link>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <div className="border-t p-3">
            <Pagination meta={result.meta} page={page} onPageChange={setPage} />
          </div>
        </Card>
      )}
    </div>
  );
}
