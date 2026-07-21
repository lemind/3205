import { UrlCheckerService } from './url-checker.service';
import { Job } from './models/job';

function buildJob(urlCount: number): Job {
  return {
    id: 'test-job',
    createdAt: new Date().toISOString(),
    status: 'pending',
    cancelledAt: null,
    results: Array.from({ length: urlCount }, (_, i) => ({
      url: `https://example.com/${i}`,
      status: 'pending',
      httpStatus: null,
      errorMessage: null,
      startedAt: null,
      finishedAt: null,
      durationMs: null,
    })),
  };
}

describe('UrlCheckerService', () => {
  let service: UrlCheckerService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    service = new UrlCheckerService();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    // The 0–10s artificial delay would make every test wait for real time;
    // pinning Math.random() to 0 keeps it at 0ms without touching production code.
    jest.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('never runs more than 5 concurrent HEAD checks for one job', async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    fetchMock.mockImplementation(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 10));
      inFlight--;
      return new Response(null, { status: 200 });
    });

    const job = buildJob(12);
    await service.processJob(job);

    expect(maxInFlight).toBeLessThanOrEqual(5);
    expect(fetchMock).toHaveBeenCalledTimes(12);
    expect(job.results.every((r) => r.status === 'success')).toBe(true);
  });

  it('keeps job.status pending until the first URL check actually starts', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    const job = buildJob(1);
    const processing = service.processJob(job);

    // Right after calling processJob, before any microtask has run, status
    // must still be 'pending' — this is what makes POST /api/jobs observably
    // return a job whose status is genuinely 'pending', not already 'in_progress'
    // (p-limit always dispatches asynchronously, even the very first task).
    expect(job.status).toBe('pending');

    await processing;
    expect(job.status).toBe('completed');
  });

  it('classifies 2xx/3xx as success and 4xx/5xx as error with an error message', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));

    const job = buildJob(2);
    await service.processJob(job);

    expect(job.results[0]).toMatchObject({
      status: 'success',
      httpStatus: 200,
      errorMessage: null,
    });
    expect(job.results[1].status).toBe('error');
    expect(job.results[1].httpStatus).toBe(404);
    expect(job.results[1].errorMessage).toEqual(expect.any(String));
  });

  it('classifies a network error as error with httpStatus null', async () => {
    fetchMock.mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));

    const job = buildJob(1);
    await service.processJob(job);

    expect(job.results[0].status).toBe('error');
    expect(job.results[0].httpStatus).toBeNull();
    expect(job.results[0].errorMessage).toBe('getaddrinfo ENOTFOUND');
  });

  it('marks the job failed instead of throwing when something unexpected breaks processing', async () => {
    const job = buildJob(1);
    // Simulates a genuinely unexpected failure (not a per-URL fetch error, which
    // checkUrl already handles) — e.g. a bug that leaves job.results malformed.
    (job as unknown as { results: unknown }).results = null;

    await expect(service.processJob(job)).resolves.toBeUndefined();
    expect(job.status).toBe('failed');
  });
});
