'use client';

import Link from 'next/link';
import * as React from 'react';
import {
  Alert, Avatar, Badge, Card, EmptyState, PageHeader, Pagination, StatCard,
  StatusBadge, Table, TableSkeleton, Td, Th, Tr,
} from '@/components/ui';
import { IconCheckCircle, IconClock, IconInbox } from '@/components/icons';
import { Dashboard, InspectionListItem, Paginated, api, readableError } from '@/lib/api';
import {
  avatarTone, compactNumber, formatDateTime, fullName, humanise, initials,
  priorityTone, statusLabel, statusTone, timeAgo,
} from '@/lib/format';

export default function ReviewQueuePage() {
  const [result, setResult] = React.useState<Paginated<InspectionListItem> | null>(null);
  const [summary, setSummary] = React.useState<Dashboard | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    api.get<Dashboard>('/analytics/dashboard').then(setSummary).catch(() => undefined);
  }, []);

  React.useEffect(() => {
    setLoading(true);
    api.get<Paginated<InspectionListItem>>(`/reviews/queue?page=${page}&pageSize=20`)
      .then(setResult)
      .catch((caught: unknown) => setError(readableError(caught)))
      .finally(() => setLoading(false));
  }, [page]);

  // Oldest submission first is the server's ordering, so the top of the list is
  // the item that has been waiting longest.
  const oldest = result?.data[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review queue"
        description="Submitted inspections awaiting a decision, oldest first."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Awaiting decision"
          value={result ? compactNumber(result.meta.total) : '—'}
          icon={<IconInbox />}
          tone="warning"
        />
        <StatCard
          label="Longest waiting"
          value={oldest?.submittedAt ? timeAgo(oldest.submittedAt) : '—'}
          icon={<IconClock />}
          tone="neutral"
          hint={oldest ? oldest.inspectionNumber : 'Nothing in the queue'}
        />
        <StatCard
          label="Average turnaround"
          value={
            summary?.averageProcessingHours == null
              ? '—'
              : `${summary.averageProcessingHours}h`
          }
          icon={<IconCheckCircle />}
          tone="success"
          hint="Submission to decision"
        />
      </div>

      {error && <Alert tone="danger" title="Could not load the review queue">{error}</Alert>}

      <Card>
        {loading ? (
          <TableSkeleton rows={7} columns={6} />
        ) : !result || result.data.length === 0 ? (
          <EmptyState
            icon={<IconCheckCircle />}
            title="Nothing is waiting"
            description="Every submitted inspection has been dealt with."
          />
        ) : (
          <>
            <Table label="Review queue">
              <thead>
                <tr>
                  <Th>Inspection</Th>
                  <Th>Property</Th>
                  <Th className="hidden lg:table-cell">Branch</Th>
                  <Th className="hidden md:table-cell">Inspector</Th>
                  <Th>Waiting</Th>
                  <Th className="hidden sm:table-cell">Priority</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((item) => (
                  <Tr key={item.id}>
                    <Td>
                      <Link
                        href={`/inspections/${item.id}`}
                        className="font-semibold text-ink transition-colors hover:text-brand-600"
                      >
                        {item.inspectionNumber}
                      </Link>
                      <span className="mt-0.5 block text-xs text-ink-faint">
                        {item.loanReference}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-medium">{item.property.reference}</span>
                      <span className="mt-0.5 block max-w-[220px] truncate text-xs text-ink-faint">
                        {item.property.addressLine}
                      </span>
                    </Td>
                    <Td className="hidden text-sm text-ink-muted lg:table-cell">
                      {item.branch.code}
                    </Td>
                    <Td className="hidden md:table-cell">
                      {item.inspector ? (
                        <span className="flex items-center gap-2">
                          <Avatar
                            size="sm"
                            name={initials(item.inspector)}
                            tone={avatarTone(item.inspector.id)}
                          />
                          <span className="text-sm">{fullName(item.inspector)}</span>
                        </span>
                      ) : (
                        <span className="text-sm text-ink-faint">—</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap">
                      <span className="text-sm font-medium text-ink">
                        {item.submittedAt ? timeAgo(item.submittedAt) : '—'}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-faint">
                        {formatDateTime(item.submittedAt)}
                      </span>
                    </Td>
                    <Td className="hidden sm:table-cell">
                      <Badge tone={priorityTone(item.priority)}>{humanise(item.priority)}</Badge>
                    </Td>
                    <Td>
                      <StatusBadge tone={statusTone(item.status)}>
                        {statusLabel(item.status)}
                      </StatusBadge>
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
