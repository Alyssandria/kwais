import { Link } from 'react-router-dom';
import { Bell, LogOut, Menu } from 'lucide-react';
import { IconButton } from '@/components/ui';
import { Logo } from './Logo';

export interface ShellUser {
  firstName: string;
  lastName: string;
}

export function Topbar({
  user,
  unreadCount,
  onOpenMenu,
  onSignOut,
  notificationsTo,
  profileTo,
}: {
  user: ShellUser;
  unreadCount: number;
  onOpenMenu: () => void;
  onSignOut: () => void;
  notificationsTo: string | null;
  profileTo: string;
}) {
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
  const bellLabel = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications';

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <IconButton label="Open menu" icon={<Menu className="size-5" />} onClick={onOpenMenu} className="lg:hidden" />
      <div className="lg:hidden">
        <Logo tone="light" showTagline={false} />
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        {notificationsTo && (
          <Link
            to={notificationsTo}
            aria-label={bellLabel}
            title={bellLabel}
            className="relative flex size-11 items-center justify-center rounded-field border border-line bg-surface text-[#334155] no-underline hover:bg-canvas"
          >
            <Bell className="size-[18px]" aria-hidden />
            {unreadCount > 0 && (
              <span
                aria-hidden
                className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-bad px-1 text-[10px] font-bold text-white"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        )}
        <Link
          to={profileTo}
          className="flex h-11 items-center gap-2.5 rounded-full border border-line bg-surface py-1 pr-3 pl-1 text-ink no-underline hover:bg-canvas"
        >
          <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-primary-soft font-bold text-primary-dark">
            {initials}
          </span>
          <span className="hidden font-semibold sm:inline">
            {user.firstName} {user.lastName}
          </span>
          <span className="sr-only sm:hidden">Your profile</span>
        </Link>
        <IconButton label="Sign out" icon={<LogOut className="size-[18px]" />} variant="ghost" onClick={onSignOut} />
      </div>
    </header>
  );
}
