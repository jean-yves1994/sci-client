'use client';

import * as React from 'react';
import {
  Alert, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader,
  Table, TableSkeleton, Td, Th, Tr,
} from '@/components/ui';
import { IconBuilding, IconPlus } from '@/components/icons';
import { Paginated, api, readableError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface BranchRow {
  id: string; code: string; name: string; addressLine: string | null;
  phone: string | null; status: string;
  division: { id: string; name: string } | null;
  _count: { users: number; inspections: number; properties: number };
}

export default function BranchesPage() {
  const { can } = useAuth();
  const [result, setResult] = React.useState<Paginated<BranchRow> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [form, setForm] = React.useState({
    code: '', name: '', addressLine: '', phone: '', email: '',
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setResult(await api.get<Paginated<BranchRow>>('/branches?page=1&pageSize=100'));
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(null); setNotice(null);
    try {
      await api.post('/branches', {
        code: form.code, name: form.name,
        addressLine: form.addressLine || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
      });
      setNotice(`Branch ${form.code} created.`);
      setShowCreate(false);
      setForm({ code: '', name: '', addressLine: '', phone: '', email: '' });
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
        title="Branches"
        description="The branch network and its workload."
        action={
          can('branches.write') ? (
            <Button icon={<IconPlus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
              Add branch
            </Button>
          ) : undefined
        }
      />

      {error && (
        <Alert tone="danger" title="Something went wrong" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      {notice && <Alert tone="success" title={notice} onDismiss={() => setNotice(null)} />}

      <Card>
        {loading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : !result || result.data.length === 0 ? (
          <EmptyState
            icon={<IconBuilding />}
            title="No branches yet"
            description="Add the first branch to begin registering properties against it."
            action={
              can('branches.write') ? (
                <Button onClick={() => setShowCreate(true)}>Add branch</Button>
              ) : undefined
            }
          />
        ) : (
          <Table label="Branches">
            <thead>
              <tr>
                <Th>Branch</Th>
                <Th className="hidden md:table-cell">Location</Th>
                <Th align="right">Staff</Th>
                <Th align="right" className="hidden sm:table-cell">Properties</Th>
                <Th align="right">Inspections</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((branch) => (
                <Tr key={branch.id}>
                  <Td>
                    <span className="font-semibold text-ink">{branch.code}</span>
                    <span className="mt-0.5 block text-xs text-ink-faint">{branch.name}</span>
                  </Td>
                  <Td className="hidden md:table-cell">
                    <span className="block text-sm">{branch.division?.name ?? '—'}</span>
                    {branch.addressLine && (
                      <span className="mt-0.5 block max-w-[220px] truncate text-xs text-ink-faint">
                        {branch.addressLine}
                      </span>
                    )}
                  </Td>
                  <Td align="right" className="tabular-nums">{branch._count.users}</Td>
                  <Td align="right" className="hidden tabular-nums sm:table-cell">
                    {branch._count.properties}
                  </Td>
                  <Td align="right" className="tabular-nums">{branch._count.inspections}</Td>
                  <Td>
                    <Badge tone={branch.status === 'ACTIVE' ? 'success' : 'neutral'}>
                      {branch.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={showCreate} onClose={() => setShowCreate(false)} title="Add branch"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button form="branch-form" type="submit" loading={busy}>Create branch</Button>
          </>
        }
      >
        <form id="branch-form" onSubmit={create} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code" required hint="Letters, digits and hyphens.">
              <Input required value={form.code} placeholder="KGL-004"
                onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </Field>
            <Field label="Name" required>
              <Input required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
          </div>
          <Field label="Address">
            <Input value={form.addressLine}
              onChange={(e) => setForm({ ...form, addressLine: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone">
              <Input value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
