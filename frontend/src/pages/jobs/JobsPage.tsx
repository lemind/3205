import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { CreateJobForm } from '../../features/create-job/CreateJobForm';
import { JobDetail } from '../../widgets/job-detail/JobDetail';
import { JobList } from '../../widgets/job-list/JobList';
import { selectActiveJobId, setActiveJob } from './model';

export function JobsPage() {
  const activeJobId = useAppSelector(selectActiveJobId);
  const dispatch = useAppDispatch();

  return (
    <main className="bg-base-100 min-h-screen bg-[radial-gradient(circle_at_top,color-mix(in_oklch,var(--color-primary)_8%,transparent),transparent_60%)] p-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <h1
          data-text="ASYNC URL STATUS CHECKER"
          className="glitch-title neon-text text-2xl font-bold tracking-widest uppercase"
        >
          Async URL Status Checker
        </h1>

        <div className="card bg-base-200 border-primary/40 neon-border shadow-md">
          <div className="card-body">
            <CreateJobForm onCreated={(jobId) => dispatch(setActiveJob(jobId))} />
          </div>
        </div>

        <div className="card bg-base-200 border-secondary/40 neon-border neon-border-secondary shadow-md">
          <div className="card-body">
            <h2 className="card-title text-secondary neon-text font-mono text-base">// jobs</h2>
            <JobList activeJobId={activeJobId} onSelect={(jobId) => dispatch(setActiveJob(jobId))} />
          </div>
        </div>

        {activeJobId && <JobDetail key={activeJobId} jobId={activeJobId} />}
      </div>
    </main>
  );
}
