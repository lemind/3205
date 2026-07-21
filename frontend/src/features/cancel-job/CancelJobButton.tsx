import { useCancelJobMutation } from '../../entities/job/api';

export function CancelJobButton({ jobId }: { jobId: string }) {
  const [cancelJob, { isLoading }] = useCancelJobMutation();

  return (
    <button
      className="btn btn-error btn-sm neon-text font-mono tracking-wider uppercase"
      disabled={isLoading}
      onClick={() => cancelJob(jobId)}
    >
      {isLoading ? 'Cancelling…' : 'Cancel Job'}
    </button>
  );
}
