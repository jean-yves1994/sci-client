'use client';

import * as React from 'react';
import {
  Alert, Avatar, Card, EmptyState, Input, PageHeader, Pagination, SearchInput,
  Select, Table, TableSkeleton, Td, Th, Tr,
} from '@/components/ui';
import { IconShield } from '@/components/icons';
import { Paginated, api, readableError } from '@/lib/api';
import { avatarTone, formatDateTime, humanise, initials } from '@/lib/format';

interface AuditRow {
  id: string; action: string; entityType: string; entityId: string | null;
  ipAddress: string | null; userAgent: string | null; createdAt: string;
  metadata: Record<string, unknown> | null;
  user: { firstName: string; lastName: string; email: string } | null;
}

const ENTITY_TYPES = [
  '', 'Inspection', 'User', 'Branch', 'Property', 'Report', 'Session', 'InspectionPhoto',
];

export default function AuditPage() {
  const [result, setResult] = React.useState<Paginated<AuditRow> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [entityType, setEntityType] = React.useState('');
  const [action, setAction] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [page, setPage] = React.useState(1);

  const [debouncedAction, setDebouncedAction] = React.useState('');
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedAction(action), 300);
    return () => clearTimeout(timer);
  }, [action]);

  React.useEffect(() => { setPage(1); }, [entityType, debouncedAction, from, to]);

  React.useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '50' });
    if (entityType) params.set('entityType', entityType);
    if (debouncedAction.trim()) params.set('action', debouncedAction.trim());
    if (from) params.set('from', new Date(from).toISOString());
    if (to) params.set('to', new Date(to).toISOString());

    api.get<Paginated<AuditRow>>(`/audit-logs?${params}`)
      .then(setResult)
      .catch((caught: unknown) => setError(readableError(caught)))
      .finally(() => setLoading(false));
  }, [page, entityType, debouncedAction, from, to]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit trail"
        description={`Append-only record of every sensitive action.${
          result ? ` ${result.meta.total.toLocaleString()} entries.` : ''
        }`}
      />

      {error && <Alert tone="danger" title="Could not load the audit trail">{error}</Alert>}

      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-4">
          <Select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            aria-label="Filter by entity type"
          >
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>{t || 'All entity types'}</option>
            ))}
          </Select>
          <SearchInput
            placeholder="Action, e.g. INSPECTION_APPROVE"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            aria-label="Filter by action"
          />
          <Input
            type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date"
          />
          <Input
            type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date"
          />
        </div>
      </Card>

      <Card>
        {loading ? (
          <TableSkeleton rows={9} columns={5} />
        ) : !result || result.data.length === 0 ? (
          <EmptyState
            icon={<IconShield />}
            title="Nothing recorded for those filters"
            description="Try widening the date range or clearing the action filter."
          />
        ) : (
          <>
            <Table label="Audit trail">
              <thead>
                <tr>
                  <Th>When</Th>
                  <Th>Action</Th>
                  <Th className="hidden sm:table-cell">Entity</Th>
                  <Th>By</Th>
                  <Th className="hidden lg:table-cell">Source</Th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((row) => (
                  <Tr key={row.id}>
                    <Td className="whitespace-nowrap text-sm text-ink-muted">
                      {formatDateTime(row.createdAt)}
                    </Td>
                    <Td>
                      <code className="rounded-md bg-surface-3 px-2 py-1 text-[11px] font-medium text-ink">
                        {row.action}
                      </code>
                      {typeof row.metadata?.reason === 'string' && (
                        <span className="mt-1 block max-w-[300px] truncate text-xs text-ink-faint">
                          {row.metadata.reason}
                        </span>
                      )}
                    </Td>
                    <Td className="hidden text-sm text-ink-muted sm:table-cell">
                      {humanise(row.entityType)}
                    </Td>
                    <Td>
                      {row.user ? (
                        <span className="flex items-center gap-2">
                          <Avatar
                            size="sm" name={initials(row.user)} tone={avatarTone(row.user.email)}
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-ink">
                              {row.user.firstName} {row.user.lastName}
                            </span>
                            <span className="block truncate text-xs text-ink-faint">
                              {row.user.email}
                            </span>
                          </span>
                        </span>
                      ) : (
                        <span className="text-sm text-ink-faint">System</span>
                      )}
                    </Td>
                    <Td className="hidden text-xs text-ink-faint lg:table-cell">
                      {row.ipAddress ?? '—'}
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
    </div>
  );
}
