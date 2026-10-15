import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface Crumb {
  label: string;
  to?: string;
}

/** Last crumb is the current page and is not a link. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-[13.5px]">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
              {c.to && !last ? (
                <Link to={c.to} className="font-semibold no-underline hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className="text-[#475569]">
                  {c.label}
                </span>
              )}
              {!last && <ChevronRight className="size-3.5 text-[#94a3b8]" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
