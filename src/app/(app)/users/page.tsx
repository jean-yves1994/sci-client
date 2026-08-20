'use client';

import * as React from 'react';
import {
  Alert, Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader,
  Pagination, SearchInput, Select, Table, TableSkeleton, Td, Th, Tr,
} from '@/components/ui';
import { IconPlus, IconUsers } from '@/components/icons';
import { BranchRef, Paginated, api, readableError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { avatarTone, formatDateTime, humanise, initials } from '@/lib/format';
import type { Tone } from '@/components/ui';

interface UserRow {
  id: string; email: string; firstName: string; lastName: string; phone: string | null;
  status: string; branchScope: string; lastLoginAt: string | null; lockedUntil: string | null;
  branch: BranchRef | null;
  userRoles: Array<{ role: { id: string; code: string; name: string } }>;
}

const STATUS_TONES: Record<string, Tone> = {
  ACTIVE: 'success', PENDING_ACTIVATION: 'warning', SUSPENDED: 'warning', DISABLED: 'neutral',
};

export default function UsersPage() {
  const { can, user: currentUser } = useAuth();
  const [result, setResult] = React.useState<Paginated<UserRow> | null>(null);
  const [branches, setBranches] = React.useState<BranchRef[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [showCreate, setShowCreate] = React.useState(false);
  const [resetFor, setResetFor] = React.useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = React.useState('');

  const [form, setForm] = React.useState({
    email: '', firstName: '', lastName: '', password: '', phone: '',
    employeeNumber: '', branchId: '', roleCode: 'INSPECTOR', branchScope: 'OWN_BRANCH',
  });

  const [debounced, setDebounced] = React.useState('');
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  React.useEffect(() => { setPage(1); }, [debounced, roleFilter]);

  const load = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (debounced.trim()) params.set('search', debounced.trim());
    if (roleFilter) params.set('roleCode', roleFilter);
    try {
      setResult(await api.get<Paginated<UserRow>>(`/users?${params}`));
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setLoading(false);
    }
  }, [page, debounced, roleFilter]);

  React.useEffect(() => { void load(); }, [load]);

  React.useEffect(() => {
    api.get<Paginated<BranchRef>>('/branches?page=1&pageSize=100')
      .then((r) => setBranches(r.data)).catch(() => setBranches([]));
  }, []);

  const act = async (work: () => Promise<unknown>, success: string) => {
    setBusy(true); setError(null); setNotice(null);
    try {
      await work();
      await load();
      setNotice(success);
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
    }
  };

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(null); setNotice(null);
    try {
      await api.post('/users', {
        email: form.email, firstName: form.firstName, lastName: form.lastName,
        password: form.password, phone: form.phone || undefined,
        employeeNumber: form.employeeNumber || undefined,
        branchId: form.branchId || undefined, branchScope: form.branchScope,
        roleCodes: [form.roleCode],
      });
      setNotice(`${form.email} created. They must set their own password at first sign-in.`);
      setShowCreate(false);
      setForm({
        email: '', firstName: '', lastName: '', password: '', phone: '',
        employeeNumber: '', branchId: '', roleCode: 'INSPECTOR', branchScope: 'OWN_BRANCH',
      });
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
        title="Users"
        description="Accounts, roles and data access."
        action={
          can('users.write') ? (
            <Button icon={<IconPlus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
              Add user
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

      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="min-w-[240px] flex-1">
            <SearchInput
              placeholder="Search name, email or employee number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search users"
            />
          </div>
          <Select
            className="w-auto min-w-[170px]"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filter by role"
          >
            <option value="">All roles</option>
            <option value="ADMINISTRATOR">Administrator</option>
            <option value="REVIEWER">Reviewer</option>
            <option value="INSPECTOR">Inspector</option>
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : !result || result.data.length === 0 ? (
          <EmptyState icon={<IconUsers />} title="No users found" />
        ) : (
          <>
            <Table label="Users">
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th className="hidden sm:table-cell">Role</Th>
                  <Th className="hidden lg:table-cell">Branch</Th>
                  <Th className="hidden xl:table-cell">Data access</Th>
                  <Th className="hidden md:table-cell">Last sign-in</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((person) => {
                  const locked = person.lockedUntil && new Date(person.lockedUntil) > new Date();
                  return (
                    <Tr key={person.id}>
                      <Td>
                        <span className="flex items-center gap-2.5">
                          <Avatar
                            size="sm" name={initials(person)} tone={avatarTone(person.email)}
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-ink">
                              {person.firstName} {person.lastName}
                            </span>
                            <span className="block truncate text-xs text-ink-faint">
                              {person.email}
                            </span>
                          </span>
                        </span>
                      </Td>
                      <Td className="hidden text-sm sm:table-cell">
                        {person.userRoles.map((r) => r.role.name).join(', ') || '—'}
                      </Td>
                      <Td className="hidden text-sm text-ink-muted lg:table-cell">
                        {person.branch?.code ?? '—'}
                      </Td>
                      <Td className="hidden text-xs text-ink-muted xl:table-cell">
                        {person.branchScope === 'ALL_BRANCHES' ? 'All branches' : 'Own branch'}
                      </Td>
                      <Td className="hidden whitespace-nowrap text-sm text-ink-muted md:table-cell">
                        {formatDateTime(person.lastLoginAt)}
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge tone={STATUS_TONES[person.status] ?? 'neutral'}>
                            {humanise(person.status)}
                          </Badge>
                          {locked && <Badge tone="danger">Locked</Badge>}
                        </div>
                      </Td>
                      <Td align="right">
                        <div className="flex justify-end gap-1">
                          {locked && can('users.write') && (
                            <Button
                              size="sm" variant="ghost" disabled={busy}
                              onClick={() => void act(
                                () => api.post(`/users/${person.id}/unlock`), 'Account unlocked.',
                              )}
                            >
                              Unlock
                            </Button>
                          )}
                          {can('users.reset_password') && (
                            <Button size="sm" variant="ghost" onClick={() => setResetFor(person)}>
                              Reset
                            </Button>
                          )}
                          {/* Suspending your own account would lock you out of
                              the system you are administering. */}
                          {can('users.write') && person.id !== currentUser?.id && (
                            <Button
                              size="sm" variant="ghost" disabled={busy}
                              onClick={() => void act(
                                () => api.patch(`/users/${person.id}`, {
                                  status: person.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                                }),
                                person.status === 'ACTIVE'
                                  ? 'Account suspended.'
                                  : 'Account reactivated.',
                              )}
                            >
                              {person.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                            </Button>
                          )}
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

      <Modal
        open={showCreate} onClose={() => setShowCreate(false)} title="Add user" width="lg"
        description="The user must replace this password at first sign-in."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button form="user-form" type="submit" loading={busy}>Create user</Button>
          </>
        }
      >
        <form id="user-form" onSubmit={createUser} className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" required>
            <Input required value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </Field>
          <Field label="Last name" required>
            <Input required value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </Field>
          <Field label="Email" required>
            <Input type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field
            label="Temporary password" required
            hint="At least 12 characters, with upper, lower and a digit."
          >
            <Input required minLength={12} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Employee number">
            <Input value={form.employeeNumber}
              onChange={(e) => setForm({ ...form, employeeNumber: e.target.value })} />
          </Field>
          <Field label="Role" required>
            <Select value={form.roleCode}
              onChange={(e) => setForm({ ...form, roleCode: e.target.value })}>
              <option value="INSPECTOR">Inspector</option>
              <option value="REVIEWER">Reviewer</option>
              <option value="ADMINISTRATOR">Administrator</option>
            </Select>
          </Field>
          <Field label="Branch">
            <Select value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
              <option value="">No branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field
              label="Data access"
              hint="Whether this user sees only their own branch, or every branch."
            >
              <Select value={form.branchScope}
                onChange={(e) => setForm({ ...form, branchScope: e.target.value })}>
                <option value="OWN_BRANCH">Own branch only</option>
                <option value="ALL_BRANCHES">All branches</option>
              </Select>
            </Field>
          </div>
        </form>
      </Modal>

      <Modal
        open={resetFor !== null}
        onClose={() => { setResetFor(null); setNewPassword(''); }}
        title="Reset password"
        description={
          resetFor ? `${resetFor.firstName} ${resetFor.lastName} — ${resetFor.email}` : undefined
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => { setResetFor(null); setNewPassword(''); }}
            >
              Cancel
            </Button>
            <Button
              loading={busy} disabled={newPassword.length < 12}
              onClick={() => {
                const target = resetFor;
                if (!target) return;
                void act(
                  () => api.post(`/users/${target.id}/reset-password`, { newPassword }),
                  'Password reset. Every session for that account has been ended.',
                ).then(() => { setResetFor(null); setNewPassword(''); });
              }}
            >
              Reset password
            </Button>
          </>
        }
      >
        <Field
          label="New temporary password" required
          hint="The user must change it at next sign-in, and all their sessions end immediately."
        >
          <Input value={newPassword} minLength={12}
            onChange={(e) => setNewPassword(e.target.value)} />
        </Field>
      </Modal>
    </div>
  );
}
