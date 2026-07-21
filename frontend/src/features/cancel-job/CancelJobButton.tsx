import { useCancelJobMutation } from '../../entities/job/api';
import { getApiErrorMessage } from '../../shared/lib/api-error';

export function CancelJobButton({ jobId }: { jobId: string }) {
  const [cancelJob, { isLoading, error }] = useCancelJobMutation();

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        className="btn btn-error btn-sm neon-text font-mono tracking-wider uppercase"
        disabled={isLoading}
        onClick={() => cancelJob(jobId)}
      >
        {isLoading ? 'Cancelling…' : 'Cancel Job'}
      </button>
      {error && (
        <p className="text-error font-mono text-xs">
          ! {getApiErrorMessage(error, 'Failed to cancel job.')}
        </p>
      )}
    </div>
  );
}
