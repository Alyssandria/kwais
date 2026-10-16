import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import type { NavItem } from './nav';
import { Logo } from './Logo';

export function SideNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 bg-primary-deep px-4 py-6">
      <div className="px-2">
        <Logo tone="dark" />
      </div>

      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 items-center gap-3 rounded-field px-3 py-2.5 no-underline transition-colors',
                isActive ? 'bg-accent font-bold text-ink' : 'text-[#cfe7e4] hover:bg-white/8 hover:text-white',
              )
            }
          >
            <Icon className="size-[18px] shrink-0" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-card bg-[#13494f] p-3.5 text-[12px] text-[#b8dad6]">
        <p className="mb-1 font-semibold text-white">Decision support only</p>
        K-WAIS estimates nutrients and explains them. It does not diagnose or replace your care team.
      </div>
    </div>
  );
}
