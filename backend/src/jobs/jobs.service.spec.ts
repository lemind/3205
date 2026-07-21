import { Test, TestingModule } from '@nestjs/testing';
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
});
