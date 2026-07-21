import { useEffect, useState } from 'react';

type HealthState = 'checking' | 'ok' | 'unreachable';

const STATUS: Record<HealthState, { label: string; badge: string; dot: string }> = {
  checking: { label: 'checking…', badge: 'badge-neutral', dot: 'bg-base-content/40 animate-pulse' },
  ok: { label: 'ok', badge: 'badge-success', dot: 'bg-success animate-pulse' },
  unreachable: { label: 'unreachable', badge: 'badge-error', dot: 'bg-error' },
};

function LinkLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-9 w-9"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function App() {
  const [health, setHealth] = useState<HealthState>('checking');

  useEffect(() => {
    let cancelled = false;

    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { status: string }) => {
        if (!cancelled) setHealth(data.status === 'ok' ? 'ok' : 'unreachable');
      })
      .catch(() => {
        if (!cancelled) setHealth('unreachable');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const status = STATUS[health];

  return (
    <main className="bg-gradient-to-br from-base-200 via-base-100 to-base-200 flex min-h-screen items-center justify-center p-6">
      <div className="card bg-base-100 w-full max-w-sm border border-base-300 shadow-xl">
        <div className="card-body items-center gap-3 text-center">
          <div className="bg-primary/10 text-primary flex h-16 w-16 items-center justify-center rounded-2xl">
            <LinkLogo />
          </div>

          <h1 className="text-xl font-semibold tracking-tight">Async URL Status Checker</h1>
          <p className="text-base-content/60 -mt-2 text-sm">Async URL health checks, tracked live</p>

          <div className="divider my-1" />

          <div className="flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${status.dot}`} />
            <span className="text-base-content/70 text-sm">Backend</span>
            <span className={`badge badge-sm ${status.badge}`}>{status.label}</span>
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;
