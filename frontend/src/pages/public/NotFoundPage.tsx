import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm font-semibold text-primary-dark">404</p>
      <h1 className="text-2xl font-extrabold">We can’t find that page</h1>
      <p className="text-muted">The link may be old, or the page may have moved.</p>
      <Link
        to="/"
        className="mt-2 inline-flex h-11 items-center rounded-card bg-primary px-5 font-semibold text-white no-underline hover:bg-primary-dark"
      >
        Go to home
      </Link>
    </main>
  );
}
