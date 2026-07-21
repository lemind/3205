import { useState, type FormEvent } from 'react';
import { useCreateJobMutation } from '../../entities/job/api';

export function CreateJobForm({ onCreated }: { onCreated: (jobId: string) => void }) {
  const [text, setText] = useState('');
  const [createJob, { isLoading, error }] = useCreateJobMutation();

  const urls = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (urls.length === 0) return;

    try {
      const result = await createJob({ urls }).unwrap();
      onCreated(result.jobId);
      setText('');
    } catch {
      // surfaced below via the mutation's `error` state
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <textarea
        className="textarea textarea-bordered w-full"
        rows={6}
        placeholder={'https://example.com\nhttps://example.org'}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <button type="submit" className="btn btn-primary" disabled={urls.length === 0 || isLoading}>
        {isLoading ? 'Running…' : 'Run Check'}
      </button>
      {error && <p className="text-error text-sm">Failed to create job.</p>}
    </form>
  );
}
