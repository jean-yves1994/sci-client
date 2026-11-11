'use client';

import * as React from 'react';
import {
  Alert, Avatar, Badge, Button, Card, EmptyState, PageHeader, Pagination, StatCard,
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
  const [claimingId, setClaimingId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

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

  const oldest = result?.data[0];

  const claimInspection = async (id: string) => {
    setClaimingId(id);
    setError(null);
    try {
      await api.post(`/inspections/${id}/begin-review`);
      const refreshed = await api.get<Paginated<InspectionListItem>>(`/reviews/queue?page=${page}&pageSize=20`);
      setResult(refreshed);
      setNotice('Inspection claimed. You can now find it under Inspections.');
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review queue"
        description="Unclaimed submitted inspections available for reviewers to claim, oldest first."
      />

      {notice && <Alert tone="success" title={notice} />}

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
          <TableSkeleton rows={7} columns={7} />
        ) : !result || result.data.length === 0 ? (
          <EmptyState
            icon={<IconCheckCircle />}
            title="Nothing is waiting"
            description="There are currently no unclaimed inspections awaiting review."
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
                  <Th align="right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((item) => {
                  return (
                    <Tr key={item.id}>
                      <Td>
                        <span className="font-semibold text-ink">{item.inspectionNumber}</span>
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
                      <Td align="right">
                        <Button
                          size="sm"
                          loading={claimingId === item.id}
                          disabled={claimingId !== null}
                          onClick={() => void claimInspection(item.id)}
                          aria-label={`Claim ${item.inspectionNumber} for review`}
                        >
                          Claim for review
                        </Button>
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
