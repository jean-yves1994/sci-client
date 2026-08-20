'use client';

import { useSearchParams } from 'next/navigation';
import * as React from 'react';
import {
  Alert, Avatar, Button, Card, CardHeader, Field, Input, PageHeader,
} from '@/components/ui';
import { api, readableError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { avatarTone, initials } from '@/lib/format';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const searchParams = useSearchParams();
  const mustChange = searchParams.get('changePassword') === '1' || user?.mustChangePassword;

  const [current, setCurrent] = React.useState('');
  const [next, setNext] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    // Checked here purely for a faster correction; the server enforces the
    // policy itself and remains the authority.
    if (next !== confirm) {
      setError('The new password and its confirmation do not match.');
      return;
    }

    setBusy(true);
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: next });
      setNotice('Your password has been changed. Other devices have been signed out.');
      setCurrent(''); setNext(''); setConfirm('');
      await refreshUser();
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Your profile" description="Account details and password." />

      {mustChange && (
        <Alert tone="warning" title="Choose your own password">
          This password was set by an administrator. Replace it with one only you know.
        </Alert>
      )}

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Avatar size="lg" name={initials(user)} tone={avatarTone(user.email)} />
          <div className="min-w-0">
            <p className="text-lg font-semibold tracking-tight text-ink">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-sm text-ink-muted">{user.email}</p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-line pt-5 text-sm sm:grid-cols-2">
          <Row label="Roles" value={user.roles.join(', ') || '—'} />
          <Row
            label="Data access"
            value={user.branchScope === 'ALL_BRANCHES' ? 'All branches' : 'Own branch only'}
          />
        </dl>
      </Card>

      <Card>
        <CardHeader
          title="Change password"
          description="Changing your password signs out every other device."
        />
        <form onSubmit={submit} className="space-y-4 px-6 pb-6">
          {error && <Alert tone="danger" title={error} onDismiss={() => setError(null)} />}
          {notice && <Alert tone="success" title={notice} onDismiss={() => setNotice(null)} />}

          <Field label="Current password" required>
            <Input
              type="password" autoComplete="current-password" required
              value={current} onChange={(e) => setCurrent(e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="New password" required
              hint="At least 12 characters, with upper, lower and a digit."
            >
              <Input
                type="password" autoComplete="new-password" required minLength={12}
                value={next} onChange={(e) => setNext(e.target.value)}
              />
            </Field>
            <Field label="Confirm new password" required>
              <Input
                type="password" autoComplete="new-password" required
                value={confirm} onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>
          </div>

          <Button type="submit" loading={busy}>Change password</Button>
        </form>
      </Card>

      <Card>
        <CardHeader title="Permissions" description="What your roles allow you to do." />
        <div className="flex flex-wrap gap-1.5 px-6 pb-6">
          {user.permissions.map((permission) => (
            <code
              key={permission}
              className="rounded-lg bg-surface-3 px-2.5 py-1 text-[11px] text-ink-muted"
            >
              {permission}
            </code>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-1 font-medium text-ink">{value}</dd>
    </div>
  );
}
