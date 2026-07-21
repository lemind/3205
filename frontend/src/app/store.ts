import { configureStore } from '@reduxjs/toolkit';
import { jobsApi } from '../entities/job/api';
import { jobsPageReducer } from '../pages/jobs/model';

export const store = configureStore({
  reducer: {
    [jobsApi.reducerPath]: jobsApi.reducer,
    jobsPage: jobsPageReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(jobsApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
