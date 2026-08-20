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
  const { can } = useAuth();
  const searchParams = useSearchParams();

  const [result, setResult] = React.useState<Paginated<InspectionListItem> | null>(null);
  const [branches, setBranches] = React.useState<BranchRef[]>([]);
  const [inspectors, setInspectors] = React.useState<Person[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Seeded from the query string so the topbar search can deep-link here.
  const [search, setSearch] = React.useState(searchParams.get('search') ?? '');
  const [status, setStatus] = React.useState('');
  const [branchId, setBranchId] = React.useState('');
  const [inspectorId, setInspectorId] = React.useState('');
  const [priority, setPriority] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [scope, setScope] = React.useState<Scope>(
    searchParams.get('assignedToMe') === 'true' ? 'mine' : 'all',
  );
  const [sortBy, setSortBy] = React.useState('createdAt');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');
  const [page, setPage] = React.useState(1);
  const [showFilters, setShowFilters] = React.useState(false);

  // Debounced so typing a reference does not fire a request per keystroke.
  const [debouncedSearch, setDebouncedSearch] = React.useState(search);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    const controller = new AbortController();
    if (can('branches.read')) {
      api.get<Paginated<BranchRef>>('/branches?page=1&pageSize=100', controller.signal)
        .then((r) => setBranches(r.data)).catch(() => undefined);
    }
    if (can('inspections.assign')) {
      api.get<Person[]>('/users/inspectors', controller.signal)
        .then(setInspectors).catch(() => undefined);
    }
    return () => controller.abort();
  }, [can]);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    // Filtering, sorting and pagination all run server-side — unchanged from
    // the previous implementation, which the backend already supports.
    const params = new URLSearchParams({ page: String(page), pageSize: '20', sortBy, sortDir });
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (status) params.set('status', status);
    if (branchId) params.set('branchId', branchId);
    if (inspectorId) params.set('inspectorId', inspectorId);
    if (priority) params.set('priority', priority);
    if (from) params.set('from', new Date(from).toISOString());
    if (to) params.set('to', new Date(to).toISOString());
    if (scope === 'mine') params.set('assignedToMe', 'true');

    api.get<Paginated<InspectionListItem>>(`/inspections?${params}`, controller.signal)
      .then(setResult)
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        setError(readableError(caught));
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [page, sortBy, sortDir, debouncedSearch, status, branchId, inspectorId, priority, from, to, scope]);

  // Any filter change returns to page 1; staying on page 7 of a smaller result
  // set shows an empty table and reads as a bug.
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
        action={
          can('inspections.write') ? (
            <Segmented<Scope>
              label="Scope"
              value={scope}
              onChange={setScope}
              options={[{ value: 'all', label: 'All' }, { value: 'mine', label: 'Assigned to me' }]}
            />
          ) : undefined
        }
      />

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="min-w-[220px] flex-1">
            <SearchInput
              placeholder="Search number, loan reference, property or owner"
              aria-label="Search inspections"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
            />
          </div>

          <Select
            className="w-auto min-w-[160px]"
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>

          <Button
            variant={showFilters ? 'primary' : 'secondary'}
            icon={<IconFilter className="h-4 w-4" />}
            onClick={() => setShowFilters((open) => !open)}
            aria-expanded={showFilters}
          >
            Filters
            {activeFilters > 0 && (
              <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white/25 px-1 text-[10px] font-bold">
                {activeFilters}
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="mt-3 grid gap-2.5 border-t border-line pt-3 lg:grid-cols-4">
            {branches.length > 0 && (
              <Select aria-label="Filter by branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="">All branches</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.code} — {b.name}</option>)}
              </Select>
            )}
            {inspectors.length > 0 && (
              <Select aria-label="Filter by inspector" value={inspectorId} onChange={(e) => setInspectorId(e.target.value)}>
                <option value="">All inspectors</option>
                {inspectors.map((i) => <option key={i.id} value={i.id}>{i.firstName} {i.lastName}</option>)}
              </Select>
            )}
            <Select aria-label="Filter by priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">Any priority</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Low</option>
            </Select>
            <div className="flex gap-2">
              <input
                type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date"
                className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <input
                type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date"
                className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            {activeFilters > 0 && (
              <div className="lg:col-span-4">
                <Button size="sm" variant="ghost" onClick={clearFilters}>Clear all filters</Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {error && (
        <Alert
          title="Could not load inspections"
          action={<Button size="sm" variant="secondary" onClick={() => setPage(page)}>Retry</Button>}
        >
          {error}
        </Alert>
      )}

      <Card>
        {loading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : !result || result.data.length === 0 ? (
          <EmptyState
            icon={<IconClipboard />}
            title={activeFilters > 0 || search ? 'Nothing matches those filters' : 'No inspections yet'}
            description={
              activeFilters > 0 || search
                ? 'Try widening the date range or clearing a filter.'
                : 'Raise an inspection from the Properties page.'
            }
            action={
              activeFilters > 0 || search ? (
                <Button variant="secondary" onClick={() => { clearFilters(); setSearch(''); }}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table label="Inspections">
              <thead>
                <tr>
                  <Th onSort={() => toggleSort('inspectionNumber')} sorted={sortIndicator('inspectionNumber')}>
                    Inspection
                  </Th>
                  <Th>Property</Th>
                  <Th className="hidden xl:table-cell">Branch</Th>
                  <Th className="hidden md:table-cell">Inspector</Th>
                  <Th className="hidden sm:table-cell" onSort={() => toggleSort('priority')} sorted={sortIndicator('priority')}>
                    Priority
                  </Th>
                  <Th onSort={() => toggleSort('status')} sorted={sortIndicator('status')}>Status</Th>
                  <Th className="hidden sm:table-cell" align="right" onSort={() => toggleSort('dueDate')} sorted={sortIndicator('dueDate')}>
                    Due
                  </Th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((item) => {
                  const overdue =
                    item.dueDate && new Date(item.dueDate) < new Date() &&
                    !['APPROVED', 'REPORT_GENERATED', 'REJECTED', 'ARCHIVED'].includes(item.status);

                  return (
                    <Tr key={item.id}>
                      <Td>
                        <Link href={`/inspections/${item.id}`} className="font-medium text-ink transition-colors hover:text-brand-600">
                          {item.inspectionNumber}
                        </Link>
                        <span className="mt-0.5 block text-2xs text-ink-faint">
                          {item.loanReference}
                          {item._count.photos > 0 && ` · ${item._count.photos} photo${item._count.photos === 1 ? '' : 's'}`}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-sm">{item.property.reference}</span>
                        <span className="mt-0.5 block max-w-[220px] truncate text-2xs text-ink-faint">
                          {item.property.propertyType} · {item.property.addressLine}
                        </span>
                      </Td>
                      <Td className="hidden text-xs text-ink-muted xl:table-cell">{item.branch.code}</Td>
                      <Td className="hidden md:table-cell">
                        {item.inspector ? (
                          <span className="flex items-center gap-2">
                            <Avatar size="sm" name={initials(item.inspector)} tone={avatarTone(item.inspector.id)} />
                            <span className="text-xs">{fullName(item.inspector)}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-ink-faint">Unassigned</span>
                        )}
                      </Td>
                      <Td className="hidden sm:table-cell">
                        <Badge tone={priorityTone(item.priority)}>{humanise(item.priority)}</Badge>
                      </Td>
                      <Td>
                        <StatusBadge tone={statusTone(item.status)}>{statusLabel(item.status)}</StatusBadge>
                      </Td>
                      <Td align="right" className="hidden whitespace-nowrap sm:table-cell">
                        <span className={cx('text-xs', overdue ? 'font-medium text-danger-fg' : 'text-ink-muted')}>
                          {formatDate(item.dueDate)}
                          {overdue && <span className="sr-only"> (overdue)</span>}
                        </span>
                      </Td>
                    </Tr>
                  );
                })}
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
    </div>
  );
}
