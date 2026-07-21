import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { UrlCheckerService } from './url-checker.service';

describe('JobsService', () => {
  let service: JobsService;
  let urlCheckerService: { processJob: jest.Mock };

  beforeEach(async () => {
    urlCheckerService = { processJob: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: UrlCheckerService, useValue: urlCheckerService },
      ],
    }).compile();

    service = module.get(JobsService);
  });

  it('assigns a unique jobId and creates the job with status pending', () => {
    const { jobId } = service.createJob({ urls: ['https://example.com'] });

    expect(jobId).toEqual(expect.any(String));
    expect(urlCheckerService.processJob).toHaveBeenCalledTimes(1);

    const [job] = urlCheckerService.processJob.mock.calls[0] as [
      { id: string; status: string },
    ];
    expect(job.id).toBe(jobId);
    expect(job.status).toBe('pending');
  });

  it('assigns different ids to different jobs', () => {
    const first = service.createJob({ urls: ['https://a.example.com'] });
    const second = service.createJob({ urls: ['https://b.example.com'] });

    expect(first.jobId).not.toBe(second.jobId);
  });

  it('returns synchronously without waiting for URL checks to finish', () => {
    urlCheckerService.processJob.mockImplementation(
      () => new Promise<void>(() => {}),
    );

    // If createJob awaited processJob, this call would hang — it doesn't,
    // because the mock's promise above deliberately never resolves.
    const result = service.createJob({ urls: ['https://example.com'] });

    expect(result.jobId).toEqual(expect.any(String));
  });

  it('getJob returns per-URL detail with derived counts for an existing job', () => {
    const { jobId } = service.createJob({
      urls: ['https://a.example.com', 'https://b.example.com'],
    });

    const detail = service.getJob(jobId);

    expect(detail.id).toBe(jobId);
    expect(detail.urlCount).toBe(2);
    expect(detail.successCount).toBe(0);
    expect(detail.errorCount).toBe(0);
    expect(detail.results).toHaveLength(2);
    expect(detail.results[0]).toMatchObject({
      url: 'https://a.example.com',
      status: 'pending',
    });
  });

  it('getJob throws NotFoundException for an unknown id', () => {
    expect(() => service.getJob('does-not-exist')).toThrow(NotFoundException);
  });

  it('prepends https:// to a bare domain, and leaves URLs with an existing scheme untouched', () => {
    const { jobId } = service.createJob({
      urls: [
        'google.com',
        'http://example.com',
        'https://example.org',
        'ftp://example.net',
      ],
    });

    const detail = service.getJob(jobId);

    expect(detail.results.map((r) => r.url)).toEqual([
      'https://google.com',
      'http://example.com',
      'https://example.org',
      'ftp://example.net',
    ]);
  });
});
