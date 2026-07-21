import { jobsApi, useGetJobQuery } from '../../entities/job/api';
import type { JobStatus, UrlCheckStatus } from '../../entities/job/model';
import { StatusBadge, type BadgeTone } from '../../shared/ui/StatusBadge';
import { Spinner } from '../../shared/ui/Spinner';
import { CancelJobButton } from '../../features/cancel-job/CancelJobButton';

const ACTIVE_POLL_INTERVAL_MS = 1500;

const TERMINAL_JOB_STATUSES: readonly JobStatus[] = ['completed', 'cancelled', 'failed'];
const TERMINAL_URL_STATUSES: readonly UrlCheckStatus[] = ['success', 'error', 'cancelled'];

const TONE_BY_STATUS: Record<JobStatus | UrlCheckStatus, BadgeTone> = {
  pending: 'neutral',
  in_progress: 'info',
  completed: 'success',
  success: 'success',
  error: 'error',
  cancelled: 'warning',
  failed: 'error',
};

export function JobDetail({ jobId }: { jobId: string }) {
  // useQueryState is a pure cache selector (no subscription of its own), so it's
  // safe to read during render — lets this render's pollingInterval react to the
  // *previous* poll's result without an effect or a ref (both disallowed by
  // eslint-plugin-react-hooks for exactly this "value from own hook" pattern).
  const cached = jobsApi.endpoints.getJob.useQueryState(jobId);
  // Deliberately keyed on per-URL results, not job.status: cancelling sets
  // job.status = 'cancelled' immediately, well before the in-flight checks it
  // let finish (and the still-queued ones waiting for a slot to free) actually
  // converge — polling on job.status alone would freeze the UI on stale
  // in_progress/pending rows for as long as those checks take to resolve.
  const isTerminal = cached.data
    ? cached.data.results.every((r) => TERMINAL_URL_STATUSES.includes(r.status))
    : false;

  const { data, isLoading, error } = useGetJobQuery(jobId, {
    pollingInterval: isTerminal ? 0 : ACTIVE_POLL_INTERVAL_MS,
  });

  if (isLoading && !data) {
    return (
      <div className="flex justify-center p-6">
        <Spinner />
      </div>
    );
  }

  // Only treat this as a hard failure if we have no data at all — a transient poll
  // error shouldn't wipe an already-rendered job (RTK Query keeps the last good
  // `data` around even when a later poll fails).
  if (error && !data) {
    return <p className="text-error text-sm">Failed to load job.</p>;
  }

  if (!data) {
    return null;
  }

  const processed = data.results.filter((r) => TERMINAL_URL_STATUSES.includes(r.status)).length;

  return (
    <div className="card bg-base-200 border-accent/40 neon-border neon-border-accent shadow-md">
      <div className="card-body gap-4">
        <div className="flex items-center justify-between">
          <h2 className="card-title text-accent neon-text font-mono text-base">{data.id}</h2>
          <StatusBadge tone={TONE_BY_STATUS[data.status]}>{data.status}</StatusBadge>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-base-content/70 font-mono text-sm">
            &gt; {processed} of {data.results.length} processed
          </p>
          {!TERMINAL_JOB_STATUSES.includes(data.status) && <CancelJobButton jobId={jobId} />}
        </div>

        <div className="overflow-x-auto">
          <table className="table table-sm font-mono">
            <thead>
              <tr>
                <th>URL</th>
                <th>Status</th>
                <th>HTTP</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((result, index) => (
                <tr key={`${result.url}-${index}`}>
                  <td className="max-w-xs truncate">{result.url}</td>
                  <td>
                    <StatusBadge tone={TONE_BY_STATUS[result.status]}>{result.status}</StatusBadge>
                  </td>
                  <td>{result.httpStatus ?? '—'}</td>
                  <td className="max-w-xs truncate">{result.errorMessage ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
