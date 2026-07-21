import { jobsApi, useListJobsQuery } from '../../entities/job/api';
import type { JobStatus } from '../../entities/job/model';
import { StatusBadge, type BadgeTone } from '../../shared/ui/StatusBadge';
import { Spinner } from '../../shared/ui/Spinner';

const ACTIVE_POLL_INTERVAL_MS = 1500;

const TONE_BY_STATUS: Record<JobStatus, BadgeTone> = {
  pending: 'neutral',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'warning',
  failed: 'error',
};

export function JobList({
  activeJobId,
  onSelect,
}: {
  activeJobId: string | null;
  onSelect: (jobId: string) => void;
}) {
  // Without this, a job that finishes in the background (the common case — no
  // create/cancel action to trigger a tag invalidation) would leave this list
  // showing stale 'in_progress' indefinitely. Same useQueryState-peek pattern as
  // JobDetail. Deliberately keyed on the counts, not job.status: a cancelled
  // job's status flips immediately, well before its in-flight/queued URLs
  // actually settle — checking job.status alone would stop polling with stale
  // success/error counts still short of urlCount.
  const cached = jobsApi.endpoints.listJobs.useQueryState();
  const allTerminal = cached.data
    ? cached.data.every(
        (job) => job.successCount + job.errorCount + job.cancelledCount === job.urlCount,
      )
    : false;

  const { data, isLoading, error } = useListJobsQuery(undefined, {
    pollingInterval: allTerminal ? 0 : ACTIVE_POLL_INTERVAL_MS,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-6">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <p className="text-error font-mono text-sm">! Failed to load jobs.</p>;
  }

  if (!data || data.length === 0) {
    return <p className="text-base-content/60 font-mono text-sm">// no jobs yet</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-sm font-mono">
        <thead>
          <tr>
            <th>Created</th>
            <th>Status</th>
            <th>URLs</th>
          </tr>
        </thead>
        <tbody>
          {data.map((job) => (
            <tr
              key={job.id}
              role="button"
              tabIndex={0}
              className={`hover:bg-secondary/10 cursor-pointer ${
                job.id === activeJobId ? 'bg-secondary/15 border-secondary border-l-2' : ''
              }`}
              onClick={() => onSelect(job.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(job.id);
                }
              }}
            >
              <td className="font-mono text-xs">{new Date(job.createdAt).toLocaleString()}</td>
              <td>
                <StatusBadge tone={TONE_BY_STATUS[job.status]}>{job.status}</StatusBadge>
              </td>
              <td className="text-xs">
                {job.urlCount} total · {job.successCount} ok · {job.errorCount} err
                {job.cancelledCount > 0 && ` · ${job.cancelledCount} cancelled`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
