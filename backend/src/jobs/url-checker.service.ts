import { Injectable, Logger } from '@nestjs/common';
import pLimit from 'p-limit';
import { Job } from './models/job';
import { UrlCheckResult } from './models/url-check-result';

const MAX_CONCURRENT_CHECKS_PER_JOB = 5;
const HEAD_REQUEST_TIMEOUT_MS = 5000;
const MAX_ARTIFICIAL_DELAY_MS = 10000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelayMs(): number {
  return Math.random() * MAX_ARTIFICIAL_DELAY_MS;
}

@Injectable()
export class UrlCheckerService {
  private readonly logger = new Logger(UrlCheckerService.name);

  async processJob(job: Job): Promise<void> {
    // The whole body is wrapped: checkUrl catches everything it can throw (fetch
    // errors, timeouts), so this only fires for a genuinely unexpected failure.
    // Without it, the rejection would be unhandled — processJob is invoked
    // fire-and-forget (`void`) by JobsService — which can crash the whole process,
    // not just leave one job stuck. `failed` is reserved for exactly this per ADR-0004.
    try {
      const limit = pLimit(MAX_CONCURRENT_CHECKS_PER_JOB);
      this.logger.log(`Job ${job.id}: starting ${job.results.length} check(s)`);

      await Promise.all(
        job.results.map((result) =>
          limit(() => {
            // p-limit always dispatches asynchronously (even the first task), so this
            // only flips once a URL actually starts — job.status stays 'pending' for
            // any caller inspecting it synchronously right after creation.
            if (job.status === 'pending') {
              job.status = 'in_progress';
            }
            return this.checkUrl(result);
          }),
        ),
      );

      // Cancellation doesn't exist yet (JobsService.cancelJob lands in Phase 7 / T045);
      // the cancelled-aware terminal-status check from ADR-0004 belongs there, not here.
      job.status = 'completed';
      this.logger.log(`Job ${job.id}: completed`);
    } catch (err) {
      job.status = 'failed';
      this.logger.error(
        `Job ${job.id}: failed unexpectedly`,
        err instanceof Error ? err.stack : err,
      );
    }
  }

  private async checkUrl(result: UrlCheckResult): Promise<void> {
    result.status = 'in_progress';
    result.startedAt = new Date().toISOString();

    let httpStatus: number | null = null;
    let errorMessage: string | null = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        HEAD_REQUEST_TIMEOUT_MS,
      );
      try {
        const response = await fetch(result.url, {
          method: 'HEAD',
          signal: controller.signal,
        });
        httpStatus = response.status;
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      errorMessage =
        err instanceof Error && err.name === 'AbortError'
          ? `Request timed out after ${HEAD_REQUEST_TIMEOUT_MS}ms`
          : err instanceof Error
            ? err.message
            : 'Unknown error';
    }

    await sleep(randomDelayMs());

    const success =
      httpStatus !== null && httpStatus >= 200 && httpStatus < 400;

    result.status = success ? 'success' : 'error';
    result.httpStatus = httpStatus;
    result.errorMessage = success
      ? null
      : (errorMessage ?? `HTTP ${httpStatus}`);
    result.finishedAt = new Date().toISOString();
    result.durationMs =
      new Date(result.finishedAt).getTime() -
      new Date(result.startedAt).getTime();

    this.logger.log(
      `${result.url} -> ${result.status} (${result.httpStatus ?? result.errorMessage})`,
    );
  }
}
