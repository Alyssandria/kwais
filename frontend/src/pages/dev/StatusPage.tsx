import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckCircle2, CircleAlert, Loader2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';

interface Health {
  status: string;
  service: string;
  time: string;
}

/**
 * Development-only status page (/dev/status): checks that the web app,
 * the API proxy and the database are wired up.
 */
export function StatusPage() {
  const apiHealth = useQuery({
    queryKey: ['health'],
    queryFn: async () => (await api.get<{ data: Health }>('/health')).data.data,
  });
  const db = useQuery({
    queryKey: ['health', 'db'],
    queryFn: async () => (await api.get('/health/db')).data.data,
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-4 py-12">
      <section className="relative overflow-hidden rounded-hero bg-primary-dark p-7 text-white">
        <div aria-hidden className="absolute -top-20 -right-16 size-64 rounded-full bg-[#0a7480]" />
        <div aria-hidden className="absolute top-8 right-20 size-4 rounded-full bg-accent" />
        <div className="relative">
          <p className="text-sm font-semibold text-primary-line">Development start page</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">K-WAIS is running</h1>
          <p className="mt-2 max-w-md text-[#d7eeeb]">
            Your kidney care companion. This page only checks that the pieces are connected.
          </p>
        </div>
      </section>

      <ul className="flex flex-col gap-3">
        <Check label="Web app" state="ok" detail="React + Vite + Tailwind" />
        <Check
          label="API server"
          state={apiHealth.isPending ? 'loading' : apiHealth.isError ? 'error' : 'ok'}
          detail={apiHealth.isError ? errorMessage(apiHealth.error) : apiHealth.data ? `${apiHealth.data.service} answered` : 'Checking…'}
        />
        <Check
          label="Database"
          state={db.isPending ? 'loading' : db.isError ? 'error' : 'ok'}
          detail={db.isError ? errorMessage(db.error) : db.data ? 'PostgreSQL reachable' : 'Checking…'}
        />
      </ul>

      <nav aria-label="Preview" className="flex flex-wrap gap-3">
        <Link
          to="/"
          className="inline-flex h-11 items-center rounded-card bg-accent px-5 font-extrabold text-ink no-underline"
        >
          Landing page
        </Link>
        <Link
          to="/dev/components"
          className="inline-flex h-11 items-center rounded-card border border-line bg-surface px-5 font-semibold no-underline"
        >
          Component gallery
        </Link>
      </nav>
    </main>
  );
}

function Check({ label, state, detail }: { label: string; state: 'ok' | 'error' | 'loading'; detail: string }) {
  const icon =
    state === 'ok' ? (
      <CheckCircle2 className="size-5 text-good" aria-hidden />
    ) : state === 'error' ? (
      <CircleAlert className="size-5 text-bad" aria-hidden />
    ) : (
      <Loader2 className="size-5 animate-spin text-muted" aria-hidden />
    );
  const word = state === 'ok' ? 'Working' : state === 'error' ? 'Not working' : 'Checking';

  return (
    <li className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
      {icon}
      <div className="flex-1">
        <p className="font-semibold">{label}</p>
        <p className="text-sm text-muted">{detail}</p>
      </div>
      <span className="text-sm font-semibold">{word}</span>
    </li>
  );
}
