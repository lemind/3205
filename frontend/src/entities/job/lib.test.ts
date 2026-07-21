import { describe, it, expect } from 'vitest';
import { isJobSettled } from './lib';
import type { JobSummary } from './model';

function summary(overrides: Partial<JobSummary>): JobSummary {
  return {
    id: 'job-1',
    createdAt: new Date().toISOString(),
    status: 'pending',
    urlCount: 3,
    successCount: 0,
    errorCount: 0,
    cancelledCount: 0,
    ...overrides,
  };
}

describe('isJobSettled', () => {
  it('is not settled while pending or in_progress', () => {
    expect(isJobSettled(summary({ status: 'pending' }))).toBe(false);
    expect(isJobSettled(summary({ status: 'in_progress' }))).toBe(false);
  });

  it('is settled once completed', () => {
    expect(
      isJobSettled(summary({ status: 'completed', successCount: 3 })),
    ).toBe(true);
  });

  // The regression this guards: url-checker.service's outer catch can set
  // job.status = 'failed' while some results are still pending/in_progress
  // (nothing further will ever process them — the background loop already
  // exited) — this must count as settled even though the counts don't sum to
  // urlCount, unlike the 'cancelled' case below.
  it('is settled once failed, even with results still short of urlCount', () => {
    expect(
      isJobSettled(summary({ status: 'failed', successCount: 1, errorCount: 0 })),
    ).toBe(true);
  });

  it('is not settled when cancelled but in-flight/queued checks have not converged yet', () => {
    expect(
      isJobSettled(
        summary({ status: 'cancelled', successCount: 1, cancelledCount: 0 }),
      ),
    ).toBe(false);
  });

  it('is settled when cancelled and every result has converged', () => {
    expect(
      isJobSettled(
        summary({ status: 'cancelled', successCount: 1, cancelledCount: 2 }),
      ),
    ).toBe(true);
  });
});
