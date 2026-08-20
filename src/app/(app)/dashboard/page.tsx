'use client';

import Link from 'next/link';
import * as React from 'react';
import { Alert, Avatar, Button, Card, CardHeader, ChartCard, EmptyState, Segmented, Skeleton, StatCard, StatusBadge, Table, Td, Th, Tr, cx } from '@/components/ui';
import { AreaChart, BarChart, CHART_COLOURS, DonutChart, Sparkline } from '@/components/charts';
import { IconAlert, IconCheckCircle, IconClipboard, IconInbox, IconPlus } from '@/components/icons';
import {
  BranchPerformance, Dashboard, InspectionListItem, MonthlyPoint, Paginated,
  api, readableError,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { STATUS_CHART_COLOUR, avatarTone, compactNumber, formatDate, fullName, initials, monthLabel, periodChange, statusLabel, statusTone } from '@/lib/format';

type Range = '6' | '12';

export default function DashboardPage() {
  const { user, can } = useAuth();

  const [summary, setSummary] = React.useState<Dashboard | null>(null);
  const [monthly, setMonthly] = React.useState<MonthlyPoint[] | null>(null);
  const [branches, setBranches] = React.useState<BranchPerformance[] | null>(null);
  const [recent, setRecent] = React.useState<InspectionListItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [range, setRange] = React.useState<Range>('12');

  const canSeeAnalytics = can('analytics.read');

  React.useEffect(() => {
    const controller = new AbortController();

    // Every figure below comes from these existing endpoints. Nothing on this
    // page is synthesised.
    const requests: Array<Promise<unknown>> = [
      api.get<Dashboard>('/analytics/dashboard', controller.signal).then(setSummary),
      api.get<Paginated<InspectionListItem>>('/inspections?page=1&pageSize=6', controller.signal)
        .then((r) => setRecent(r.data)),
    ];

    if (canSeeAnalytics) {
      requests.push(
        api.get<MonthlyPoint[]>(`/analytics/monthly?months=${range}`, controller.signal).then(setMonthly),
        api.get<BranchPerformance[]>('/analytics/by-branch', controller.signal).then(setBranches),
      );
    }

    Promise.all(requests).catch((caught: unknown) => {
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      setError(readableError(caught));
    });

    return () => controller.abort();
  }, [range, canSeeAnalytics]);

  if (error && !summary) {
    return (
      <div className="py-4">
        <Alert
          title="Could not load the dashboard"
          action={<Button size="sm" variant="secondary" onClick={() => window.location.reload()}>Retry</Button>}
        >
          {error}
        </Alert>
      </div>
    );
  }

  const totals = summary?.totals;

  // Derived from the real monthly series; null when there is no prior period to
  // compare against, in which case the card simply omits the indicator.
  const totalTrend = monthly?.map((m) => m.total) ?? [];
  const approvedTrend = monthly?.map((m) => m.approved) ?? [];
  const totalChange = periodChange(totalTrend);
  const approvedChange = periodChange(approvedTrend);

  const decided = (totals?.approved ?? 0) + (totals?.rejected ?? 0);
  const approvalRate = decided > 0 ? Math.round(((totals?.approved ?? 0) / decided) * 100) : null;

  const statusData = (summary?.byStatus ?? [])
    .filter((row) => row.count > 0)
    .map((row) => ({
      label: statusLabel(row.status),
      value: row.count,
      colour: STATUS_CHART_COLOUR[row.status] ?? CHART_COLOURS[1],
    }));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const myTotal =
    (summary?.myWork.assigned ?? 0) +
    (summary?.myWork.inProgress ?? 0) +
    (summary?.myWork.correctionRequested ?? 0);

  return (
    <div className="space-y-5 py-2">
      {/* Context and primary actions */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">
            {greeting}{user ? `, ${user.firstName}` : ''}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {summary
              ? `${totals?.pendingReview ?? 0} inspection${totals?.pendingReview === 1 ? '' : 's'} waiting on a decision across ${totals?.branches ?? 0} branches.`
              : 'Loading your overview…'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {can('reviews.read') && (totals?.pendingReview ?? 0) > 0 && (
            <Link href="/reviews">
              <Button variant="secondary" icon={<IconCheckCircle className="h-4 w-4" />}>
                Review queue
              </Button>
            </Link>
          )}
          {can('inspections.create') && (
            <Link href="/properties">
              <Button icon={<IconPlus className="h-4 w-4" />}>New inspection</Button>
            </Link>
          )}
        </div>
      </div>

      {error && <Alert tone="warning" title="Some data could not be refreshed">{error}</Alert>}

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!summary ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-[132px] rounded-2xl" />)
        ) : (
          <>
            <StatCard
              label="Total inspections"
              value={compactNumber(totals!.inspections)}
              tone="brand"
              icon={<IconClipboard className="h-[18px] w-[18px]" />}
              change={totalChange !== null ? { value: totalChange, label: 'vs. previous month' } : undefined}
              hint={`${totals!.inProgress} currently in the field`}
              sparkline={totalTrend.length > 1 ? <Sparkline values={totalTrend} colour={CHART_COLOURS[1]} /> : undefined}
              href="/inspections"
            />
            <StatCard
              label="Pending review"
              value={compactNumber(totals!.pendingReview)}
              tone="warning"
              icon={<IconInbox className="h-[18px] w-[18px]" />}
              hint={
                summary.averageProcessingHours === null
                  ? 'No decisions recorded yet'
                  : `Averaging ${summary.averageProcessingHours}h to decide`
              }
              href="/reviews"
            />
            <StatCard
              label="Approved"
              value={compactNumber(totals!.approved)}
              tone="success"
              icon={<IconCheckCircle className="h-[18px] w-[18px]" />}
              change={approvedChange !== null ? { value: approvedChange, label: 'vs. previous month' } : undefined}
              hint={approvalRate === null ? 'No decisions yet' : `${approvalRate}% of all decisions`}
              sparkline={approvedTrend.length > 1 ? <Sparkline values={approvedTrend} colour={CHART_COLOURS[2]} /> : undefined}
            />
            <StatCard
              label="Needs correction"
              value={compactNumber(totals!.correctionRequested)}
              tone="accent"
              icon={<IconAlert className="h-[18px] w-[18px]" />}
              hint={`${totals!.rejected} rejected outright`}
            />
          </>
        )}
      </div>

      {/* Charts */}
      {canSeeAnalytics && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartCard
              title="Inspection volume"
              description="Raised against approved, by month."
              loading={!monthly}
              empty={monthly && monthly.every((m) => m.total === 0)
                ? { title: 'No inspections recorded yet', description: 'The trend appears once inspections are raised.' }
                : null}
              action={
                <Segmented<Range>
                  label="Time range"
                  value={range}
                  onChange={setRange}
                  options={[{ value: '6', label: '6M' }, { value: '12', label: '12M' }]}
                />
              }
              footer={
                monthly && monthly.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLOURS[1] }} /> Raised
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLOURS[2] }} /> Approved
                    </span>
                    <span className="ml-auto tabular-nums">
                      {monthly.reduce((sum, m) => sum + m.total, 0)} raised over {monthly.length} months
                    </span>
                  </div>
                ) : undefined
              }
            >
              {monthly && (
                <AreaChart
                  height={272}
                  data={monthly.map((m) => ({ label: monthLabel(m.month), values: [m.total, m.approved] }))}
                  series={[
                    { name: 'Raised', colour: CHART_COLOURS[1] },
                    { name: 'Approved', colour: CHART_COLOURS[2] },
                  ]}
                />
              )}
            </ChartCard>
          </div>

          <ChartCard
            title="By status"
            description="Where every inspection currently sits."
            loading={!summary}
            empty={statusData.length === 0 ? { title: 'Nothing to show yet' } : null}
          >
            <div className="pt-2">
              <DonutChart
                data={statusData}
                centreLabel="Inspections"
                centreValue={String(totals?.inspections ?? 0)}
              />
            </div>
          </ChartCard>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent activity */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent inspections"
            description="The latest activity across your branches."
            action={
              <Link href="/inspections" className="text-xs font-medium text-brand-600 transition-colors hover:text-brand-700">
                View all
              </Link>
            }
          />
          {!recent ? (
            <div className="space-y-3 px-5 pb-5">
              {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-14 rounded-xl" />)}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              icon={<IconClipboard />}
              title="No inspections yet"
              description="Raise the first one from the Properties page and it will appear here."
              action={can('inspections.create') ? (
                <Link href="/properties"><Button size="sm">Go to properties</Button></Link>
              ) : undefined}
            />
          ) : (
            <Table label="Recent inspections">
              <thead>
                <tr>
                  <Th>Inspection</Th>
                  <Th>Property</Th>
                  <Th className="hidden md:table-cell">Inspector</Th>
                  <Th>Status</Th>
                  <Th className="hidden sm:table-cell" align="right">Due</Th>
                </tr>
              </thead>
              <tbody>
                {recent.map((item) => {
                  const overdue =
                    item.dueDate && new Date(item.dueDate) < new Date() &&
                    !['APPROVED', 'REPORT_GENERATED', 'REJECTED', 'ARCHIVED'].includes(item.status);

                  return (
                    <Tr key={item.id}>
                      <Td>
                        <Link href={`/inspections/${item.id}`} className="font-medium text-ink transition-colors hover:text-brand-600">
                          {item.inspectionNumber}
                        </Link>
                        <span className="mt-0.5 block text-2xs text-ink-faint">{item.loanReference}</span>
                      </Td>
                      <Td>
                        <span className="text-sm">{item.property.reference}</span>
                        <span className="mt-0.5 block max-w-[200px] truncate text-2xs text-ink-faint">
                          {item.property.addressLine}
                        </span>
                      </Td>
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
                      <Td>
                        <StatusBadge tone={statusTone(item.status)}>{statusLabel(item.status)}</StatusBadge>
                      </Td>
                      <Td align="right" className="hidden whitespace-nowrap sm:table-cell">
                        <span className={cx('text-xs', overdue ? 'font-medium text-danger-fg' : 'text-ink-muted')}>
                          {formatDate(item.dueDate)}
                        </span>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>

        <div className="space-y-4">
          {/* Personal queue */}
          {can('inspections.write') && summary && (
            <Card>
              <CardHeader title="Your queue" description={`${myTotal} item${myTotal === 1 ? '' : 's'} assigned to you`} />
              <div className="space-y-2 px-5 pb-5">
                <QueueRow label="To start" value={summary.myWork.assigned} tone="neutral" href="/inspections?assignedToMe=true" />
                <QueueRow label="In progress" value={summary.myWork.inProgress} tone="info" />
                <QueueRow label="Needs correction" value={summary.myWork.correctionRequested} tone="accent" />
                <QueueRow label="Awaiting review" value={summary.myWork.submitted} tone="warning" />
              </div>
            </Card>
          )}

          {/* Branch comparison */}
          {canSeeAnalytics && (
            <ChartCard
              title="Volume by branch"
              description="Inspections raised, all time."
              loading={!branches}
              empty={branches && branches.length === 0 ? { title: 'No branches configured' } : null}
            >
              {branches && (
                <BarChart
                  horizontal
                  data={[...branches]
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 6)
                    .map((branch) => ({
                      label: branch.code,
                      value: branch.total,
                      colour: CHART_COLOURS[1],
                    }))}
                />
              )}
            </ChartCard>
          )}

          {summary && (
            <Card>
              <CardHeader title="Coverage" />
              <div className="grid grid-cols-3 gap-2 px-5 pb-5">
                <MiniStat label="Properties" value={totals!.properties} />
                <MiniStat label="Branches" value={totals!.branches} />
                <MiniStat label="Users" value={totals!.activeUsers} />
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function QueueRow({
  label, value, tone, href,
}: {
  label: string;
  value: number;
  tone: 'info' | 'warning' | 'accent' | 'neutral';
  href?: string;
}) {
  const dots = {
    info: 'bg-info-solid', warning: 'bg-warning-solid',
    accent: 'bg-accent-solid', neutral: 'bg-neutral-solid',
  };

  const body = (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3.5 py-2.5 transition-colors hover:bg-surface-3">
      <span className="flex items-center gap-2.5">
        <span className={cx('h-1.5 w-1.5 rounded-full', dots[tone])} aria-hidden />
        <span className="text-sm text-ink-muted">{label}</span>
      </span>
      <span className="text-sm font-semibold tabular-nums text-ink">{value}</span>
    </div>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface-2 px-2 py-3 text-center">
      <p className="text-lg font-semibold tabular-nums text-ink">{value}</p>
      <p className="mt-0.5 text-2xs text-ink-faint">{label}</p>
    </div>
  );
}
