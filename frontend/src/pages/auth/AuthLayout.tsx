import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';

/** Two-panel layout for sign-in and sign-up: teal story panel on wide screens, form card everywhere. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="relative hidden w-[42%] max-w-xl overflow-hidden bg-primary-dark p-10 text-white lg:flex lg:flex-col">
        <div aria-hidden className="pointer-events-none absolute -top-32 -right-24 size-96 rounded-full bg-[#0a7480]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-20 size-64 rounded-full bg-[#0c6b75]" />
        <div aria-hidden className="pointer-events-none absolute top-40 right-24 size-4 rounded-full bg-accent" />
        <Link to="/" className="relative no-underline" aria-label="K-WAIS home">
          <Logo tone="dark" />
        </Link>
        <div className="relative mt-auto flex flex-col gap-5">
          <p className="text-3xl leading-tight font-extrabold">Small daily notes, clearer kidney conversations.</p>
          <ul className="flex flex-col gap-2.5 text-[#d7eeeb]">
            {[
              'Log meals in English, Tagalog or Taglish',
              'Sodium, potassium, phosphorus and protein, estimated',
              'Scores use only what you and your care team provide',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main id="main" className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="mb-8 lg:hidden">
          <Link to="/" className="no-underline" aria-label="K-WAIS home">
            <Logo tone="light" />
          </Link>
        </div>
        <div className="w-full max-w-md rounded-panel border border-line bg-surface p-6 shadow-card sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 max-w-md text-center text-[12px] text-muted">
          K-WAIS is decision support, not medical advice. <Link to="/disclaimer">Read the disclaimer</Link>.
        </p>
      </main>
    </div>
  );
}
