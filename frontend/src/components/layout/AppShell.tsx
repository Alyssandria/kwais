import { useState, type ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { MobileDrawer } from './MobileDrawer';
import { SideNav } from './SideNav';
import { Topbar, type ShellUser } from './Topbar';
import type { NavItem } from './nav';

export function AppShell({
  nav,
  user,
  unreadCount = 0,
  onSignOut,
  children,
}: {
  nav: NavItem[];
  user: ShellUser;
  unreadCount?: number;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas">
      <a
        href="#main"
        className="sr-only z-50 rounded-field bg-accent px-4 py-2 font-bold text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 hidden w-[248px] lg:block">
        <SideNav items={nav} />
      </aside>
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} items={nav} />

      <div className="flex min-h-screen flex-col lg:pl-[248px]">
        <Topbar
          user={user}
          unreadCount={unreadCount}
          onOpenMenu={() => setMenuOpen(true)}
          onSignOut={onSignOut}
          notificationsTo="/patient/notifications"
          profileTo="/patient/profile"
        />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1180px] flex-1 px-4 pt-6 pb-28 outline-none sm:px-6 md:pb-12 lg:px-8">
          {children}
        </main>
      </div>

      <BottomNav items={nav} addTo="/patient/meals/new" />
    </div>
  );
}
