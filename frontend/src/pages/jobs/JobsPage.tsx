import { useState } from 'react';
import { CreateJobForm } from '../../features/create-job/CreateJobForm';

export function JobsPage() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-gradient-to-br from-base-200 via-base-100 to-base-200 p-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Async URL Status Checker</h1>

        <div className="card bg-base-100 border border-base-300 shadow-md">
          <div className="card-body">
            <CreateJobForm onCreated={setActiveJobId} />
          </div>
        </div>

        {activeJobId && (
          <p className="text-base-content/60 text-sm">
            Active job: <span className="font-mono">{activeJobId}</span> — progress view lands in Phase 4.
          </p>
        )}
      </div>
    </main>
  );
}
