import { useCancelJobMutation } from '../../entities/job/api';
import { getApiErrorMessage } from '../../shared/lib/api-error';
import { useTranslation } from '../../shared/i18n/context';

export function CancelJobButton({ jobId }: { jobId: string }) {
  const [cancelJob, { isLoading, error }] = useCancelJobMutation();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        className="btn btn-error btn-sm neon-text font-mono tracking-wider uppercase"
        disabled={isLoading}
        onClick={() => cancelJob(jobId)}
      >
        {isLoading ? t('cancelling') : t('cancelJob')}
      </button>
      {error && (
        <p className="text-error font-mono text-xs">
          ! {getApiErrorMessage(error, t('cancelJobError'))}
        </p>
      )}
    </div>
  );
}
