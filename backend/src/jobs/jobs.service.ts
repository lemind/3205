import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Job, JobDetailResponse } from './models/job';
import { UrlCheckResult } from './models/url-check-result';
import { CreateJobDto } from './dto/create-job.dto';
import { UrlCheckerService } from './url-checker.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly jobs = new Map<string, Job>();

  constructor(private readonly urlCheckerService: UrlCheckerService) {}

  createJob(dto: CreateJobDto): { jobId: string } {
    const results: UrlCheckResult[] = dto.urls.map((url) => ({
      url,
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

  getJob(id: string): JobDetailResponse {
    const job = this.jobs.get(id);
    if (!job) {
      throw new NotFoundException(`Job ${id} not found`);
    }

    return {
      id: job.id,
      createdAt: job.createdAt,
      status: job.status,
      urlCount: job.results.length,
      successCount: job.results.filter((r) => r.status === 'success').length,
      errorCount: job.results.filter((r) => r.status === 'error').length,
      results: job.results,
    };
  }
}
