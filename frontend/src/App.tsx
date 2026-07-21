import { useEffect, useState } from 'react';

type HealthState = 'checking' | 'ok' | 'unreachable';

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

  return (
    <main>
      <h1>Async URL Status Checker</h1>
      <p>Backend: {health}</p>
    </main>
  );
}

export default App;
