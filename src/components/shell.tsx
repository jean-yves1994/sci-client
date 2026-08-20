'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { Avatar, Badge, Dropdown, IconButton, MenuItem, SearchInput, Tip, cx } from './ui';
import {
  IconBell, IconBuilding, IconChart, IconCheckCircle, IconChevronLeft, IconClipboard,
  IconFile, IconGrid, IconHome, IconLayers, IconLogout, IconMonitor, IconMoon,
  IconShield, IconSun, IconUser, IconUsers,
} from './icons';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme';
import { avatarTone, initials } from '@/lib/format';

// ---------------------------------------------------------------------------
// Navigation model
// ---------------------------------------------------------------------------

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}

interface NavGroup {
  label: string | null;
  items: NavItem[];
}

/**
 * Grouped so the sidebar reads as three intents — overview, daily work,
 * administration — rather than one undifferentiated list of eleven links.
 */
const NAV: NavGroup[] = [
  { label: null, items: [{ href: '/dashboard', label: 'Dashboard', icon: IconGrid }] },
  {
    label: 'Operations',
    items: [
      { href: '/inspections', label: 'Inspections', icon: IconClipboard, permission: 'inspections.read' },
      { href: '/reviews', label: 'Review queue', icon: IconCheckCircle, permission: 'reviews.read' },
      { href: '/properties', label: 'Properties', icon: IconHome, permission: 'properties.read' },
      { href: '/reports', label: 'Reports', icon: IconFile, permission: 'reports.read' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/analytics', label: 'Analytics', icon: IconChart, permission: 'analytics.read' },
      { href: '/users', label: 'Users', icon: IconUsers, permission: 'users.read' },
      { href: '/branches', label: 'Branches', icon: IconBuilding, permission: 'branches.read' },
      { href: '/templates', label: 'Templates', icon: IconLayers, permission: 'templates.read' },
      { href: '/audit', label: 'Audit trail', icon: IconShield, permission: 'audit.read' },
    ],
  },
];

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/inspections': 'Inspections',
  '/reviews': 'Review queue',
  '/properties': 'Properties',
  '/reports': 'Reports',
  '/analytics': 'Analytics',
  '/users': 'Users',
  '/branches': 'Branches',
  '/templates': 'Templates',
  '/audit': 'Audit trail',
  '/notifications': 'Notifications',
  '/profile': 'Profile',
};

const COLLAPSE_KEY = 'sci-sidebar-collapsed';

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, can } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [unread, setUnread] = React.useState(0);

  React.useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  // Restored from storage after mount rather than during render, so the server
  // and client markup agree on the first pass.
  React.useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
  }, []);

  const toggleCollapsed = React.useCallback(() => {
    setCollapsed((value) => {
      localStorage.setItem(COLLAPSE_KEY, value ? '0' : '1');
      return !value;
    });
  }, []);

  // The route change closes the drawer; leaving it open over the new page is a
  // classic mobile annoyance.
  React.useEffect(() => { setMobileOpen(false); }, [pathname]);

  React.useEffect(() => {
    if (!user) return;
    const controller = new AbortController();

    const load = () =>
      api.get<{ count: number }>('/notifications/unread-count', controller.signal)
        .then((r) => setUnread(r.count))
        .catch(() => undefined);

    void load();
    // Polled rather than pushed: a websocket for one badge count is more
    // infrastructure than the value justifies at this scale.
    const timer = setInterval(load, 60_000);

    return () => { controller.abort(); clearInterval(timer); };
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brand-500" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }
  if (!user) return null;

  const groups = NAV
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || can(item.permission)),
    }))
    .filter((group) => group.items.length > 0);

  const title = TITLES[pathname] ?? (pathname.startsWith('/inspections/') ? 'Inspection' : 'SCI');

  return (
    <div className="min-h-screen bg-canvas">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fade-in lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <Sidebar
        groups={groups}
        pathname={pathname}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapsed={toggleCollapsed}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div
        className={cx(
          'flex min-h-screen flex-col transition-[padding] duration-300 ease-swift',
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-[248px]',
        )}
      >
        <Topbar
          title={title}
          unread={unread}
          onOpenMobile={() => setMobileOpen(true)}
          onLogout={() => void logout()}
        />

        {user.mustChangePassword && (
          <div className="mx-4 mb-1 rounded-xl bg-warning-bg px-4 py-2.5 text-sm text-warning-fg lg:mx-6">
            Your password was set by an administrator.{' '}
            <Link href="/profile?changePassword=1" className="font-semibold underline underline-offset-2">
              Choose your own password
            </Link>
            .
          </div>
        )}

        <main id="main" className="flex-1 px-4 pb-10 pt-2 lg:px-6">{children}</main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function Sidebar({
  groups, pathname, collapsed, mobileOpen, onToggleCollapsed, onCloseMobile,
}: {
  groups: NavGroup[];
  pathname: string;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
}) {
  const { user, logout } = useAuth();

  return (
    <aside
      aria-label="Main navigation"
      className={cx(
        'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-line bg-surface',
        'transition-[width,transform] duration-300 ease-swift',
        collapsed ? 'lg:w-[72px]' : 'lg:w-[248px]',
        'w-[248px]',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}
    >
      <div className={cx('flex h-16 shrink-0 items-center gap-2.5', collapsed ? 'lg:justify-center lg:px-0 px-4' : 'px-4')}>
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onCloseMobile}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-xs font-bold text-white">
            SCI
          </span>
          <span className={cx('min-w-0 transition-opacity duration-200', collapsed && 'lg:hidden')}>
            <span className="block truncate text-sm font-semibold text-ink">Collateral</span>
            <span className="block truncate text-2xs text-ink-muted">Inspection platform</span>
          </span>
        </Link>
      </div>

      <nav className="scroll-slim flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {groups.map((group, index) => (
          <div key={group.label ?? index}>
            {group.label && (
              <p
                className={cx(
                  'px-3 pb-1.5 text-2xs font-semibold uppercase tracking-wider text-ink-faint transition-opacity',
                  collapsed && 'lg:sr-only',
                )}
              >
                {group.label}
              </p>
            )}
            {/* A hairline stands in for the group heading when collapsed, so the
                grouping survives without the label. */}
            {group.label && collapsed && <div className="mx-3 mb-2 hidden h-px bg-line lg:block" />}

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                const link = (
                  <Link
                    href={item.href}
                    onClick={onCloseMobile}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'group relative flex items-center gap-3 rounded-xl py-2.5 text-sm transition-colors duration-150',
                      collapsed ? 'lg:justify-center lg:px-0 px-3' : 'px-3',
                      active
                        ? 'bg-brand-50 font-medium text-brand-700'
                        : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
                    )}
                  >
                    {/* Active marker is a bar, not colour alone, so the current
                        page is identifiable without relying on hue. */}
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-600" aria-hidden />
                    )}
                    <Icon className={cx('h-[18px] w-[18px] shrink-0', active ? 'text-brand-600' : 'text-ink-faint group-hover:text-ink-muted')} />
                    <span className={cx('truncate', collapsed && 'lg:hidden')}>{item.label}</span>
                  </Link>
                );

                return (
                  <li key={item.href}>
                    {collapsed ? (
                      <span className="hidden lg:block"><Tip label={item.label}>{link}</Tip></span>
                    ) : null}
                    <span className={collapsed ? 'lg:hidden' : undefined}>{link}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-line p-3">
        <Link
          href="/profile"
          onClick={onCloseMobile}
          className={cx(
            'flex items-center gap-2.5 rounded-xl p-2 transition-colors hover:bg-surface-2',
            collapsed && 'lg:justify-center',
          )}
        >
          {user && <Avatar name={initials(user)} tone={avatarTone(user.email)} />}
          <span className={cx('min-w-0 flex-1', collapsed && 'lg:hidden')}>
            <span className="block truncate text-sm font-medium text-ink">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="block truncate text-2xs text-ink-muted">
              {user?.roles.map((r) => r.charAt(0) + r.slice(1).toLowerCase()).join(', ')}
            </span>
          </span>
        </Link>

        <div className={cx('mt-1 flex items-center gap-1', collapsed ? 'lg:flex-col' : '')}>
          <button
            type="button"
            onClick={() => void logout()}
            className={cx(
              'flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink',
              collapsed ? 'lg:w-auto flex-1' : 'flex-1',
            )}
          >
            <IconLogout className="h-[18px] w-[18px] shrink-0" />
            <span className={cx(collapsed && 'lg:hidden')}>Sign out</span>
          </button>

          <IconButton
            label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={onToggleCollapsed}
            className="hidden lg:inline-flex"
          >
            <IconChevronLeft className={cx('h-4 w-4 transition-transform duration-300', collapsed && 'rotate-180')} />
          </IconButton>
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Topbar
// ---------------------------------------------------------------------------

function Topbar({
  title, unread, onOpenMobile, onLogout,
}: {
  title: string; unread: number; onOpenMobile: () => void; onLogout: () => void;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [query, setQuery] = React.useState('');

  // Search routes into the inspections list, which already performs a
  // server-side search across number, loan reference, property and owner —
  // rather than adding a second, weaker search path.
  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    if (term) router.push(`/inspections?search=${encodeURIComponent(term)}`);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-md lg:px-6">
      <button
        type="button"
        onClick={onOpenMobile}
        aria-label="Open navigation"
        className="flex h-9 w-9 flex-col items-center justify-center gap-[3px] rounded-xl text-ink-muted transition-colors hover:bg-surface-2 lg:hidden"
      >
        <span className="block h-[1.5px] w-4 rounded bg-current" />
        <span className="block h-[1.5px] w-4 rounded bg-current" />
        <span className="block h-[1.5px] w-4 rounded bg-current" />
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="flex items-center gap-1.5 text-sm">
          <li className="hidden text-ink-faint sm:block">SCI</li>
          <li className="hidden text-ink-faint sm:block" aria-hidden>/</li>
          <li className="truncate font-medium text-ink" aria-current="page">{title}</li>
        </ol>
      </nav>

      <form onSubmit={submitSearch} className="ml-auto hidden w-full max-w-xs md:block" role="search">
        <SearchInput
          placeholder="Search inspections…"
          aria-label="Search inspections"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery('')}
        />
      </form>

      <div className="ml-auto flex items-center gap-1 md:ml-0">
        <ThemeToggle />

        <Link href="/notifications" className="relative">
          <IconButton label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}>
            <IconBell />
          </IconButton>
          {unread > 0 && (
            <span className="pointer-events-none absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-solid px-1 text-[9px] font-bold text-white ring-2 ring-canvas">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>

        <UserMenu onLogout={onLogout} />
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Theme toggle
// ---------------------------------------------------------------------------

export function ThemeToggle() {
  const { theme, resolved, setTheme, toggle } = useTheme();

  return (
    <Dropdown
      width="w-44"
      trigger={({ toggle: openMenu }) => (
        <IconButton
          label={`Theme: ${theme}. Click to switch, hold to choose.`}
          onClick={toggle}
          onContextMenu={(event) => { event.preventDefault(); openMenu(); }}
        >
          {/* Both icons are rendered and cross-faded, so the switch reads as a
              transition rather than a swap. */}
          <span className="relative flex h-[18px] w-[18px] items-center justify-center">
            <IconSun className={cx('absolute h-[18px] w-[18px] transition-all duration-300', resolved === 'dark' ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100')} />
            <IconMoon className={cx('absolute h-[18px] w-[18px] transition-all duration-300', resolved === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0')} />
          </span>
        </IconButton>
      )}
    >
      {({ close }) => (
        <>
          <MenuItem icon={<IconSun className="h-4 w-4" />} active={theme === 'light'}
            onClick={() => { setTheme('light'); close(); }}>Light</MenuItem>
          <MenuItem icon={<IconMoon className="h-4 w-4" />} active={theme === 'dark'}
            onClick={() => { setTheme('dark'); close(); }}>Dark</MenuItem>
          <MenuItem icon={<IconMonitor className="h-4 w-4" />} active={theme === 'system'}
            onClick={() => { setTheme('system'); close(); }}>System</MenuItem>
        </>
      )}
    </Dropdown>
  );
}

// ---------------------------------------------------------------------------
// User menu
// ---------------------------------------------------------------------------

function UserMenu({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth();
  const router = useRouter();
  if (!user) return null;

  return (
    <Dropdown
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-label="Account menu"
          aria-haspopup="menu"
          className="ml-1 flex items-center gap-2 rounded-xl p-1 transition-colors hover:bg-surface-2"
        >
          <Avatar name={initials(user)} tone={avatarTone(user.email)} />
        </button>
      )}
    >
      {({ close }) => (
        <>
          <div className="border-b border-line px-2.5 pb-2.5 pt-1.5">
            <p className="truncate text-sm font-medium text-ink">{user.firstName} {user.lastName}</p>
            <p className="truncate text-2xs text-ink-muted">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {user.roles.map((role) => (
                <Badge key={role} tone="brand">{role.charAt(0) + role.slice(1).toLowerCase()}</Badge>
              ))}
            </div>
          </div>
          <div className="pt-1">
            <MenuItem icon={<IconUser className="h-4 w-4" />}
              onClick={() => { router.push('/profile'); close(); }}>Your profile</MenuItem>
            <MenuItem icon={<IconBell className="h-4 w-4" />}
              onClick={() => { router.push('/notifications'); close(); }}>Notifications</MenuItem>
            <MenuItem icon={<IconLogout className="h-4 w-4" />} danger
              onClick={() => { close(); onLogout(); }}>Sign out</MenuItem>
          </div>
        </>
      )}
    </Dropdown>
  );
}
