'use client';

import Link from 'next/link';
import * as React from 'react';
import {
  Alert, Badge, Button, Card, EmptyState, PageHeader, Pagination, Segmented, Skeleton, cx,
} from '@/components/ui';
import { IconBell } from '@/components/icons';
import { Paginated, api, readableError } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import type { Tone } from '@/components/ui';

interface NotificationRow {
  id: string; type: string; title: string; message: string;
  entityType: string | null; entityId: string | null;
  readAt: string | null; createdAt: string;
}

const TYPE_TONE: Record<string, Tone> = {
  INSPECTION_APPROVED: 'success', INSPECTION_REJECTED: 'danger',
  CORRECTION_REQUESTED: 'accent', REPORT_READY: 'brand',
  ASSIGNMENT_CREATED: 'neutral', ASSIGNMENT_CHANGED: 'neutral',
  INSPECTION_SUBMITTED: 'warning', SYSTEM_ALERT: 'info',
};

type Filter = 'all' | 'unread';

export default function NotificationsPage() {
  const [result, setResult] = React.useState<Paginated<NotificationRow> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<Filter>('all');
  const [page, setPage] = React.useState(1);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: '30' });
    if (filter === 'unread') params.set('unreadOnly', 'true');
    try {
      setResult(await api.get<Paginated<NotificationRow>>(`/notifications?${params}`));
    } catch (caught) {
      setError(readableError(caught));
    }
  }, [page, filter]);

  React.useEffect(() => { void load(); }, [load]);

  const markAllRead = async () => {
    setBusy(true);
    try {
      await api.post('/notifications/read-all');
      await load();
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
    }
  };

  // Opening a notification marks it read: an unread badge that survives being
  // read is noise people quickly learn to ignore.
  const openAndMark = async (notification: NotificationRow) => {
    if (!notification.readAt) {
      await api.post('/notifications/read', { ids: [notification.id] }).catch(() => undefined);
    }
  };

  if (error) return <Alert tone="danger" title="Could not load notifications">{error}</Alert>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Assignments, decisions and reports."
        action={
          <div className="flex items-center gap-2.5">
            <Segmented<Filter>
              value={filter}
              onChange={(value) => { setPage(1); setFilter(value); }}
              options={[{ value: 'all', label: 'All' }, { value: 'unread', label: 'Unread' }]}
            />
            <Button size="sm" variant="secondary" loading={busy} onClick={() => void markAllRead()}>
              Mark all read
            </Button>
          </div>
        }
      />

      <Card>
        {!result ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : result.data.length === 0 ? (
          <EmptyState
            icon={<IconBell />}
            title={filter === 'unread' ? 'Nothing unread' : 'No notifications'}
            description="You will be told here when work is assigned or a decision is made."
          />
        ) : (
          <>
            <ul className="divide-y divide-line">
              {result.data.map((notification) => {
                const body = (
                  <div
                    className={cx(
                      'flex gap-3.5 px-6 py-4 transition-colors',
                      !notification.readAt && 'bg-brand-50/60',
                    )}
                  >
                    <span
                      className={cx(
                        'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                        notification.readAt ? 'bg-transparent' : 'bg-brand-600',
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-ink">{notification.title}</p>
                        <Badge tone={TYPE_TONE[notification.type] ?? 'neutral'}>
                          {notification.type.replace(/_/g, ' ').toLowerCase()}
                        </Badge>
                        {!notification.readAt && <span className="sr-only">Unread</span>}
                      </div>
                      <p className="mt-1 text-sm text-ink-muted">{notification.message}</p>
                      <p className="mt-1.5 text-xs text-ink-faint">
                        {timeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                );

                return (
                  <li key={notification.id}>
                    {notification.entityType === 'Inspection' && notification.entityId ? (
                      <Link
                        href={`/inspections/${notification.entityId}`}
                        onClick={() => void openAndMark(notification)}
                        className="block hover:bg-surface-2"
                      >
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ul>
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
