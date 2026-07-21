import { jobsApi, useListJobsQuery } from '../../entities/job/api';
import { isJobSettled } from '../../entities/job/lib';
import type { JobStatus } from '../../entities/job/model';
import { StatusBadge, type BadgeTone } from '../../shared/ui/StatusBadge';
import { Spinner } from '../../shared/ui/Spinner';
import { useTranslation } from '../../shared/i18n/context';

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
  // JobDetail, and the same isJobSettled predicate — see its doc comment for why
  // this isn't just a job.status check.
  const cached = jobsApi.endpoints.listJobs.useQueryState();
  const allTerminal = cached.data ? cached.data.every(isJobSettled) : false;
  const { t, statusLabel, countsText } = useTranslation();

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
    return <p className="text-error font-mono text-sm">! {t('loadJobsError')}</p>;
  }

  if (!data || data.length === 0) {
    return <p className="text-base-content/60 font-mono text-sm">{t('noJobsYet')}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-sm font-mono whitespace-nowrap">
        <thead>
          <tr>
            <th>{t('colCreated')}</th>
            <th>{t('colStatus')}</th>
            <th>{t('colUrls')}</th>
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
                <StatusBadge tone={TONE_BY_STATUS[job.status]}>{statusLabel(job.status)}</StatusBadge>
              </td>
              <td className="text-xs">
                {countsText(job.urlCount, job.successCount, job.errorCount, job.cancelledCount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
