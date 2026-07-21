import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface CreateJobRequest {
  urls: string[];
}

export interface CreateJobResponse {
  jobId: string;
}

export const jobsApi = createApi({
  reducerPath: 'jobsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    createJob: builder.mutation<CreateJobResponse, CreateJobRequest>({
      query: (body) => ({
        url: '/jobs',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useCreateJobMutation } = jobsApi;
