import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { JobDetail, JobSummary } from './model';

export interface CreateJobRequest {
  urls: string[];
}

export interface CreateJobResponse {
  jobId: string;
}

// Resolved to an absolute URL (same origin the app is served from — matches the
// same-origin `/api` design from ADR-0001) rather than left relative: Node's
// fetch/Request (undici) has no browser "page origin" to resolve a relative URL
// against, unlike a real browser, which matters for both SSR-style and test
// environments that run under Node rather than an actual browser.
const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api';

const JOB_LIST_TAG = { type: 'Job' as const, id: 'LIST' };

export const jobsApi = createApi({
  reducerPath: 'jobsApi',
  baseQuery: fetchBaseQuery({ baseUrl }),
  tagTypes: ['Job'],
  endpoints: (builder) => ({
    createJob: builder.mutation<CreateJobResponse, CreateJobRequest>({
      query: (body) => ({
        url: '/jobs',
        method: 'POST',
        body,
      }),
      invalidatesTags: [JOB_LIST_TAG],
    }),
    listJobs: builder.query<JobSummary[], void>({
      query: () => '/jobs',
      providesTags: [JOB_LIST_TAG],
    }),
    getJob: builder.query<JobDetail, string>({
      query: (jobId) => `/jobs/${jobId}`,
      providesTags: (_result, _error, jobId) => [{ type: 'Job' as const, id: jobId }],
    }),
    cancelJob: builder.mutation<void, string>({
      query: (jobId) => ({
        url: `/jobs/${jobId}`,
        method: 'DELETE',
      }),
      // Invalidates both the specific job (so JobDetail reflects 'cancelled'
      // immediately, not on the next 1.5s poll) and the list (status shown there too).
      invalidatesTags: (_result, _error, jobId) => [{ type: 'Job' as const, id: jobId }, JOB_LIST_TAG],
    }),
  }),
});

export const { useCreateJobMutation, useListJobsQuery, useGetJobQuery, useCancelJobMutation } = jobsApi;
