import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useState } from 'react';
import { jobsApi } from '../../entities/job/api';
import { JobDetail } from './JobDetail';
import type { JobDetail as JobDetailResponse } from '../../entities/job/model';

function buildJobResponse(id: string, url: string): JobDetailResponse {
  return {
    id,
    createdAt: new Date().toISOString(),
    status: 'completed',
    urlCount: 1,
    successCount: 1,
    errorCount: 0,
    cancelledCount: 0,
    results: [
      {
        url,
        status: 'success',
        httpStatus: 200,
        errorMessage: null,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: 10,
      },
    ],
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeStore() {
  return configureStore({
    reducer: { [jobsApi.reducerPath]: jobsApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(jobsApi.middleware),
  });
}

// Mirrors how JobsPage actually renders JobDetail: jobId prop driven by "active job"
// state, same key={jobId} remount-on-switch pattern.
function Harness() {
  const [activeJobId, setActiveJobId] = useState('job-a');
  return (
    <>
      <button onClick={() => setActiveJobId('job-b')}>switch to B</button>
      <JobDetail key={activeJobId} jobId={activeJobId} />
    </>
  );
}

describe('JobDetail stale-switch guarantee (SC-003)', () => {
  let resolveJobA: (response: Response) => void;

  beforeEach(() => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.includes('job-a')) {
        // Held open deliberately — resolved late, after the test has switched to B.
        return new Promise<Response>((resolve) => {
          resolveJobA = resolve;
        });
      }
      if (url.includes('job-b')) {
        return Promise.resolve(jsonResponse(buildJobResponse('job-b', 'https://b.example.com')));
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('never renders the previous job after switching, even if its response arrives late', async () => {
    const store = makeStore();
    const user = userEvent.setup();

    render(
      <Provider store={store}>
        <Harness />
      </Provider>,
    );

    // Switch to job B while job A's request is still in flight (unresolved).
    await user.click(screen.getByText('switch to B'));

    await waitFor(() => {
      expect(screen.getByText('https://b.example.com')).toBeInTheDocument();
    });

    // Job A's response finally arrives, after the switch.
    resolveJobA(jsonResponse(buildJobResponse('job-a', 'https://a.example.com')));

    // Give the late response's (irrelevant) cache update a chance to propagate.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(screen.queryByText('https://a.example.com')).not.toBeInTheDocument();
    expect(screen.getByText('https://b.example.com')).toBeInTheDocument();
  });
});
