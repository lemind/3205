import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { JobDetail } from './model';

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

export const jobsApi = createApi({
  reducerPath: 'jobsApi',
  baseQuery: fetchBaseQuery({ baseUrl }),
  endpoints: (builder) => ({
    createJob: builder.mutation<CreateJobResponse, CreateJobRequest>({
      query: (body) => ({
        url: '/jobs',
        method: 'POST',
        body,
      }),
    }),
    getJob: builder.query<JobDetail, string>({
      query: (jobId) => `/jobs/${jobId}`,
    }),
  }),
});

export const { useCreateJobMutation, useGetJobQuery } = jobsApi;
