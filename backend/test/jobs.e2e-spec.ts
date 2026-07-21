import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/all-exceptions.filter';
import type { JobDetailResponse } from '../src/jobs/models/job';

const TERMINAL_STATUSES = ['completed', 'cancelled', 'failed'];

describe('Jobs (e2e)', () => {
  let app: INestApplication<App>;
  let testServer: http.Server;
  let testServerUrl: string;
  let pendingResponses: http.ServerResponse[];

  // A local HTTP server standing in for "the internet" — deterministic and
  // network-free. `/hold*` requests are parked instead of answered, so tests
  // can dispatch several checks, confirm they're in flight, then release them
  // on demand — the same technique the unit tests use, but over a real socket.
  beforeAll(async () => {
    testServer = http.createServer((req, res) => {
      if (req.url?.startsWith('/hold')) {
        pendingResponses.push(res);
        return;
      }
      if (req.url === '/missing') {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200).end();
    });
    await new Promise<void>((resolve) => testServer.listen(0, resolve));
    const { port } = testServer.address() as AddressInfo;
    testServerUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => testServer.close(() => resolve()));
  });

  beforeEach(async () => {
    pendingResponses = [];

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe());
    // Matches main.ts's real bootstrap — otherwise these tests verify a
    // config that isn't the one actually serving production requests.
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    // Mocked only after the module is fully compiled and routes are registered —
    // Nest's own module-token generation also uses Math.random() internally, so
    // pinning it beforehand silently breaks route registration (found the hard way).
    jest.spyOn(Math, 'random').mockReturnValue(0); // skip the 0-10s artificial delay
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await app.close();
  });

  function releaseAllHeld(): void {
    while (pendingResponses.length > 0) {
      pendingResponses.pop()!.writeHead(200).end();
    }
  }

  async function getJob(jobId: string): Promise<JobDetailResponse> {
    const res = await request(app.getHttpServer()).get(`/api/jobs/${jobId}`);
    return res.body as JobDetailResponse;
  }

  async function pollUntil(
    jobId: string,
    predicate: (job: JobDetailResponse) => boolean,
    timeoutMs = 5000,
  ): Promise<JobDetailResponse> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const job = await getJob(jobId);
      if (predicate(job)) return job;
      if (Date.now() > deadline) {
        throw new Error(`Timed out waiting for job ${jobId}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  it('creates a job, processes URLs, and completes with per-URL results', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/jobs')
      .send({ urls: [`${testServerUrl}/ok`, `${testServerUrl}/missing`] })
      .expect(201);
    const { jobId } = createRes.body as { jobId: string };
    expect(jobId).toBeTruthy();

    const job = await pollUntil(jobId, (j) =>
      TERMINAL_STATUSES.includes(j.status),
    );

    expect(job.status).toBe('completed');
    expect(job.urlCount).toBe(2);
    expect(job.successCount).toBe(1);
    expect(job.errorCount).toBe(1);
    expect(
      job.results.find((r) => r.url.endsWith('/missing'))?.httpStatus,
    ).toBe(404);
  });

  it('rejects a malformed URL at creation, never creating a job', async () => {
    await request(app.getHttpServer())
      .post('/api/jobs')
      .send({ urls: ['not a url'] })
      .expect(400);

    const list = await request(app.getHttpServer())
      .get('/api/jobs')
      .expect(200);
    expect(list.body).toEqual([]);
  });

  it('cancels a running job: in-flight checks finish, unstarted ones become cancelled', async () => {
    const urls = Array.from(
      { length: 7 },
      (_, i) => `${testServerUrl}/hold?${i}`,
    );
    const createRes = await request(app.getHttpServer())
      .post('/api/jobs')
      .send({ urls })
      .expect(201);
    const { jobId } = createRes.body as { jobId: string };

    // Concurrency cap is 5 — wait for exactly 5 to be in flight (held by the
    // test server) before cancelling, so 2 are provably still unstarted.
    await pollUntil(
      jobId,
      (j) => j.results.filter((r) => r.status === 'in_progress').length === 5,
    );

    await request(app.getHttpServer()).delete(`/api/jobs/${jobId}`).expect(204);
    releaseAllHeld();

    const job = await pollUntil(jobId, (j) =>
      TERMINAL_STATUSES.includes(j.status),
    );

    expect(job.status).toBe('cancelled');
    expect(job.results.filter((r) => r.status === 'success')).toHaveLength(5);
    expect(job.results.filter((r) => r.status === 'cancelled')).toHaveLength(2);
  });

  it('cancelling an already-terminal job is a no-op (idempotent)', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/jobs')
      .send({ urls: [`${testServerUrl}/ok`] })
      .expect(201);
    const { jobId } = createRes.body as { jobId: string };

    await pollUntil(jobId, (j) => TERMINAL_STATUSES.includes(j.status));

    await request(app.getHttpServer()).delete(`/api/jobs/${jobId}`).expect(204);
    const job = await getJob(jobId);
    expect(job.status).toBe('completed'); // not overwritten to 'cancelled'
  });

  it('returns 404 for an unknown job id, on both GET and DELETE', async () => {
    await request(app.getHttpServer())
      .get('/api/jobs/does-not-exist')
      .expect(404);
    await request(app.getHttpServer())
      .delete('/api/jobs/does-not-exist')
      .expect(404);
  });
});
