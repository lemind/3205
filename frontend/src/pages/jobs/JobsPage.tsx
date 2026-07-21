import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { CreateJobForm } from '../../features/create-job/CreateJobForm';
import { JobDetail } from '../../widgets/job-detail/JobDetail';
import { selectActiveJobId, setActiveJob } from './model';

export function JobsPage() {
  const activeJobId = useAppSelector(selectActiveJobId);
  const dispatch = useAppDispatch();

  return (
    <main className="min-h-screen bg-gradient-to-br from-base-200 via-base-100 to-base-200 p-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Async URL Status Checker</h1>

        <div className="card bg-base-100 border border-base-300 shadow-md">
          <div className="card-body">
            <CreateJobForm onCreated={(jobId) => dispatch(setActiveJob(jobId))} />
          </div>
        </div>

        {activeJobId && <JobDetail key={activeJobId} jobId={activeJobId} />}
      </div>
    </main>
  );
}
