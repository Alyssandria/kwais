import { Link, NavLink, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { NavItem } from './nav';

export function BottomNav({ items, addTo }: { items: NavItem[]; addTo: string | null }) {
  const tabs = items.filter((i) => i.mobile).slice(0, 4);
  const { pathname } = useLocation();
  const onAddScreen = pathname === addTo;
  return (
    <>
      {addTo && !onAddScreen && (
        <Link
          to={addTo}
          aria-label="Add a meal"
          className="fixed right-4 bottom-[88px] z-30 flex size-[60px] items-center justify-center rounded-full bg-accent text-ink no-underline shadow-pop md:hidden"
        >
          <Plus className="size-6" strokeWidth={2.4} aria-hidden />
        </Link>
      )}
      <nav
        aria-label="Quick"
        className="fixed inset-x-0 bottom-0 z-30 grid h-[72px] border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map(({ to, label, short, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 text-[11px] no-underline',
                isActive ? 'font-bold text-primary-dark' : 'text-[#475569]',
              )
            }
          >
            <Icon className="size-5" aria-hidden />
            {short ?? label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
