import { useListJobsQuery } from '../../entities/job/api';
import type { JobStatus } from '../../entities/job/model';
import { StatusBadge, type BadgeTone } from '../../shared/ui/StatusBadge';
import { Spinner } from '../../shared/ui/Spinner';

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
  const { data, isLoading, error } = useListJobsQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center p-6">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <p className="text-error text-sm">Failed to load jobs.</p>;
  }

  if (!data || data.length === 0) {
    return <p className="text-base-content/60 text-sm">No jobs yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-sm">
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
              className={`hover:bg-base-200 cursor-pointer ${job.id === activeJobId ? 'bg-base-200' : ''}`}
              onClick={() => onSelect(job.id)}
            >
              <td className="font-mono text-xs">{new Date(job.createdAt).toLocaleString()}</td>
              <td>
                <StatusBadge tone={TONE_BY_STATUS[job.status]}>{job.status}</StatusBadge>
              </td>
              <td className="text-xs">
                {job.urlCount} total · {job.successCount} ok · {job.errorCount} err
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
