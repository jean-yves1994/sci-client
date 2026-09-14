'use client';

import Link from 'next/link';
import * as React from 'react';
import {
  Alert, Badge, Button, Card, EmptyState, PageHeader, Pagination, SearchInput,
  Table, TableSkeleton, Td, Th, Tr,
} from '@/components/ui';
import { IconDownload, IconFile } from '@/components/icons';
import { Paginated, api, readableError } from '@/lib/api';
import { formatDate, fullName } from '@/lib/format';

interface ReportRow {
  id: string; reportNumber: string; version: number; generatedAt: string; sizeBytes: number;
  inspection: {
    id: string; inspectionNumber: string; loanReference: string;
    property: { reference: string; addressLine: string };
    inspector: { firstName: string; lastName: string } | null;
    reviewer: { firstName: string; lastName: string } | null;
  };
  generatedBy: { firstName: string; lastName: string };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isDraftReport(reportNumber: string): boolean {
  return reportNumber.startsWith('DRF-');
}

export default function ReportsPage() {
  const [result, setResult] = React.useState<Paginated<ReportRow> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);

  const [debounced, setDebounced] = React.useState('');
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  React.useEffect(() => { setPage(1); }, [debounced]);

  React.useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (debounced.trim()) params.set('search', debounced.trim());

    api.get<Paginated<ReportRow>>(`/reports?${params}`)
      .then(setResult)
      .catch((caught: unknown) => setError(readableError(caught)))
      .finally(() => setLoading(false));
  }, [page, debounced]);

  const open = async (reportId: string, disposition: 'inline' | 'attachment') => {
    try {
      const { url } = await api.get<{ url: string }>(
        `/reports/${reportId}/download?disposition=${disposition}`,
      );
      window.open(url, '_blank', 'noopener');
    } catch (caught) {
      setError(readableError(caught));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Draft reports are available for reviewer assessment after submission. Final reports are created after approval."
      />

      {error && (
        <Alert tone="danger" title="Something went wrong" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card className="p-4">
        <SearchInput
          placeholder="Search report number, inspection number or loan reference"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search reports"
        />
      </Card>

      <Card>
        {loading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : !result || result.data.length === 0 ? (
          <EmptyState
            icon={<IconFile />}
            title={debounced ? 'No reports match that search' : 'No reports yet'}
            description={
              debounced
                ? 'Try a different reference.'
                : 'A draft report appears when an inspection is submitted for review.'
            }
          />
        ) : (
          <>
            <Table label="Inspection reports">
              <thead>
                <tr>
                  <Th>Report</Th>
                  <Th>Type</Th>
                  <Th>Property</Th>
                  <Th className="hidden md:table-cell">Inspector</Th>
                  <Th className="hidden lg:table-cell">Reviewer</Th>
                  <Th className="hidden sm:table-cell">Generated</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((report) => {
                  const draft = isDraftReport(report.reportNumber);
                  return (
                    <Tr key={report.id}>
                      <Td>
                        <span className="font-semibold text-ink">{report.reportNumber}</span>
                        <span className="mt-0.5 block text-xs text-ink-faint">
                          v{report.version} · {formatBytes(report.sizeBytes)} ·{' '}
                          <Link
                            href={`/inspections/${report.inspection.id}`}
                            className="text-brand-600 hover:underline"
                          >
                            {report.inspection.inspectionNumber}
                          </Link>
                        </span>
                      </Td>
                      <Td>
                        <Badge tone={draft ? 'warning' : 'success'}>
                          {draft ? 'Draft' : 'Final'}
                        </Badge>
                      </Td>
                      <Td>
                        <span className="font-medium">{report.inspection.property.reference}</span>
                        <span className="mt-0.5 block max-w-[220px] truncate text-xs text-ink-faint">
                          {report.inspection.property.addressLine}
                        </span>
                      </Td>
                      <Td className="hidden text-sm md:table-cell">
                        {fullName(report.inspection.inspector)}
                      </Td>
                      <Td className="hidden text-sm lg:table-cell">
                        {fullName(report.inspection.reviewer)}
                      </Td>
                      <Td className="hidden whitespace-nowrap text-sm text-ink-muted sm:table-cell">
                        {formatDate(report.generatedAt)}
                      </Td>
                      <Td align="right">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => void open(report.id, 'inline')}>
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<IconDownload className="h-3.5 w-3.5" />}
                            onClick={() => void open(report.id, 'attachment')}
                          >
                            Download
                          </Button>
                        </div>
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
