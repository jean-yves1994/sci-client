'use client';

import * as React from 'react';
import {
  Alert, Card, CardHeader, ChartCard, EmptyState, PageHeader, Segmented,
  StatCard, Table, Td, Th, Tr, cx,
} from '@/components/ui';
import { AreaChart, BarChart, CHART_COLOURS, DonutChart } from '@/components/charts';
import { IconChart, IconCheckCircle, IconClipboard, IconClock } from '@/components/icons';
import {
  BranchPerformance, Dashboard, InspectorWorkload, MonthlyPoint, api, readableError,
} from '@/lib/api';
import { STATUS_CHART_COLOUR, compactNumber, monthLabel, periodChange, statusLabel } from '@/lib/format';

type Range = '6' | '12' | '24';

export default function AnalyticsPage() {
  const [dashboard, setDashboard] = React.useState<Dashboard | null>(null);
  const [monthly, setMonthly] = React.useState<MonthlyPoint[] | null>(null);
  const [byBranch, setByBranch] = React.useState<BranchPerformance[] | null>(null);
  const [byInspector, setByInspector] = React.useState<InspectorWorkload[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [range, setRange] = React.useState<Range>('12');

  // The dashboard summary and the breakdowns never change together, so they are
  // fetched once; only the trend series refetches when the range changes.
  React.useEffect(() => {
    Promise.all([
      api.get<Dashboard>('/analytics/dashboard'),
      api.get<BranchPerformance[]>('/analytics/by-branch'),
      api.get<InspectorWorkload[]>('/analytics/by-inspector'),
    ])
      .then(([summary, branches, inspectors]) => {
        setDashboard(summary);
        setByBranch(branches);
        setByInspector(inspectors);
      })
      .catch((caught: unknown) => setError(readableError(caught)));
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setMonthly(null);

    api.get<MonthlyPoint[]>(`/analytics/monthly?months=${range}`)
      .then((points) => { if (!cancelled) setMonthly(points); })
      .catch((caught: unknown) => { if (!cancelled) setError(readableError(caught)); });

    return () => { cancelled = true; };
  }, [range]);

  if (error) return <Alert tone="danger" title="Could not load analytics">{error}</Alert>;

  const trend = (monthly ?? []).map((point) => ({
    label: monthLabel(point.month),
    values: [point.total, point.approved],
  }));

  const hasTrend = (monthly ?? []).some((point) => point.total > 0);

  // Approval rate is only meaningful once something has actually been decided;
  // 0% and "nothing decided yet" are different statements.
  const decided = dashboard ? dashboard.totals.approved + dashboard.totals.rejected : 0;
  const approvalRate = decided > 0 && dashboard
    ? Math.round((dashboard.totals.approved / decided) * 100)
    : null;

  // periodChange returns null when there is no honest comparison to draw —
  // a single data point, or a previous period of zero.
  const rawChange = monthly ? periodChange(monthly.map((p) => p.total)) : null;
  const volumeChange = rawChange === null
    ? undefined
    : { value: rawChange, label: 'vs previous month' };

  const statusData = (dashboard?.byStatus ?? [])
    .filter((row) => row.count > 0)
    .map((row) => ({
      label: statusLabel(row.status),
      value: row.count,
      colour: STATUS_CHART_COLOUR[row.status] ?? CHART_COLOURS[6],
    }));

  const branchBars = (byBranch ?? [])
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .map((row) => ({
      label: row.code,
      value: row.total,
      secondary: row.approved,
      colour: CHART_COLOURS[1],
    }));

  const workload = (byInspector ?? [])
    .filter((row) => row.total > 0 || row.open > 0)
    .sort((a, b) => b.open - a.open)
    .slice(0, 8)
    .map((row) => ({
      label: row.name.split(' ')[0],
      value: row.open,
      secondary: row.approved,
      colour: CHART_COLOURS[3],
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Every figure is aggregated from recorded inspections. Nothing here is illustrative."
        action={
          <Segmented<Range>
            value={range}
            onChange={setRange}
            options={[
              { value: '6', label: '6M' },
              { value: '12', label: '12M' },
              { value: '24', label: '24M' },
            ]}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total inspections"
          value={dashboard ? compactNumber(dashboard.totals.inspections) : '—'}
          icon={<IconClipboard />}
          tone="brand"
          hint={dashboard ? `${dashboard.totals.inProgress} in the field` : undefined}
          change={volumeChange}
        />
        <StatCard
          label="Approval rate"
          value={approvalRate === null ? '—' : `${approvalRate}%`}
          icon={<IconCheckCircle />}
          tone="success"
          hint={
            approvalRate === null
              ? 'No decisions recorded yet'
              : `${decided} decision${decided === 1 ? '' : 's'} made`
          }
        />
        <StatCard
          label="Awaiting review"
          value={dashboard ? compactNumber(dashboard.totals.pendingReview) : '—'}
          icon={<IconClock />}
          tone="warning"
          hint={
            dashboard?.averageProcessingHours == null
              ? 'No turnaround recorded yet'
              : `Averaging ${dashboard.averageProcessingHours}h to decide`
          }
        />
        <StatCard
          label="Coverage"
          value={dashboard ? compactNumber(dashboard.totals.properties) : '—'}
          icon={<IconChart />}
          tone="info"
          hint={
            dashboard
              ? `${dashboard.totals.branches} branches · ${dashboard.totals.activeUsers} active users`
              : undefined
          }
        />
      </div>

      <ChartCard
        title="Inspection volume"
        description={`Raised versus approved, last ${range} months`}
        loading={monthly === null}
        empty={
          monthly !== null && !hasTrend
            ? {
                title: 'No inspections in this period',
                description: 'The trend will populate as inspections are raised.',
              }
            : null
        }
      >
        <AreaChart
          data={trend}
          height={280}
          series={[
            { name: 'Raised', colour: CHART_COLOURS[1] },
            { name: 'Approved', colour: CHART_COLOURS[2] },
          ]}
        />
      </ChartCard>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-2">
        <ChartCard
          title="Current status mix"
          description="Where every open and closed inspection sits right now"
          loading={dashboard === null}
          empty={
            dashboard !== null && statusData.length === 0
              ? { title: 'Nothing recorded yet' }
              : null
          }
        >
          <div className="flex flex-col items-center gap-5">
            <DonutChart
              data={statusData}
              centreLabel="Total"
              centreValue={compactNumber(dashboard?.totals.inspections ?? 0)}
            />
            <ul className="w-full space-y-2">
              {statusData.map((row) => (
                <li key={row.label} className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: row.colour }}
                    />
                    <span className="truncate text-sm text-ink-muted">{row.label}</span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-ink">{row.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </ChartCard>
        </div>

        <div className="lg:col-span-3">
        <ChartCard
          title="Branch volume"
          description="Inspections raised, with approved shown behind"
          loading={byBranch === null}
          empty={
            byBranch !== null && branchBars.length === 0
              ? {
                  title: 'No branch activity yet',
                  description: 'Branches appear here once inspections are raised against them.',
                }
              : null
          }
        >
          <BarChart data={branchBars} height={280} />
        </ChartCard>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Branch performance"
          description="Approval rate is shown only where decisions have actually been made."
        />
        {byBranch === null ? (
          <div className="px-6 pb-6"><div className="h-40 animate-pulse rounded-xl bg-surface-2" /></div>
        ) : byBranch.length === 0 ? (
          <EmptyState icon={<IconChart />} title="No branches configured" />
        ) : (
          <Table label="Branch performance">
            <thead>
              <tr>
                <Th>Branch</Th>
                <Th align="right">Total</Th>
                <Th align="right">Approved</Th>
                <Th align="right" className="hidden sm:table-cell">Rejected</Th>
                <Th>Approval rate</Th>
              </tr>
            </thead>
            <tbody>
              {byBranch.map((row) => (
                <Tr key={row.branchId}>
                  <Td>
                    <span className="font-semibold text-ink">{row.code}</span>
                    <span className="mt-0.5 block text-xs text-ink-faint">{row.name}</span>
                  </Td>
                  <Td align="right" className="tabular-nums">{row.total}</Td>
                  <Td align="right" className="tabular-nums text-success-fg">{row.approved}</Td>
                  <Td align="right" className="hidden tabular-nums text-danger-fg sm:table-cell">
                    {row.rejected}
                  </Td>
                  <Td>
                    {row.approvalRate === null ? (
                      <span className="text-xs text-ink-faint">No decisions yet</span>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-3">
                          <div
                            className="h-full rounded-full bg-success-solid transition-all duration-500"
                            style={{ width: `${row.approvalRate}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold tabular-nums text-ink">
                          {row.approvalRate}%
                        </span>
                      </div>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-2">
        <ChartCard
          title="Inspector workload"
          description="Open items, with approved shown behind"
          loading={byInspector === null}
          empty={
            byInspector !== null && workload.length === 0
              ? { title: 'No inspector activity yet' }
              : null
          }
        >
          <BarChart data={workload} height={260} horizontal />
        </ChartCard>
        </div>

        <Card className="lg:col-span-3">
          <CardHeader
            title="Inspector activity"
            description="Volume and open items, for balancing assignment. Not a performance ranking."
          />
          {byInspector === null ? (
            <div className="px-6 pb-6"><div className="h-40 animate-pulse rounded-xl bg-surface-2" /></div>
          ) : byInspector.length === 0 ? (
            <EmptyState icon={<IconChart />} title="No inspectors configured" />
          ) : (
            <Table label="Inspector activity">
              <thead>
                <tr>
                  <Th>Inspector</Th>
                  <Th className="hidden sm:table-cell">Branch</Th>
                  <Th align="right">Total</Th>
                  <Th align="right">Approved</Th>
                  <Th align="right">Open</Th>
                </tr>
              </thead>
              <tbody>
                {byInspector.map((row) => (
                  <Tr key={row.inspectorId}>
                    <Td className="font-medium text-ink">{row.name}</Td>
                    <Td className="hidden text-xs text-ink-muted sm:table-cell">
                      {row.branch ?? '—'}
                    </Td>
                    <Td align="right" className="tabular-nums">{row.total}</Td>
                    <Td align="right" className="tabular-nums text-success-fg">{row.approved}</Td>
                    <Td align="right">
                      <span
                        className={cx(
                          'inline-flex min-w-6 justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                          row.open > 0 ? 'bg-brand-50 text-brand-700' : 'text-ink-faint',
                        )}
                      >
                        {row.open}
                      </span>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
