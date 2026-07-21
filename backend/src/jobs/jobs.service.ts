import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  Job,
  JobDetailResponse,
  JobStatus,
  JobSummaryResponse,
} from './models/job';
import { UrlCheckResult } from './models/url-check-result';
import { CreateJobDto } from './dto/create-job.dto';
import { UrlCheckerService } from './url-checker.service';
import { normalizeUrl } from './util/normalize-url';

const TERMINAL_JOB_STATUSES: readonly JobStatus[] = [
  'completed',
  'cancelled',
  'failed',
];

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly jobs = new Map<string, Job>();

  constructor(private readonly urlCheckerService: UrlCheckerService) {}

  createJob(dto: CreateJobDto): { jobId: string } {
    const results: UrlCheckResult[] = dto.urls.map((url) => ({
      url: normalizeUrl(url),
      status: 'pending',
      httpStatus: null,
      errorMessage: null,
      startedAt: null,
      finishedAt: null,
      durationMs: null,
    }));

    const job: Job = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      results,
      cancelledAt: null,
    };

    this.jobs.set(job.id, job);
    this.logger.log(`Created job ${job.id} with ${job.results.length} URL(s)`);

    void this.urlCheckerService.processJob(job);

    return { jobId: job.id };
  }

  listJobs(): JobSummaryResponse[] {
    return Array.from(this.jobs.values()).map((job) => this.toSummary(job));
  }

  getJob(id: string): JobDetailResponse {
    const job = this.getJobOrThrow(id);

    return {
      ...this.toSummary(job),
      // A copy, not the live internal array — the caller must never see it mutate
      // out from under it if serialization is ever deferred past this call returning
      // (e.g. an async interceptor added later), even though today's synchronous
      // Express response cycle makes that a latent risk rather than a live one.
      results: [...job.results],
    };
  }

  cancelJob(id: string): void {
    const job = this.getJobOrThrow(id);

    if (TERMINAL_JOB_STATUSES.includes(job.status)) {
      return; // no-op — already completed/cancelled/failed (FR-005, spec.md Edge Cases)
    }

    job.status = 'cancelled';
    job.cancelledAt = new Date().toISOString();
    this.logger.log(`Job ${id}: cancelled`);
  }

  private getJobOrThrow(id: string): Job {
    const job = this.jobs.get(id);
    if (!job) {
      throw new NotFoundException(`Job ${id} not found`);
    }
    return job;
  }

  private toSummary(job: Job): JobSummaryResponse {
    // Single pass instead of three separate `.filter()`s — this runs on every
    // listJobs()/getJob() call, which the frontend polls every 1.5s.
    let successCount = 0;
    let errorCount = 0;
    let cancelledCount = 0;
    for (const result of job.results) {
      if (result.status === 'success') successCount++;
      else if (result.status === 'error') errorCount++;
      else if (result.status === 'cancelled') cancelledCount++;
    }

    return {
      id: job.id,
      createdAt: job.createdAt,
      status: job.status,
      urlCount: job.results.length,
      successCount,
      errorCount,
      // Without this, a consumer can't tell "still in flight" apart from
      // "cancelled" using the counts alone — successCount + errorCount can
      // legitimately be less than urlCount in both cases (see JobList's
      // pollingInterval logic, which relies on this to know when to stop).
      cancelledCount,
    };
  }
}
