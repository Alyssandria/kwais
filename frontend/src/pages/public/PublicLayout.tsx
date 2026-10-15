import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { cn } from '@/lib/cn';
import { useAuth, homeFor } from '@/features/auth/AuthProvider';

const sections = [
  { href: '/#features', label: 'Features' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#faq', label: 'FAQ' },
];

/** Header + footer for the landing page and the legal pages. */
export function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { status, user } = useAuth();
  const signedIn = status === 'signedIn' && user;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <a
        href="#main"
        className="sr-only z-50 rounded-field bg-accent px-4 py-2 font-bold text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link to="/" className="no-underline" aria-label="K-WAIS home">
            <Logo tone="light" showTagline={false} />
          </Link>
          <nav aria-label="Site" className="hidden items-center gap-6 md:flex">
            {sections.map((s) => (
              <a key={s.href} href={s.href} className="font-semibold text-[#334155] no-underline hover:text-primary-dark">
                {s.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-2.5 md:flex">
            {signedIn ? (
              <Link to={homeFor(user)} className={btn('accent')}>
                Go to my dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className={btn('ghost')}>
                  Sign in
                </Link>
                <Link to="/register" className={btn('accent')}>
                  Create free account
                </Link>
              </>
            )}
          </div>
          <button
            type="button"
            className="ml-auto flex size-11 cursor-pointer items-center justify-center rounded-field border border-line md:hidden"
            aria-expanded={open}
            aria-controls="mobile-site-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
        {open && (
          <div id="mobile-site-menu" className="border-t border-line px-4 pt-2 pb-4 md:hidden">
            <nav aria-label="Site" className="flex flex-col">
              {sections.map((s) => (
                <a key={s.href} href={s.href} onClick={() => setOpen(false)} className="py-3 font-semibold text-ink no-underline">
                  {s.label}
                </a>
              ))}
            </nav>
            <div className="mt-2 flex flex-col gap-2">
              {signedIn ? (
                <Link to={homeFor(user)} className={btn('accent', true)}>
                  Go to my dashboard
                </Link>
              ) : (
                <>
                  <Link to="/register" className={btn('accent', true)}>
                    Create free account
                  </Link>
                  <Link to="/login" className={btn('secondary', true)}>
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="flex flex-col gap-3">
            <Logo tone="light" />
            <p className="max-w-sm text-[13px] text-muted">
              K-WAIS is a decision-support tool for people living with chronic kidney disease. It does not diagnose,
              treat or replace advice from your doctor or dietitian.
            </p>
          </div>
          <FooterCol
            title="Product"
            links={[
              { to: '/#features', label: 'Features' },
              { to: '/#how-it-works', label: 'How it works' },
              { to: '/#faq', label: 'FAQ' },
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              { to: '/privacy', label: 'Privacy notice' },
              { to: '/terms', label: 'Terms of use' },
              { to: '/disclaimer', label: 'Medical disclaimer' },
            ]}
          />
        </div>
        <div className="border-t border-line">
          <p className="mx-auto max-w-6xl px-4 py-4 text-[12px] text-muted sm:px-6">
            © 2026 K-WAIS · Master in Information Technology capstone project.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <p className="mb-2 text-[12px] font-bold tracking-wide text-muted uppercase">{title}</p>
      <ul className="flex flex-col gap-1.5">
        {links.map((l) => (
          <li key={l.to}>
            {l.to.startsWith('/#') ? (
              <a href={l.to} className="text-[13.5px] font-semibold no-underline hover:underline">
                {l.label}
              </a>
            ) : (
              <NavLink to={l.to} className="text-[13.5px] font-semibold no-underline hover:underline">
                {l.label}
              </NavLink>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Link styled as a button (keeps <a> semantics for navigation). */
export function btn(variant: 'accent' | 'secondary' | 'ghost' | 'onDark', full = false) {
  return cn(
    'inline-flex h-11 items-center justify-center rounded-card px-5 font-bold no-underline transition-colors',
    full && 'w-full',
    variant === 'accent' && 'bg-accent text-ink hover:bg-[#fca85a]',
    variant === 'secondary' && 'border border-line bg-surface text-ink hover:bg-canvas',
    variant === 'ghost' && 'text-primary-dark hover:bg-primary-soft',
    variant === 'onDark' && 'border border-[#5fafb6] text-white hover:bg-white/10',
  );
}
